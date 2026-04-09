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
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 20px" }}>
      <div style={{ width: "100%", maxWidth: 560 }}>

        {/* Logo / wordmark */}
        <div style={{ marginBottom: 40 }}>
          <div style={{
            display: "inline-block",
            background: "var(--accent)",
            color: "#0d0d0d",
            fontWeight: 800,
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            padding: "3px 10px",
            borderRadius: 4,
            marginBottom: 16,
            fontFamily: "var(--font-dm-mono, monospace)",
          }}>
            Humor Project
          </div>
          <h1 style={{
            fontSize: "clamp(32px, 6vw, 54px)",
            fontWeight: 800,
            letterSpacing: "-0.04em",
            lineHeight: 1.05,
            color: "var(--text)",
            margin: 0,
          }}>
            Caption<br />
            <span style={{ color: "var(--accent)" }}>everything.</span>
          </h1>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "var(--border)", marginBottom: 32 }} />

        {!user ? (
          <>
            <p className="muted" style={{ marginBottom: 24 }}>
              Sign in to upload images, generate AI captions, and rate them.
            </p>
            <Link className="button accent" href="/login">
              Sign in with Google →
            </Link>
          </>
        ) : (
          <>
            <p className="muted" style={{ marginBottom: 24 }}>
              Signed in as <span style={{ color: "var(--text)", fontWeight: 600 }}>{user.email ?? "Unknown"}</span>
            </p>

            <div style={{ display: "grid", gap: 10 }}>
              <Link className="button accent" href="/upload" style={{ justifyContent: "space-between" }}>
                <span>Upload + Generate Captions</span>
                <span>→</span>
              </Link>
              <Link className="button accent" href="/captions" style={{ justifyContent: "space-between" }}>
                <span>Rate Captions</span>
                <span>→</span>
              </Link>
            </div>

            <div style={{ marginTop: 20 }}>
              <SignOutButton />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
