import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import VoteButtons from "./vote-buttons";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Caption = {
  id: string;
  content: string | null;
  like_count: number;
  image: { url: string | null }[] | null;
};

export default async function CaptionsPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

  const { data, error } = await supabase
    .from("captions")
    .select("id, content, like_count, image:images(url)")
    .eq("is_public", true)
    .not("content", "is", null)
    .order("created_datetime_utc", { ascending: false })
    .limit(60);

  const captions = (data ?? []) as Caption[];

  // Build vote map for highlighting / skipping voted captions
  const voteMap = new Map<string, 1 | -1>();
  const captionIds = captions.map((c) => c.id);

  if (user && captionIds.length > 0) {
    const { data: votes } = await supabase
      .from("caption_votes")
      .select("caption_id, vote_value")
      .eq("profile_id", user.id)
      .in("caption_id", captionIds);

    (votes ?? []).forEach((v: any) => {
      const vv = Number(v.vote_value);
      if (vv === 1 || vv === -1) voteMap.set(String(v.caption_id), vv as 1 | -1);
    });
  }

  return (
    <main className="container">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 className="title" style={{ marginBottom: 6 }}>
            Rate Captions
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            Logged in as: <strong>{user?.email ?? "Unknown"}</strong>
          </p>
        </div>

        <Link className="button" href="/">
          Home
        </Link>
      </div>

      {error ? (
        <p className="error">{error.message}</p>
      ) : captions.length === 0 ? (
        <p className="muted" style={{ marginTop: 16 }}>
          No captions found.
        </p>
      ) : (
        <div style={{ marginTop: 16 }}>
          <VoteButtons
            captions={captions}
            initialVoteMap={Object.fromEntries(voteMap.entries())}
          />
        </div>
      )}
    </main>
  );
}