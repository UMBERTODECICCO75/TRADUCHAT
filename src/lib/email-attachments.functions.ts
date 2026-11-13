import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { uploadEmailAttachmentFile } from "@/lib/email-attachments.server";

const MAX_BASE64 = 28_000_000; // ~20 MB binary

const inputSchema = z.object({
  file: z.string().min(1).max(MAX_BASE64),
  fileName: z.string().min(1).max(200),
  mimeType: z.string().min(1).max(100),
});

function extensionFor(fileName: string, mimeType: string): string {
  const fromName = fileName.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{1,8}$/.test(fromName)) return fromName;
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("image/")) return mimeType.split("/")[1]?.replace(/[^a-z0-9]/g, "") || "jpg";
  return "bin";
}

export const uploadEmailAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { path, url } = await uploadEmailAttachmentFile({
      userId: context.userId,
      base64: data.file,
      mimeType: data.mimeType,
      extension: extensionFor(data.fileName, data.mimeType),
    });
    return { path, url, fileName: data.fileName };
  });
