"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import styles from "./login.module.css";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>Humor Project</p>
        <h1 className={styles.title}>Welcome back.</h1>
        <p className={styles.subtitle}>
          Sign in to upload images, generate captions, and rate them.
        </p>
        <div className={styles.divider} />
        <button
          className={styles.button}
          onClick={signInWithGoogle}
          disabled={loading}
        >
          <span className={styles.badge}>G</span>
          {loading ? "Redirecting…" : "Continue with Google"}
        </button>
      </div>
    </main>
  );
}
