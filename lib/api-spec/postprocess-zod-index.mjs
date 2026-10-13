import { readFile, writeFile } from "node:fs/promises";

const indexPath = new URL("../api-zod/src/index.ts", import.meta.url);
const source = await readFile(indexPath, "utf8");
const generatedTypesBarrel = /^export \* from ['"]\.\/generated\/types['"];?\s*$/m;

if (!source.includes("export * as generatedTypes from")) {
  throw new Error("The generated API Zod index is missing its generatedTypes namespace export.");
}

const next = source.replace(generatedTypesBarrel, "");
if (next !== source) await writeFile(indexPath, next);
