"use client";

import { useMemo, useRef, useState } from "react";
import { voteCaption } from "./vote-action";

type Caption = {
  id: string;
  content: string | null;
  image_id: string;
};

export default function VoteButtons({
  captions,
  imageUrlById,
  initialVoteMap,
}: {
  captions: Caption[];
  imageUrlById: Record<string, string | null>;
  initialVoteMap: Record<string, 1 | -1>;
}) {
  const [voteMap, setVoteMap] = useState<Record<string, 1 | -1>>(initialVoteMap);
  const [index, setIndex] = useState(() => {
    const firstUnvoted = captions.findIndex((c) => voteMap[c.id] == null);
    return firstUnvoted === -1 ? 0 : firstUnvoted;
  });
  const [loading, setLoading] = useState<null | "up" | "down">(null);
  const [msg, setMsg] = useState("");

  const voteMapRef = useRef(voteMap);
  voteMapRef.current = voteMap;

  const current = captions[index];
  const currentVote = current ? (voteMap[current.id] ?? null) : null;

  const votedCount = useMemo(
    () => Object.keys(voteMap).length,
    [voteMap]
  );

  function next() {
    setMsg("");
    setIndex((prev) => {
      const map = voteMapRef.current;
      for (let i = prev + 1; i < captions.length; i++) {
        if (map[captions[i].id] == null) return i;
      }
      return Math.min(prev + 1, captions.length - 1);
    });
  }

  async function handleVote(v: 1 | -1) {
    if (!current) return;
    setMsg("");
    setLoading(v === 1 ? "up" : "down");
    setVoteMap((m) => ({ ...m, [current.id]: v }));

    const res = await voteCaption(current.id, v);
    setLoading(null);

    if (!res.ok) {
      setMsg(res.error);
      setVoteMap((m) => {
        const copy = { ...m };
        if (initialVoteMap[current.id]) copy[current.id] = initialVoteMap[current.id];
        else delete copy[current.id];
        return copy;
      });
      return;
    }

    setMsg("Saved!");
    next();
  }

  if (!current) {
    return <p className="muted">No captions to rate.</p>;
  }

  const imageUrl = imageUrlById[current.image_id] ?? null;
  const progress = Math.round((votedCount / captions.length) * 100);

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", display: "grid", gap: 20 }}>

      {/* Progress bar */}
      <div>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}>
          <span style={{
            fontFamily: "var(--font-dm-mono, monospace)",
            fontSize: 12,
            color: "var(--text-muted)",
          }}>
            {index + 1} / {captions.length}
          </span>
          <span style={{
            fontFamily: "var(--font-dm-mono, monospace)",
            fontSize: 12,
            color: "var(--accent)",
          }}>
            {votedCount} voted · {progress}%
          </span>
        </div>
        <div style={{
          height: 3,
          background: "var(--border)",
          borderRadius: 99,
          overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            width: `${progress}%`,
            background: "var(--accent)",
            borderRadius: 99,
            transition: "width 0.3s ease",
          }} />
        </div>
      </div>

      {/* Image */}
      <div style={{
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid var(--border)",
        background: "#000",
        aspectRatio: "16/9",
        display: "grid",
        placeItems: "center",
      }}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt="caption"
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        ) : (
          <span style={{
            fontFamily: "var(--font-dm-mono, monospace)",
            fontSize: 12,
            color: "var(--text-muted)",
          }}>
            No image
          </span>
        )}
      </div>

      {/* Caption text */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "20px 22px",
        textAlign: "center",
      }}>
        <p style={{
          fontWeight: 600,
          fontSize: "clamp(18px, 3vw, 24px)",
          color: "var(--text)",
          lineHeight: 1.5,
          margin: 0,
          letterSpacing: "-0.02em",
          fontFamily: "'Syne', sans-serif",
        }}>
          {current.content ?? "(no content)"}
        </p>
      </div>

      {/* Vote buttons */}
      <div className="row" style={{ justifyContent: "center", gap: 10 }}>
        <button
          className={`button${currentVote === 1 ? " accent" : ""}`}
          onClick={() => handleVote(1)}
          disabled={loading !== null}
          style={{ minWidth: 130 }}
        >
          {loading === "up" ? "Saving…" : "👍  Funny"}
        </button>

        <button
          className={`button${currentVote === -1 ? " accent" : ""}`}
          onClick={() => handleVote(-1)}
          disabled={loading !== null}
          style={{ minWidth: 130 }}
        >
          {loading === "down" ? "Saving…" : "👎  Not funny"}
        </button>

        <button
          className="button secondary"
          onClick={next}
          disabled={loading !== null}
        >
          Skip →
        </button>
      </div>

      {/* Status */}
      {(msg || currentVote !== null) && (
        <p style={{
          textAlign: "center",
          fontFamily: "var(--font-dm-mono, monospace)",
          fontSize: 12,
          color: msg ? "var(--accent)" : "var(--text-muted)",
          margin: 0,
        }}>
          {msg
            ? msg
            : currentVote === 1
            ? "You marked this as funny."
            : "You marked this as not funny."}
        </p>
      )}
    </div>
  );
}
