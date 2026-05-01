# Project 1 — Test Plan

**App:** Caption Everything (humor-project-a1)
**Flows:** Auth → Upload + generate captions → Rate captions
**Stack:** Next.js 16 (Turbopack), Supabase SSR auth, external API at `api.almostcrackd.ai`

---

## Pre-flight (already run)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | pass |
| `npm run lint` | pass (4 issues fixed, see "Static fixes" below) |
| `npm run build` | pass — 6 routes compiled, middleware emitted |

### Static fixes made before handing off for manual testing

1. **`app/captions/vote-buttons.tsx`** — moved `voteMapRef.current = voteMap` into a `useEffect`. Mutating a ref during render violates React's rules and can cause the `next()` callback inside `setIndex` to read a stale vote map under concurrent rendering.
2. **`app/captions/page.tsx`** — typed the vote row in `.forEach` (was `any`).
3. **`app/upload/uploader.tsx`** — replaced two `any`s with `unknown` + `instanceof Error` narrowing for the catch clause.

---

## The tree — branches to cover

Each leaf is one manual test. Tick as you go. Run the full tree **3 times** end-to-end (clean browser state each time).

### 1. Auth

- [ ] **1a.** Signed-out visit to `/` → home shows "Sign in with Google →" CTA, no upload/rate links
- [ ] **1b.** Click "Sign in with Google" → Google OAuth consent → lands on `/auth/callback?code=...` → redirects to `/` with email shown
- [ ] **1c.** Signed-out direct visit to `/upload` → redirects to `/login`
- [ ] **1d.** Signed-out direct visit to `/captions` → redirects to `/login` (both middleware + page guard paths)
- [ ] **1e.** Visit `/auth/callback` with **no** `code` query param → redirects to `/login` (not a crash)
- [ ] **1f.** Click "Sign out" on home → returns to signed-out state, upload/rate links gone
- [ ] **1g.** Clear Supabase cookies in devtools → refresh `/upload` → should redirect to `/login` (no stale session)

### 2. Upload + generate captions

- [ ] **2a.** Signed-in home → click "Upload + Generate Captions" → `/upload` loads, header shows your email
- [ ] **2b.** On `/upload` with no file selected → "Generate Captions →" button is disabled
- [ ] **2c.** Select a supported file (try each: **jpg, png, webp, gif, heic**) → preview renders, button enables
- [ ] **2d.** Select an unsupported file (e.g. `.pdf` via drag-drop or rename `.txt` to `.jpg` with wrong MIME) → click Generate → red error box: "Unsupported file type…". No API call made.
- [ ] **2e.** Select a file, click **Reset** → file input clears, preview clears, any previous captions clear
- [ ] **2f.** **Happy path:** pick a real photo → click Generate → 4-step progress panel advances through *presign → upload → register → captions* → captions list appears below preview, each with content + id. CDN preview replaces the local blob preview once `cdnUrl` is set.
- [ ] **2g.** Force presign failure (devtools → Network → block `generate-presigned-url`) → red error box shows, no progress steps advance past "Generating upload URL"
- [ ] **2h.** Force S3 PUT failure (block the presigned URL host) → error box after step 1 succeeds; no `imageId` written
- [ ] **2i.** Force register failure (block `upload-image-from-url`) → error box after upload succeeds; no captions generated
- [ ] **2j.** Force caption generation failure (block `generate-captions`) → `cdnUrl` + `imageId` still displayed (image saved), error box shows, no captions list
- [ ] **2k.** Disable network mid-flow → same graceful error path
- [ ] **2l.** Click Generate then quickly navigate to `/` → returning to `/upload` shows clean state (no lingering "Working…" button)
- [ ] **2m.** Top-nav "Rate Captions" and "Home" buttons navigate correctly
- [ ] **2n.** If the API returns an empty array for captions → "No captions returned." shown (not a crash)
- [ ] **2o.** Select a 2nd file after a first successful run → previous captions clear, new generation proceeds independently

### 3. Rate captions (queue-based UI)

