import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

type HumorTheme = {
  id: number;
  created_datetime_utc: string;
  name: string;
};

export default async function ThemesPage() {
  const { data, error } = await supabase
    .from("humor_themes")
    .select("id, created_datetime_utc, name")
    .order("id", { ascending: true });

  if (error) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui" }}>
        <h1>Humor Themes</h1>
        <p style={{ color: "crimson" }}>Supabase error: {error.message}</p>
      </main>
    );
  }

  const themes = (data ?? []) as HumorTheme[];

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Humor Themes</h1>
      <p>Fetched {themes.length} rows from Supabase.</p>

      <div style={{ overflowX: "auto", marginTop: 16 }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th style={th}>ID</th>
              <th style={th}>Name</th>
              <th style={th}>Created (UTC)</th>
            </tr>
          </thead>
          <tbody>
            {themes.map((t) => (
              <tr key={t.id}>
                <td style={td}>{t.id}</td>
                <td style={td}>{t.name}</td>
                <td style={td}>
                  {new Date(t.created_datetime_utc).toISOString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  borderBottom: "1px solid #ddd",
  padding: "10px 8px",
  fontWeight: 600,
};

const td: React.CSSProperties = {
  borderBottom: "1px solid #eee",
  padding: "10px 8px",
};