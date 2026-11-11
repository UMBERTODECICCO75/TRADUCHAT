import { supabase } from "@/integrations/supabase/client";

/** Fetch only the photo exposed by the contact's visibility settings. */
export async function loadContactAvatar(name: string): Promise<string> {
  const { data: path, error } = await supabase.rpc("contact_avatar", { profile_name: name });
  if (error || !path) return "";
  const { data, error: photoError } = await supabase.storage.from("profile-photos").createSignedUrl(path, 300);
  return photoError ? "" : data?.signedUrl ?? "";
}