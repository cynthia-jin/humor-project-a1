"use client";

import { useMemo, useState } from "react";

const API_BASE = "https://api.almostcrackd.ai";

const SUPPORTED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
]);

type CaptionRecord = {
  id?: string;
  content?: string | null;
  [key: string]: any;
};

export default function Uploader({ accessToken }: { accessToken: string }) {
  const [file, setFile] = useState<File | null>(null);

  // instant local preview (no upload)
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string>("");

  // remote preview after upload (cdn)
  const [cdnUrl, setCdnUrl] = useState<string>("");

  const [imageId, setImageId] = useState<string>("");
  const [captions, setCaptions] = useState<CaptionRecord[] | null>(null);

  const [busy, setBusy] = useState<
    null | "presign" | "upload" | "register" | "captions"
  >(null);
  const [error, setError] = useState<string>("");

  const canGenerate = useMemo(() => !!file && busy === null, [file, busy]);

  function resetOutputs() {
    setError("");
    setCdnUrl("");
    setImageId("");
    setCaptions(null);
  }

  function resetAll() {
    resetOutputs();
    setFile(null);
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    setLocalPreviewUrl("");
  }

  async function generateAll() {
    if (!file) return;

    resetOutputs();

    if (!SUPPORTED_TYPES.has(file.type)) {
      setError(
        `Unsupported file type: ${file.type || "(unknown)"}.
Supported: jpeg/jpg/png/webp/gif/heic`
      );
      return;
    }

    try {
      // Step 1: presign
      setBusy("presign");
      const presignRes = await fetch(
        `${API_BASE}/pipeline/generate-presigned-url`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ contentType: file.type }),
        }
      );

      if (!presignRes.ok) {
        const txt = await presignRes.text();
        throw new Error(`Presign failed (${presignRes.status}): ${txt}`);
      }

      const presignJson = await presignRes.json();
      const presignedUrl = presignJson.presignedUrl as string;
      const cdn = presignJson.cdnUrl as string;

      if (!presignedUrl || !cdn) {
        throw new Error("Presign response missing presignedUrl/cdnUrl");
      }

      // Step 2: upload bytes to presignedUrl
      setBusy("upload");
      const uploadRes = await fetch(presignedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadRes.ok) {
        const txt = await uploadRes.text();
        throw new Error(`Upload failed (${uploadRes.status}): ${txt}`);
      }

      // Step 3: register image url
      setBusy("register");
      const registerRes = await fetch(
        `${API_BASE}/pipeline/upload-image-from-url`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageUrl: cdn,
            isCommonUse: false,
          }),
        }
      );

      if (!registerRes.ok) {
        const txt = await registerRes.text();
        throw new Error(`Register failed (${registerRes.status}): ${txt}`);
      }

      const registerJson = await registerRes.json();
      const imgId = registerJson.imageId as string;
      if (!imgId) throw new Error("Register response missing imageId");

      setCdnUrl(cdn);
      setImageId(imgId);

      // Step 4: generate captions
      setBusy("captions");
      const captionRes = await fetch(`${API_BASE}/pipeline/generate-captions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageId: imgId }),
      });

      if (!captionRes.ok) {
        const txt = await captionRes.text();
        throw new Error(`Generate captions failed (${captionRes.status}): ${txt}`);
      }

      const captionJson = await captionRes.json();
      const list: CaptionRecord[] = Array.isArray(captionJson) ? captionJson : [];
      setCaptions(list);

      setBusy(null);
    } catch (e: any) {
      setBusy(null);
      setError(e?.message ?? "Something went wrong");
    }
  }

  const statusText =
    busy === "presign"
      ? "Step 1/4: Generating upload URL…"
      : busy === "upload"
      ? "Step 2/4: Uploading image…"
      : busy === "register"
      ? "Step 3/4: Registering image…"
      : busy === "captions"
      ? "Step 4/4: Generating captions…"
      : "";

  // Prefer local preview (instant). After upload, you can optionally show cdnUrl too.
  const previewSrc = localPreviewUrl || cdnUrl;

  return (
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: 16,
        padding: 16,
        background: "#fff",
        maxWidth: 820,
      }}
    >
      <div style={{ display: "grid", gap: 12 }}>
        {/* File picker */}
        <div>
          <label style={{ fontWeight: 700, display: "block", marginBottom: 6 }}>
            Choose an image file
          </label>

          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              resetOutputs();

              // update local preview immediately
              if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
              setLocalPreviewUrl(f ? URL.createObjectURL(f) : "");
            }}
          />

          <div className="muted" style={{ marginTop: 6 }}>
            Supported: jpeg/jpg/png/webp/gif/heic
          </div>
        </div>

        {/* Buttons */}
        <div className="row" style={{ gap: 10 }}>
          <button
            className="button"
            onClick={generateAll}
            disabled={!canGenerate}
            style={{ minWidth: 240 }}
          >
            {busy ? "Working…" : "Generate Captions"}
          </button>

          <button className="button secondary" onClick={resetAll} disabled={!!busy}>
            Reset
          </button>
        </div>

        {statusText ? <div className="muted">{statusText}</div> : null}

        {error ? (
          <div style={{ color: "#b00020", fontWeight: 600 }}>{error}</div>
        ) : null}

        {/* Instant Preview */}
        {previewSrc ? (
          <div style={{ marginTop: 6 }}>
            <div className="muted" style={{ marginBottom: 6 }}>
              Preview:
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewSrc}
              alt="preview"
              style={{
                width: "100%",
                maxHeight: 420,
                objectFit: "contain",
                borderRadius: 12,
                border: "1px solid #eee",
                background: "#000",
              }}
            />

            {imageId ? (
              <div className="muted" style={{ marginTop: 8 }}>
                <strong>imageId:</strong> {imageId}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Captions */}
        {captions ? (
          <div style={{ marginTop: 12 }}>
            <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>Generated captions</h2>

            {captions.length === 0 ? (
              <p className="muted">No captions returned.</p>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {captions.map((c, i) => (
                  <div
                    key={c.id ?? `${i}`}
                    style={{
                      border: "1px solid #eee",
                      borderRadius: 12,
                      padding: 12,
                      background: "#fafafa",
                    }}
                  >
                    <div style={{ fontWeight: 800, color: "#000" }}>
                      {c.content ?? "(no content)"}
                    </div>
                    {c.id ? (
                      <div className="muted" style={{ marginTop: 6 }}>
                        captionId: {c.id}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}