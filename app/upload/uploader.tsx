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
  [key: string]: unknown;
};

const steps = ["presign", "upload", "register", "captions"] as const;
const stepLabels: Record<string, string> = {
  presign: "Generating upload URL",
  upload: "Uploading image",
  register: "Registering image",
  captions: "Generating captions",
};

export default function Uploader({ accessToken }: { accessToken: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string>("");
  const [cdnUrl, setCdnUrl] = useState<string>("");
  const [imageId, setImageId] = useState<string>("");
  const [captions, setCaptions] = useState<CaptionRecord[] | null>(null);
  const [busy, setBusy] = useState<null | "presign" | "upload" | "register" | "captions">(null);
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
      setError(`Unsupported file type: ${file.type || "(unknown)"}. Supported: jpeg/jpg/png/webp/gif/heic`);
      return;
    }

    try {
      setBusy("presign");
      const presignRes = await fetch(`${API_BASE}/pipeline/generate-presigned-url`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type }),
      });
      if (!presignRes.ok) throw new Error(`Presign failed (${presignRes.status}): ${await presignRes.text()}`);
      const { presignedUrl, cdnUrl: cdn } = await presignRes.json();
      if (!presignedUrl || !cdn) throw new Error("Presign response missing presignedUrl/cdnUrl");

      setBusy("upload");
      const uploadRes = await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error(`Upload failed (${uploadRes.status}): ${await uploadRes.text()}`);

      setBusy("register");
      const registerRes = await fetch(`${API_BASE}/pipeline/upload-image-from-url`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: cdn, isCommonUse: false }),
      });
      if (!registerRes.ok) throw new Error(`Register failed (${registerRes.status}): ${await registerRes.text()}`);
      const { imageId: imgId } = await registerRes.json();
      if (!imgId) throw new Error("Register response missing imageId");

      setCdnUrl(cdn);
      setImageId(imgId);

      setBusy("captions");
      const captionRes = await fetch(`${API_BASE}/pipeline/generate-captions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ imageId: imgId }),
      });
      if (!captionRes.ok) throw new Error(`Generate captions failed (${captionRes.status}): ${await captionRes.text()}`);

      const captionJson = await captionRes.json();
      setCaptions(Array.isArray(captionJson) ? captionJson : []);
      setBusy(null);
    } catch (e: unknown) {
      setBusy(null);
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  const previewSrc = localPreviewUrl || cdnUrl;
  const currentStepIndex = busy ? steps.indexOf(busy) : -1;

  return (
    <div style={{ display: "grid", gap: 24, maxWidth: 720 }}>

      {/* File picker */}
      <div>
        <label style={{
          display: "block",
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          marginBottom: 10,
          fontFamily: "var(--font-dm-mono, monospace)",
        }}>
          Image file
        </label>
        <input
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFile(f);
            resetOutputs();
            if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
            setLocalPreviewUrl(f ? URL.createObjectURL(f) : "");
          }}
        />
        <p className="muted" style={{ marginTop: 8, marginBottom: 0 }}>
          jpeg · jpg · png · webp · gif · heic
        </p>
      </div>

      {/* Actions */}
      <div className="row" style={{ gap: 10 }}>
        <button
          className="button accent"
          onClick={generateAll}
          disabled={!canGenerate}
          style={{ minWidth: 200 }}
        >
          {busy ? "Working…" : "Generate Captions →"}
        </button>
        <button className="button secondary" onClick={resetAll} disabled={!!busy}>
          Reset
        </button>
      </div>

      {/* Progress */}
      {busy && (
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 20,
          display: "grid",
          gap: 12,
        }}>
          {steps.map((step, i) => {
            const done = i < currentStepIndex;
            const active = i === currentStepIndex;
            return (
              <div key={step} style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                opacity: done ? 0.4 : active ? 1 : 0.2,
              }}>
                <div style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: done ? "var(--border-light)" : active ? "var(--accent)" : "var(--surface-2)",
                  border: `1px solid ${done ? "var(--border-light)" : active ? "var(--accent)" : "var(--border)"}`,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 11,
                  color: done ? "var(--text-muted)" : active ? "#0d0d0d" : "var(--border)",
                  flexShrink: 0,
                  fontFamily: "var(--font-dm-mono, monospace)",
                  fontWeight: 700,
                }}>
                  {done ? "✓" : i + 1}
                </div>
                <span style={{
                  fontSize: 13,
                  fontFamily: "var(--font-dm-mono, monospace)",
                  color: active ? "var(--text)" : "var(--text-muted)",
                }}>
                  {stepLabels[step]}{active ? "…" : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          background: "rgba(255,91,91,0.08)",
          border: "1px solid rgba(255,91,91,0.3)",
          borderRadius: 10,
          padding: "12px 16px",
          color: "var(--error)",
          fontSize: 13,
          fontFamily: "var(--font-dm-mono, monospace)",
        }}>
          {error}
        </div>
      )}

      {/* Preview */}
      {previewSrc && (
        <div>
          <p className="muted" style={{ marginBottom: 10 }}>Preview</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewSrc}
            alt="preview"
            style={{
              width: "100%",
              maxHeight: 420,
              objectFit: "contain",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "#000",
              display: "block",
            }}
          />
          {imageId && (
            <p className="muted" style={{ marginTop: 10, marginBottom: 0 }}>
              imageId: {imageId}
            </p>
          )}
        </div>
      )}

      {/* Captions */}
      {captions && (
        <div>
          <div style={{ height: 1, background: "var(--border)", marginBottom: 24 }} />
          <h2 style={{
            margin: "0 0 16px",
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "var(--text)",
          }}>
            Generated captions
          </h2>

          {captions.length === 0 ? (
            <p className="muted">No captions returned.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {captions.map((c, i) => (
                <div key={c.id ?? `${i}`} style={{
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "16px 18px",
                  background: "var(--surface)",
                  display: "grid",
                  gap: 6,
                }}>
                  <div style={{
                    fontWeight: 700,
                    fontSize: 18,
                    color: "var(--text)",
                    lineHeight: 1.4,
                  }}>
                    {c.content ?? "(no content)"}
                  </div>
                  {c.id && (
                    <div className="muted" style={{ margin: 0 }}>
                      {c.id}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
