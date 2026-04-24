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

### 3. Rate captions

- [ ] **3a.** Signed-in home → click "Rate Captions" → `/captions` loads with your email in header
- [ ] **3b.** If DB has **zero** public captions with non-null `content` → "No captions found." shown (not a crash). To test: temporarily flip a row's `is_public` to false.
- [ ] **3c.** First visit: cursor starts on the first caption **you haven't voted on yet** (not index 0 if you've already voted some)
- [ ] **3d.** After voting a few, reload: previously voted captions show the correct button highlighted (accent) and status text ("You marked this as funny/not funny")
- [ ] **3e.** Click 👍 Funny → accent highlight on Funny button → "Saved!" → auto-advance to the next **unvoted** caption
- [ ] **3f.** Click 👎 Not funny on a fresh caption → accent highlight on Not funny → "Saved!" → auto-advance
- [ ] **3g.** Click **Skip →** on an unvoted caption → advances index, no DB write (check Network tab: no `voteCaption` server action call)
- [ ] **3h.** **Change vote:** reload, navigate (via Skip) to a caption you previously upvoted, click 👎 → UI flips to downvote accent instantly (optimistic), server action succeeds (upsert on `(profile_id, caption_id)`), reload → still downvote
- [ ] **3i.** Reach the last caption and vote → stays on last caption (`Math.min(prev + 1, captions.length - 1)`), no crash
- [ ] **3j.** Caption whose `image_id` has no row in `images` (or `images.url` is null) → image area shows "No image" fallback
- [ ] **3k.** Force vote server action failure (block the Next.js server-action POST, or temporarily break RLS) → UI rolls back to previous vote state, red/error message appears, button re-enabled
- [ ] **3l.** Progress bar: after voting N of M → shows `{index+1} / {total}` on left, `{votedCount} voted · {pct}%` on right, bar width matches pct
- [ ] **3m.** Top-nav "Upload" and "Home" buttons navigate correctly
- [ ] **3n.** Double-click 👍 rapidly → only one request fires (buttons disabled while `loading !== null`)

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

## Summary template — fill in after the 3 runs

After testing, write 5-8 bullets covering:

- What you tested (summarize the tree coverage)
- Bugs found per flow (auth / upload / rate)
- Fixes applied (reference file:line)
- Any known issues deferred (e.g. requires backend change)
- Demo-readiness statement