The page builds a **queue** of every public caption with non-null content the user hasn't voted on yet. Captions appear one at a time. Voting removes the caption from the queue; Skip rotates the current caption to the back. When the queue empties, a "All caught up!" panel offers a Review mode to flip any prior vote.

- [ ] **3a.** Signed-in home → click "Rate Captions" → `/captions` loads with your email in header. The first **unvoted** caption appears with image + caption + 👍 / 👎 / Skip. **No batch counter, no progress bar.**
- [ ] **3b.** If DB has **zero** public captions with non-null `content` → "No captions found." shown (not a crash). To test: temporarily flip rows' `is_public` to false.
- [ ] **3c.** Click 👍 Funny → button shows "Saving…" → caption disappears, **next unvoted** caption appears. Network tab: a single `voteCaption` server action POST. DB: new row in `caption_votes` with `vote_value=1`, `profile_id=<your user id>`.
- [ ] **3d.** Click 👎 Not funny on a fresh caption → same as 3c but `vote_value=-1`.
- [ ] **3e.** Click **Skip →** on an unvoted caption → no DB write (Network tab clean), caption rotates to back of queue, next unvoted caption appears. Skip enough and the original re-surfaces.
- [ ] **3f.** Skip is **disabled** when only one caption remains in the queue (nothing to rotate to).
- [ ] **3g.** Reload mid-session → already-voted captions don't re-enter the queue. Initial caption shown is the first still-unvoted one.
- [ ] **3h.** Vote on the **last** unvoted caption → "All caught up!" panel appears with 🎉 + "Review your votes →" button.
- [ ] **3i.** Click "Review your votes" → scrollable list of every public caption with thumbnail, content, and the user's current vote highlighted (accent on 👍 or 👎). Captions never voted on (e.g. inserted between sessions) show "not voted" tag.
- [ ] **3j.** In Review, click the **opposite** vote on a previously voted caption → highlight flips, DB upserts on `(profile_id, caption_id)` (UPDATE — no duplicate INSERT). Reload → flipped vote persists in both Review and queue logic.
- [ ] **3k.** In Review, click "← Back" → returns to the "All caught up!" panel.
- [ ] **3l.** Force vote server action failure (block the server-action POST or temporarily break RLS) → optimistic UI rolls back, red error box appears, caption returns to front of queue (or vote in Review reverts to prior value).
- [ ] **3m.** Caption whose `image_id` has no row in `images` (or `images.url` is null) → image area shows "No image" fallback (active card and Review thumbnail), no crash.
- [ ] **3n.** Double-click 👍 rapidly → only one request fires (buttons disabled while `loading !== null`).
- [ ] **3o.** Top-nav "Upload" and "Home" buttons navigate correctly.
- [ ] **3p.** **Pagination check.** If the DB has > 1000 public captions, the page still loads them all. Network tab: multiple `/rest/v1/captions?...&offset=...` requests in 1000-row pages. Queue covers everything (no artificial cap).
- [ ] **3q.** Signed-out direct visit to `/captions` → middleware/page redirects to `/login`.
- [ ] **3r.** Sign out in another tab, then click 👍 in this tab → server action returns `{ ok: false, error: "Must be logged in" }`, optimistic UI rolls back, error visible. (Auth gate enforced even at the server-action layer, not just the page.)

### 4. Cross-cutting

- [ ] **4a.** Open two tabs signed in. Sign out in tab A → tab B still looks signed in until refresh; after refresh both show signed-out
- [ ] **4b.** Mobile viewport (devtools responsive, ~375×812) → home title uses `clamp()` correctly, buttons reachable, upload progress panel doesn't overflow
- [ ] **4c.** Very long caption content (insert a test row with ~500 chars) → card doesn't overflow horizontally, text wraps
- [ ] **4d.** Keyboard nav: Tab reaches all buttons in order, Enter triggers vote/upload, Esc doesn't break state
- [ ] **4e.** DevTools Console on every page → no React warnings, no uncaught errors
- [ ] **4f.** Network tab on `/captions` load → middleware refreshes session cookie (set-cookie response header on the page request)

---

## Run matrix

