# Project 1 — Test Plan

**App:** Caption Everything (humor-project-a1)
**Flows:** Auth → Upload + generate captions → Rate captions
**Stack:** Next.js 16, Supabase SSR auth, external API at `api.almostcrackd.ai`

## Pre-flight

| Check | Result |
|---|---|
| `npx tsc --noEmit` | pass |
| `npm run lint` | pass |
| `npm run build` | pass |

## Smoke plan

Clean browser profile, `npm run dev`, open http://localhost:3000. Run 3× across different browsers / images.

### Auth
1. Signed-out home → "Sign in with Google →", no upload/rate links.
2. Visit `/upload` while signed out → redirects to `/login`.
3. Click "Sign in with Google" → consent → lands on `/` with email shown.

### Upload + generate
4. `/upload` with no file → "Generate Captions →" disabled.
5. Pick a `.png` or `.jpeg` → Generate → progress advances *presign → upload → register → captions* → captions list renders, CDN preview replaces blob preview.
6. Click **Reset** → file, preview, and captions clear. Re-pick the same file → Generate enables again.

### Rate
7. `/captions` loads → first unvoted caption appears (no batch counter, no progress bar).
8. Click 👍 → caption disappears, next unvoted caption appears. New row in `caption_votes` (`vote_value=1`, `profile_id=<you>`).
9. Reload → already-voted captions don't reappear; queue resumes from next unvoted. After voting on the last one → "All caught up!" + Review mode flips a vote via upsert (no duplicate rows).

### Sign out
10. Click Sign out on home → upload/rate links disappear.

**Pass criteria:** all 10 green, no console errors, no React warnings.

## Post-testing summary

- Tested all three flows (auth, upload + caption generation, rate) end-to-end across 3 browser passes; no console errors or React warnings on final pass.
- **Bug:** an AVIF file saved with a `.jpeg` extension passed local validation but failed at the API. Root cause — frontend whitelist included `.heic` / `image/jpg` while backend only accepts `png/jpeg/gif/webp`. Fix: tightened `SUPPORTED_TYPES`, `accept`, hint, and error in [app/upload/uploader.tsx](app/upload/uploader.tsx).
- **Bug:** Reset didn't clear the native `<input type="file">`, so re-picking the same file kept Generate disabled (`onChange` didn't fire). Fix: cleared the input via `fileInputRef.current.value = ""` in [app/upload/uploader.tsx](app/upload/uploader.tsx).
- **Bug + redesign:** the cursor-based rating UI showed two conflicting counters and stranded unvoted captions once you reached the end. Replaced with a queue UI (one unvoted caption at a time, Skip rotates to back, "All caught up!" + Review mode at the end) in [app/captions/vote-buttons.tsx](app/captions/vote-buttons.tsx).
- **Bug:** `.limit(60)` capped the queue, so "All caught up" fired after 60 votes regardless of total captions. Fix: paginated reads (1000-row pages) for captions, images, and votes in [app/captions/page.tsx](app/captions/page.tsx).
- **Mutation/auth verified:** votes upsert into `caption_votes` (first vote = INSERT, subsequent = UPDATE on `(profile_id, caption_id)`); auth gated at middleware, page redirect, and server action.
- **Deferred:** `.in("id", uniqueImageIds)` URL-encodes IDs; could exceed PostgREST URL limits if unique images > ~500. Will chunk if it bites.
- **Demo-ready.**
