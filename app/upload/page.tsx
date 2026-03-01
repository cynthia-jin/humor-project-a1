import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Uploader from "./uploader";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // We need the JWT access token to call the staging REST API.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token;
  if (!accessToken) redirect("/login");

  return (
    <main className="container">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 className="title" style={{ marginBottom: 6 }}>
            Upload Image → Generate Captions
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            Logged in as: <strong>{user.email ?? "Unknown"}</strong>
          </p>
        </div>

        <div className="row" style={{ gap: 10 }}>
          <Link className="button" href="/">
            Home
          </Link>
          <Link className="button" href="/captions">
            Rate Captions
          </Link>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <Uploader accessToken={accessToken} />
      </div>
    </main>
  );
}