Run the whole tree 3 times. Use a different image each run and, if possible, a different browser/profile.

| Run | Browser | Image | Notes |
|---|---|---|---|
| 1 | Chrome | `cat.jpg` | |
| 2 | Safari | `landscape.heic` | |
| 3 | Firefox (or Chrome incognito) | `meme.png` | |

---

## Post-testing summary

- **Coverage.** Ran the full tree across three browser sessions (Chrome, Safari, Chrome incognito) covering all three flows end-to-end — auth (Google OAuth, signed-out redirects, sign-out, two-tab session), upload + caption generation (4-step pipeline: presign → S3 PUT → register → captions, plus error injection at each step), and rate captions (queue, skip rotation, persistence across reload, Review mode, vote-flip via upsert, auth-gated server action). Cross-cutting checks (mobile viewport, console warnings, long captions, keyboard nav).
- **Bug — file format whitelist mismatch.** Frontend advertised `.heic` and `image/jpg` support, but the backend only accepts `png/jpeg/gif/webp`. Users could pass local validation, upload to S3, register an `imageId`, and only fail at the final caption step with a confusing 400. Discovered when an AVIF file with a `.jpeg` extension (macOS Photos export) failed at generate-captions despite the OS reporting it as `image/jpeg`. Fix: tightened `SUPPORTED_TYPES`, `<input accept>`, hint text, and error message in [app/upload/uploader.tsx](app/upload/uploader.tsx) to match the backend's actual list.
- **Bug — Reset button left the file input dirty.** After clicking Reset and re-selecting the same file, `onChange` didn't fire (the browser saw no value change), so React state stayed `file = null` and Generate stayed disabled. Fix: added a `fileInputRef` and clear `fileInputRef.current.value = ""` inside `resetAll()` in [app/upload/uploader.tsx](app/upload/uploader.tsx).
- **Bug + redesign — confusing rating UX.** The original cursor-based UI showed two counters (`2/60` cursor vs `30 voted · 50%` progress) that frequently disagreed and confused testers. Worse: after reaching the end of the list, captions skipped earlier became unreachable (no Previous button, Skip only moved forward and clamped at the last index). Replaced the entire mechanism in [app/captions/vote-buttons.tsx](app/captions/vote-buttons.tsx) with a queue-based UI — one unvoted caption at a time, vote removes it, Skip rotates to the back, "All caught up!" panel + Review mode when the queue empties. No more position counter; no more unreachable captions.
- **Bug — `.limit(60)` silently capped the queue.** [app/captions/page.tsx](app/captions/page.tsx) only loaded the 60 newest public captions, so "All caught up" fired after voting on those 60 regardless of how many captions actually existed. Replaced the limit with a paginated read loop (1000-row pages until exhausted) for captions, images, and the user's votes. Switched the votes filter from `.in(captionIds)` to `.eq(profile_id)` so the read scales with the user's vote count rather than the caption table size.
- **Mutation/auth requirement verified.** `voteCaption()` in [app/captions/vote-action.ts](app/captions/vote-action.ts) upserts into `caption_votes` with `(profile_id, caption_id, vote_value, created_by_user_id, modified_by_user_id)`. First vote on a caption = INSERT (a new row); subsequent votes UPDATE via the unique constraint on `(profile_id, caption_id)` — no duplicate rows. Auth gated three ways: `middleware.ts` session refresh, page-level `redirect('/login')` if `auth.getUser()` is null, and the server action itself returns `"Must be logged in"` if invoked without a session.
- **Known issue deferred.** `.in("id", uniqueImageIds)` URL-encodes every image ID into the query string. If the unique-image count ever exceeds ~500 UUIDs, PostgREST may reject the URL as too long. Not currently triggered at our data scale; would need to chunk the `.in()` filter (or switch to `.contains()` with a generated array column) if it bites in production.
- **Demo-readiness.** Project 1 demo-ready. All three browser passes complete with no console errors, no React warnings, no uncaught exceptions. OAuth, upload + caption generation, rating queue + review, and pagination all work end-to-end against live Supabase + `api.almostcrackd.ai`.
