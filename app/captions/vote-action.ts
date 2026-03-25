"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function voteCaption(captionId: string, voteValue: 1 | -1) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false as const, error: "Must be logged in" };

  const profileId = user.id;

  const payload = {
    profile_id: profileId,
    caption_id: captionId,
    vote_value: voteValue,
    created_by_user_id: profileId,
    modified_by_user_id: profileId,
  };

  const { error } = await supabase
    .from("caption_votes")
    .upsert(payload, { onConflict: "profile_id,caption_id" });

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/captions");
  return { ok: true as const };
}