import {
  AdminCompleteUploadParams,
  AdminCompleteUploadResponse,
  AdminCreateUploadBody,
  AdminCreateUploadResponse,
} from "@workspace/api-zod";
import { db, mediaAssetsTable } from "@workspace/db";
import { and, eq, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { basename } from "node:path";
import { Router, type IRouter } from "express";
import { getCourseAssetMetadata, signCourseAssetUpload } from "../lib/courseStorage";
import { sendError } from "../lib/errors";

const router: IRouter = Router();
const maxFileSize = 1024 * 1024 * 1024;
const uploadTtlSeconds = 15 * 60;

const acceptedMimeTypes: Record<string, ReadonlySet<string>> = {
  image: new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]),
  video: new Set(["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"]),
  audio: new Set(["audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav", "audio/webm", "audio/ogg"]),
  pdf: new Set(["application/pdf"]),
  file: new Set([
    "application/octet-stream",
    "application/rtf",
    "application/zip",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
  ]),
};

function safeFilename(input: string) {
  const normalized = basename(input.replace(/\\/g, "/")).normalize("NFKC");
  return normalized
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/^\.+/, "")
    .replace(/-+/g, "-")
    .slice(0, 160)
    .trim();
}

function mediaDto(asset: typeof mediaAssetsTable.$inferSelect) {
  return {
    id: asset.id,
    kind: asset.kind,
    filename: asset.filename,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes,
    processing: asset.processing,
    url: null,
    altText: asset.altText,
    tags: asset.tags,
    createdAt: asset.createdAt.toISOString(),
  };
}

router.post("/media/uploads", async (req, res) => {
  const body = AdminCreateUploadBody.safeParse(req.body);
  if (!body.success) return void sendError(res, 400, "validation_error", "Invalid upload details.", body.error.flatten());

  const filename = safeFilename(body.data.filename);
  const mimeType = body.data.mimeType.trim().toLowerCase().split(";")[0];
  if (!filename || filename.length > 160) {
    return void sendError(res, 400, "invalid_filename", "Choose a valid file name.");
  }
  if (body.data.sizeBytes > maxFileSize) {
    return void sendError(res, 413, "file_too_large", "The maximum upload size is 1 GB.");
  }
  if (!acceptedMimeTypes[body.data.kind]?.has(mimeType)) {
    return void sendError(res, 415, "unsupported_media_type", "The selected file type is not supported for this media category.");
  }

  const assetId = randomUUID();
  const storageKey = `/objects/course-assets/${assetId}/${filename}`;
  try {
    const target = await signCourseAssetUpload(storageKey, uploadTtlSeconds);
    await db.insert(mediaAssetsTable).values({
      id: assetId,
      kind: body.data.kind,
      filename,
      mimeType,
      sizeBytes: body.data.sizeBytes,
      storageKey,
      processing: "uploading",
      uploadedBy: req.auth!.user.id,
    });
    return res.status(201).json(
      AdminCreateUploadResponse.parse({
        assetId,
        uploadUrl: target.uploadUrl,
        method: "PUT",
        expiresAt: target.expiresAt.toISOString(),
      }),
    );
  } catch (error) {
    req.log.error({ err: error, assetId }, "Failed to prepare course media upload");
    return void sendError(res, 503, "storage_unavailable", "Private file storage is temporarily unavailable.");
  }
});

router.post("/media/:id/complete", async (req, res) => {
  const params = AdminCompleteUploadParams.safeParse(req.params);
  if (!params.success) return void sendError(res, 400, "invalid_request", "Invalid media identifier.");
  const actorId = req.auth!.user.id;
  const [asset] = await db
    .select()
    .from(mediaAssetsTable)
    .where(
      and(
        eq(mediaAssetsTable.id, params.data.id),
        eq(mediaAssetsTable.uploadedBy, actorId),
        isNull(mediaAssetsTable.deletedAt),
      ),
    )
    .limit(1);
  if (!asset) return void sendError(res, 404, "not_found", "Uploaded media was not found.");
  if (asset.processing === "ready") {
    return res.json(AdminCompleteUploadResponse.parse(mediaDto(asset)));
  }
  if (asset.processing !== "uploading" || !asset.storageKey) {
    return void sendError(res, 409, "upload_not_completable", "This upload is not waiting for completion.");
  }

  try {
    const metadata = await getCourseAssetMetadata(asset.storageKey);
    if (!metadata) return void sendError(res, 409, "upload_missing", "The file has not finished uploading.");
    if (metadata.sizeBytes !== asset.sizeBytes || metadata.mimeType?.toLowerCase() !== asset.mimeType?.toLowerCase()) {
      await db.update(mediaAssetsTable).set({ processing: "errored", updatedAt: new Date() })
        .where(eq(mediaAssetsTable.id, asset.id));
      return void sendError(res, 409, "upload_mismatch", "The uploaded file did not match the requested file details.");
    }
    const [readyAsset] = await db.update(mediaAssetsTable)
      .set({ processing: "ready", updatedAt: new Date() })
      .where(and(eq(mediaAssetsTable.id, asset.id), eq(mediaAssetsTable.processing, "uploading")))
      .returning();
    if (!readyAsset) return void sendError(res, 409, "upload_state_changed", "The upload state changed. Refresh and try again.");
    return res.json(AdminCompleteUploadResponse.parse(mediaDto(readyAsset)));
  } catch (error) {
    req.log.error({ err: error, assetId: asset.id }, "Failed to verify course media upload");
    return void sendError(res, 503, "storage_unavailable", "Private file storage is temporarily unavailable.");
  }
});

export default router;
