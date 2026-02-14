import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SignOutButton from "./signout-button";

export const dynamic = "force-dynamic";

type HumorTheme = {
  id: number;
  created_datetime_utc: string;
  name: string;
};

export default async function ProtectedPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("humor_themes")
    .select("id, created_datetime_utc, name")
    .order("id", { ascending: true });

  const themes = (data ?? []) as HumorTheme[];

  return (
    <main className="container">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 className="title" style={{ marginBottom: 6 }}>
            Protected Themes
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            Only logged-in users can see this.
          </p>
          <p className="muted" style={{ marginTop: 8 }}>
            Logged in as: <strong>{user?.email ?? "Unknown"}</strong>
          </p>
        </div>

        <div className="row">
          <Link className="button" href="/">
            Home
          </Link>
          <SignOutButton />
        </div>
      </div>

      {error ? (
        <p className="error">Supabase error: {error.message}</p>
      ) : (
        <>
          <p className="muted">Fetched {themes.length} rows from Supabase.</p>

          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Created (UTC)</th>
                </tr>
              </thead>
              <tbody>
                {themes.map((t) => (
                  <tr key={t.id}>
                    <td>{t.id}</td>
                    <td>{t.name}</td>
                    <td>{new Date(t.created_datetime_utc).toISOString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}