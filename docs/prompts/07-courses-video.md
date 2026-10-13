# 07 — Courses and video

```text
PHASE 07 — COURSES AND VIDEO
Context: read docs/PLATFORM_PLAN.md (sections 5.5, 6, 9) and follow the master rules.
Prerequisite: Phase 06 passed.

GOAL
Deliver lectures and videos with reliable playback, progress tracking and certificates.

TASKS
1. API and UI for Course -> Module -> Lesson: catalogue (/courses, /courses/:slug public),
   learner area (/app/courses, /app/courses/:course/:lesson). Lesson types: video,
   article (Markdown/rich text), PDF/slides, audio, downloadable resource, embedded quiz
   (links to a custom question set).
2. Video via Mux: direct upload endpoint (signed upload URL), webhook handler for asset
   ready/errored (idempotent), signed playback tokens with expiry, captions upload
   (WebVTT). Store media_assets with processing status.
3. Custom player: HLS adaptive streaming, speed control, captions toggle, chapters,
   resume position (save every 10 s and on pause), picture-in-picture, keyboard shortcuts
   (space, arrows, f, m, c), learner-email watermark overlay, no download.
4. Progress: lesson/module/course percentages, "continue where you left off", completion
   rules (e.g. 90% watched), badges.
5. Notes and bookmarks: timestamped notes per lesson, click to seek.
6. Certificates: PDF generated on course completion with a verifiable ID and public
   verification page.
7. Live sessions: entries with date, link and later a recording attachment; "add to calendar".
8. Free-preview lessons visible without login; others gated by entitlement.
9. Linking: show related lessons on question review (question_lessons) and related
   questions on lessons.
10. Tests: unit tests for progress rules; integration tests for webhook idempotency; Playwright
    for watch -> resume -> complete -> certificate (use a small test video).

ACCEPTANCE CHECKS
- Upload a test video, see processing status, play it, leave, return and resume at the same point.
- Playback URLs expire and cannot be reused after expiry.
- Completing a course issues a certificate that verifies publicly.
- Player is keyboard operable with captions; typecheck and tests pass.

REPORT using the format in the master prompt, then stop.
```
