"use client";

import { useMemo, useState } from "react";
import { voteCaption } from "./vote-action";

type Caption = {
  id: string;
  content: string | null;
  image_id: string;
};

type VoteValue = 1 | -1;

export default function VoteButtons({
  captions,
  imageUrlById,
  initialVoteMap,
}: {
  captions: Caption[];
  imageUrlById: Record<string, string | null>;
  initialVoteMap: Record<string, VoteValue>;
}) {
  const [voteMap, setVoteMap] = useState<Record<string, VoteValue>>(initialVoteMap);
  const [queue, setQueue] = useState<string[]>(() =>
    captions.filter((c) => initialVoteMap[c.id] == null).map((c) => c.id)
  );
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [reviewing, setReviewing] = useState(false);

  const captionById = useMemo(
    () => Object.fromEntries(captions.map((c) => [c.id, c])),
    [captions]
  );

  async function vote(captionId: string, v: VoteValue) {
    setError("");
    const prevVote = voteMap[captionId] ?? null;
    setLoading(`${captionId}:${v}`);
    setVoteMap((m) => ({ ...m, [captionId]: v }));
    setQueue((q) => q.filter((id) => id !== captionId));

    const res = await voteCaption(captionId, v);
    setLoading(null);

    if (!res.ok) {
      setError(res.error);
      setVoteMap((m) => {
        const copy = { ...m };
        if (prevVote !== null) copy[captionId] = prevVote;
        else delete copy[captionId];
        return copy;
      });
      if (prevVote === null) {
        setQueue((q) => (q.includes(captionId) ? q : [captionId, ...q]));
      }
    }
  }

  function skip() {
    setError("");
    setQueue((q) => (q.length <= 1 ? q : [...q.slice(1), q[0]]));
  }

  const currentId = queue[0];
  const current = currentId ? captionById[currentId] : null;

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", display: "grid", gap: 16 }}>
      {error && (
        <div style={{
          background: "rgba(255,91,91,0.08)",
          border: "1px solid rgba(255,91,91,0.3)",
          borderRadius: 10,
          padding: "10px 14px",
          color: "var(--error)",
          fontSize: 13,
          fontFamily: "var(--font-dm-mono, monospace)",
        }}>
          {error}
        </div>
      )}

      {reviewing ? (
        <ReviewList
          captions={captions}
          imageUrlById={imageUrlById}
          voteMap={voteMap}
          loading={loading}
          onVote={vote}
          onBack={() => setReviewing(false)}
        />
      ) : current ? (
        <ActiveCard
          caption={current}
          imageUrl={imageUrlById[current.image_id] ?? null}
          loading={loading}
          onVote={(v) => vote(current.id, v)}
          onSkip={skip}
          canSkip={queue.length > 1}
        />
      ) : (
        <DonePanel onReview={() => setReviewing(true)} />
      )}
    </div>
  );
}

function ActiveCard({
  caption,
  imageUrl,
  loading,
  onVote,
  onSkip,
  canSkip,
}: {
  caption: Caption;
  imageUrl: string | null;
  loading: string | null;
  onVote: (v: VoteValue) => void;
  onSkip: () => void;
  canSkip: boolean;
}) {
  const upKey = `${caption.id}:1`;
  const downKey = `${caption.id}:-1`;
  const busy = loading !== null;

  return (
    <>
      <div style={{
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid var(--border)",
        background: "#000",
        aspectRatio: "16/9",
        maxHeight: 260,
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

      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "14px 18px",
        textAlign: "center",
      }}>
        <p style={{
          fontWeight: 600,
          fontSize: "clamp(15px, 2.2vw, 18px)",
          color: "var(--text)",
          lineHeight: 1.4,
          margin: 0,
          letterSpacing: "-0.02em",
          fontFamily: "'Syne', sans-serif",
        }}>
          {caption.content ?? "(no content)"}
        </p>
      </div>

      <div className="row" style={{ justifyContent: "center", gap: 10 }}>
        <button
          className="button"
          onClick={() => onVote(1)}
          disabled={busy}
          style={{ minWidth: 130 }}
        >
          {loading === upKey ? "Saving…" : "👍  Funny"}
        </button>

        <button
          className="button"
          onClick={() => onVote(-1)}
          disabled={busy}
          style={{ minWidth: 130 }}
        >
          {loading === downKey ? "Saving…" : "👎  Not funny"}
        </button>

        <button
          className="button secondary"
          onClick={onSkip}
          disabled={busy || !canSkip}
          title={canSkip ? "Move to back of queue" : "Only one left"}
        >
          Skip →
        </button>
      </div>
    </>
  );
}

