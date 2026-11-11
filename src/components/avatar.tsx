import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { loadContactAvatar } from "@/lib/contact-avatar";

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const [photo, setPhoto] = useState<{ name: string; url: string }>();
  const [failedUrl, setFailedUrl] = useState("");
  useEffect(() => {
    let active = true;
    const refresh = () => {
      void loadContactAvatar(name).then(url => {
        if (active) setPhoto({ name, url });
      }).catch(() => { if (active) setPhoto({ name, url: "" }); });
    };
    refresh();
    const timer = window.setInterval(refresh, 60000);
    const { data } = supabase.auth.onAuthStateChange(() => {
      if (active) setPhoto(undefined);
      refresh();
    });
    return () => { active = false; window.clearInterval(timer); data.subscription.unsubscribe(); };
  }, [name]);
  const url = photo?.name === name ? photo.url : "";
  const ini = name.trim().split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent font-display font-extrabold text-accent-foreground ring-2 ring-primary"
      style={{ width: size, height: size }}>
      {url && url !== failedUrl
        ? <img src={url} alt={`Foto di ${name}`} className="h-full w-full object-cover" onError={() => setFailedUrl(url)} />
        : ini}
    </div>
  );
}

/** The signed-in user's own avatar; always visible to themselves, even in incognito. */
export function MyAvatar({ size = 44 }: { size?: number }) {
  const [me, setMe] = useState<{ name: string; url: string }>();
  useEffect(() => {
    let active = true;
    async function load() {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: p } = await supabase.from("profiles").select("username, avatar_path").eq("id", u.user.id).maybeSingle();
      if (!active || !p) return;
      let url = "";
      if (p.avatar_path) {
        const { data: s } = await supabase.storage.from("profile-photos").createSignedUrl(p.avatar_path, 3600);
        url = s?.signedUrl ?? "";
      }
      if (active) setMe({ name: p.username ?? "Io", url });
    }
    void load().catch(() => {});
    return () => { active = false; };
  }, []);
  const ini = (me?.name ?? "…").trim().split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent font-display font-extrabold text-accent-foreground ring-2 ring-primary"
      style={{ width: size, height: size }}>
      {me?.url ? <img src={me.url} alt="La mia foto" className="h-full w-full object-cover" /> : ini}
    </div>
  );
}
