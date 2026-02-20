"use client";

import { useMemo, useState } from "react";
import { voteCaption } from "./vote-action";

type Caption = {
  id: string;
  content: string | null;
  like_count: number;
  image: { url: string | null } | null;
};

export default function VoteButtons({
  captions,
  initialVoteMap,
}: {
  captions: Caption[];
  initialVoteMap: Record<string, 1 | -1>;
}) {
  const [voteMap, setVoteMap] = useState<Record<string, 1 | -1>>(initialVoteMap);

  const [index, setIndex] = useState(() => {
    const firstUnvoted = captions.findIndex((c) => voteMap[c.id] == null);
    return firstUnvoted === -1 ? 0 : firstUnvoted;
  });

  const [loading, setLoading] = useState<null | "up" | "down">(null);
  const [msg, setMsg] = useState("");

  const current = captions[index];
  const currentVote = current ? (voteMap[current.id] ?? null) : null;

  const progressText = useMemo(() => {
    return `Rating caption ${index + 1} of ${captions.length}`;
  }, [index, captions.length]);

  function next() {
    setMsg("");
    setIndex((i) => Math.min(i + 1, captions.length - 1));
  }

  async function handleVote(v: 1 | -1) {
    if (!current) return;

    setMsg("");
    setLoading(v === 1 ? "up" : "down");

    // optimistic UI
    setVoteMap((m) => ({ ...m, [current.id]: v }));

    const res = await voteCaption(current.id, v);

    setLoading(null);

    if (!res.ok) {
      setMsg(res.error);
      // rollback optimistic update
      setVoteMap((m) => {
        const copy = { ...m };
        if (initialVoteMap[current.id]) copy[current.id] = initialVoteMap[current.id];
        else delete copy[current.id];
        return copy;
      });
      return;
    }

    setMsg("Saved! Moving to next…");
    next();
  }

  if (!current) {
    return <p className="muted">No captions to rate.</p>;
  }

  const upClass = currentVote === 1 ? "button secondary" : "button";
  const downClass = currentVote === -1 ? "button secondary" : "button";

  return (
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: 18,
        padding: 18,
        background: "#fff",
        display: "grid",
        gap: 14,
        maxWidth: 720,
        margin: "0 auto",
      }}
    >
      {/* header */}
      <div className="muted" style={{ display: "flex", justifyContent: "space-between" }}>
        <span>{progressText}</span>
        <span>{Object.keys(voteMap).length ? "" : ""}</span>
      </div>

      {/* BIG IMAGE */}
      <div
        style={{
          width: "100%",
          height: 420,
          borderRadius: 16,
          overflow: "hidden",
          background: "#f3f3f3",
          display: "grid",
          placeItems: "center",
        }}
      >
        {current.image?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.image.url}
            alt="caption"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              background: "#000",
            }}
          />
        ) : (
          <span style={{ color: "#777" }}>No image</span>
        )}
      </div>

      {/* caption text */}
      <div
        style={{
          fontWeight: 800,
          fontSize: 22,
          textAlign: "center",
          color: "#000",
          lineHeight: 1.4,
        }}
      >
        {current.content ?? "(no content)"}
      </div>

      {/* voting buttons */}
      <div className="row" style={{ justifyContent: "center", gap: 14 }}>
        <button className={upClass} onClick={() => handleVote(1)} disabled={loading !== null}>
          {loading === "up" ? "Saving..." : "👍 Upvote"}
        </button>

        <button className={downClass} onClick={() => handleVote(-1)} disabled={loading !== null}>
          {loading === "down" ? "Saving..." : "👎 Downvote"}
        </button>

        <button className="button" onClick={next}>
          Skip
        </button>
      </div>

      {/* status */}
      <div className="muted" style={{ textAlign: "center" }}>
        {currentVote === 1
          ? "You upvoted this."
          : currentVote === -1
          ? "You downvoted this."
          : "You haven’t voted yet."}
        {msg ? ` • ${msg}` : ""}
      </div>
    </div>
  );
}