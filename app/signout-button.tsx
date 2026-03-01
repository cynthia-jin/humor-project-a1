"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const [loading, setLoading] = useState(false);

  return (
    <button
      className="button secondary"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.signOut();
        window.location.href = "/";
      }}
    >
      {loading ? "Signing out..." : "Sign out"}
    </button>
  );
}