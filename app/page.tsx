import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SignOutButton from "./signout-button";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="container" style={{ minHeight: "70vh", display: "grid", placeItems: "center" }}>
      <div style={{ width: "100%", maxWidth: 720 }}>
        <h1 className="title" style={{ marginBottom: 8 }}>
          Humor Project
        </h1>

        {!user ? (
          <>
            <p className="muted" style={{ marginTop: 0 }}>
              Please sign in to upload images, generate captions, and rate captions.
            </p>

            <Link className="button" href="/login">
              Sign in with Google
            </Link>
          </>
        ) : (
          <>
            <p className="muted" style={{ marginTop: 0 }}>
              Signed in as <strong>{user.email ?? "Unknown"}</strong>
            </p>

            <div className="row" style={{ gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <Link className="button" href="/upload">
                Upload + Generate Captions
              </Link>

              <Link className="button" href="/captions">
                Rate Captions
              </Link>

              <SignOutButton />
            </div>
          </>
        )}
      </div>
    </main>
  );
}