function DonePanel({ onReview }: { onReview: () => void }) {
  return (
    <div style={{
      border: "1px solid var(--border)",
      borderRadius: 14,
      padding: "32px 24px",
      background: "var(--surface)",
      textAlign: "center",
      display: "grid",
      gap: 16,
    }}>
      <div style={{ fontSize: 40, lineHeight: 1 }}>🎉</div>
      <h2 style={{
        margin: 0,
        fontSize: 24,
        fontWeight: 800,
        letterSpacing: "-0.02em",
        color: "var(--text)",
      }}>
        All caught up!
      </h2>
      <p className="muted" style={{ margin: 0 }}>
        You&rsquo;ve voted on every caption.
      </p>
      <div style={{ marginTop: 8 }}>
        <button className="button accent" onClick={onReview}>
          Review your votes →
        </button>
      </div>
    </div>
  );
}

function ReviewList({
  captions,
  imageUrlById,
  voteMap,
  loading,
  onVote,
  onBack,
}: {
  captions: Caption[];
  imageUrlById: Record<string, string | null>;
  voteMap: Record<string, VoteValue>;
  loading: string | null;
  onVote: (captionId: string, v: VoteValue) => void;
  onBack: () => void;
}) {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <span style={{
          fontFamily: "var(--font-dm-mono, monospace)",
          fontSize: 12,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
        }}>
          Review
        </span>
        <button className="button secondary" onClick={onBack}>
          ← Back
        </button>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {captions.map((c) => {
          const v = voteMap[c.id] ?? null;
          const imageUrl = imageUrlById[c.image_id] ?? null;
          const upKey = `${c.id}:1`;
          const downKey = `${c.id}:-1`;
          const busy = loading !== null;

          return (
            <div key={c.id} style={{
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 12,
              background: "var(--surface)",
              display: "grid",
              gridTemplateColumns: "80px 1fr",
              gap: 12,
              alignItems: "center",
            }}>
              <div style={{
                width: 80,
                height: 80,
                borderRadius: 8,
                overflow: "hidden",
                background: "#000",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}>
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>No image</span>
                )}
              </div>

              <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
                <p style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text)",
                  lineHeight: 1.35,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}>
                  {c.content ?? "(no content)"}
                </p>
                <div className="row" style={{ gap: 6 }}>
                  <button
                    className={`button${v === 1 ? " accent" : ""}`}
                    onClick={() => onVote(c.id, 1)}
                    disabled={busy}
                    style={{ fontSize: 12, padding: "4px 10px", minWidth: 0 }}
                  >
                    {loading === upKey ? "…" : "👍"}
                  </button>
                  <button
                    className={`button${v === -1 ? " accent" : ""}`}
                    onClick={() => onVote(c.id, -1)}
                    disabled={busy}
                    style={{ fontSize: 12, padding: "4px 10px", minWidth: 0 }}
                  >
                    {loading === downKey ? "…" : "👎"}
                  </button>
                  {v === null && (
                    <span style={{
                      fontFamily: "var(--font-dm-mono, monospace)",
                      fontSize: 11,
                      color: "var(--text-muted)",
                      alignSelf: "center",
                      marginLeft: 4,
                    }}>
                      not voted
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
