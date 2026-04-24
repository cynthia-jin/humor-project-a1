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

  const { data, error } = await supabase
    .from("captions")
    .select("id, content, image_id")
    .eq("is_public", true)
    .not("content", "is", null)
    .order("created_datetime_utc", { ascending: false })
    .limit(60);

  const captions = (data ?? []) as Caption[];

  const uniqueImageIds = Array.from(
    new Set(captions.map((c) => c.image_id).filter(Boolean))
  );

  let imageUrlById: Record<string, string | null> = {};
  if (uniqueImageIds.length > 0) {
    const { data: imagesData } = await supabase
      .from("images")
      .select("id, url")
      .in("id", uniqueImageIds);

    imageUrlById = Object.fromEntries(
      ((imagesData ?? []) as ImageRow[]).map((img) => [img.id, img.url])
    );
  }

  const voteMap = new Map<string, 1 | -1>();
  const captionIds = captions.map((c) => c.id);

  if (captionIds.length > 0) {
    const { data: votes } = await supabase
      .from("caption_votes")
      .select("caption_id, vote_value")
      .eq("profile_id", user.id)
      .in("caption_id", captionIds);

    (votes ?? []).forEach((v: { caption_id: string; vote_value: number }) => {
      const vv = Number(v.vote_value);
      if (vv === 1 || vv === -1) voteMap.set(String(v.caption_id), vv as 1 | -1);
    });
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
