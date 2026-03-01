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

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token;
  if (!accessToken) redirect("/login");

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
            Upload
          </div>
          <h1 className="title">Generate Captions</h1>
          <p className="muted" style={{ margin: 0 }}>
            {user.email ?? "Unknown"}
          </p>
        </div>

        <div className="row" style={{ gap: 8, alignSelf: "flex-start", marginTop: 4 }}>
          <Link className="button" href="/captions">Rate Captions</Link>
          <Link className="button" href="/">Home</Link>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "var(--border)", marginBottom: 32 }} />

      <Uploader accessToken={accessToken} />
    </main>
  );
}
