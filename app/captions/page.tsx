import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import VoteButtons from "./vote-buttons";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Caption = {
  id: string;
  content: string | null;
  image_id: string;
};

type ImageRow = {
  id: string;
  url: string | null;
};

export default async function CaptionsPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const PAGE_SIZE = 1000;

  const captions: Caption[] = [];
  let captionsError: { message: string } | null = null;
  for (let page = 0; ; page++) {
    const from = page * PAGE_SIZE;
    const { data, error } = await supabase
      .from("captions")
      .select("id, content, image_id")
      .eq("is_public", true)
      .not("content", "is", null)
      .order("created_datetime_utc", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      captionsError = error;
      break;
    }
    const rows = (data ?? []) as Caption[];
    captions.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }
  const error = captionsError;

  const uniqueImageIds = Array.from(
    new Set(captions.map((c) => c.image_id).filter(Boolean))
  );

  const imageUrlById: Record<string, string | null> = {};
  if (uniqueImageIds.length > 0) {
    for (let page = 0; ; page++) {
      const from = page * PAGE_SIZE;
      const { data: imagesData, error: imagesError } = await supabase
        .from("images")
        .select("id, url")
        .in("id", uniqueImageIds)
        .range(from, from + PAGE_SIZE - 1);
      if (imagesError) break;
      const rows = (imagesData ?? []) as ImageRow[];
      rows.forEach((img) => {
        imageUrlById[img.id] = img.url;
      });
      if (rows.length < PAGE_SIZE) break;
    }
  }

  const voteMap = new Map<string, 1 | -1>();
  const captionIdSet = new Set(captions.map((c) => c.id));
  for (let page = 0; ; page++) {
    const from = page * PAGE_SIZE;
    const { data: votes, error: votesError } = await supabase
      .from("caption_votes")
      .select("caption_id, vote_value")
      .eq("profile_id", user.id)
      .range(from, from + PAGE_SIZE - 1);
    if (votesError) break;
    const rows = (votes ?? []) as { caption_id: string; vote_value: number }[];
    rows.forEach((v) => {
      const id = String(v.caption_id);
      if (!captionIdSet.has(id)) return;
      const vv = Number(v.vote_value);
      if (vv === 1 || vv === -1) voteMap.set(id, vv as 1 | -1);
    });
    if (rows.length < PAGE_SIZE) break;
  }

  return (
    <main className="container">
      {/* Nav */}
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 40 }}>
        <div>
          <div style={{
            fontFamily: "var(--font-dm-mono, monospace)",
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.1em",
            textTransform: "uppercase" as const,
            color: "var(--accent)",
            marginBottom: 8,
          }}>
            Rate
          </div>
          <h1 className="title">Captions</h1>
          <p className="muted" style={{ margin: 0 }}>
            {user.email ?? "Unknown"}
          </p>
        </div>

        <div className="row" style={{ gap: 8, alignSelf: "flex-start", marginTop: 4 }}>
          <Link className="button" href="/upload">Upload</Link>
          <Link className="button" href="/">Home</Link>
        </div>
      </div>

      <div style={{ height: 1, background: "var(--border)", marginBottom: 32 }} />

      {error ? (
        <p className="error">{error.message}</p>
      ) : captions.length === 0 ? (
        <p className="muted">No captions found.</p>
      ) : (
        <VoteButtons
          captions={captions}
          imageUrlById={imageUrlById}
          initialVoteMap={Object.fromEntries(voteMap.entries())}
        />
      )}
    </main>
  );
}
