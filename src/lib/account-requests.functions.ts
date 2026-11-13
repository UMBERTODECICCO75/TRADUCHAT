import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const sendSupportRequest = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ category: z.enum(["privacy","assistance","copyright"]), message: z.string().trim().min(5).max(2000) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("account_support_requests").insert({ user_id: context.userId, ...data }).select("id").single();
    if (error) throw new Error("Richiesta non inviata. Riprova.");
    return row;
  });
export const listSupportRequests = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ offset: z.number().int().min(0), requestId: z.string().uuid().optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: role, error: roleError } = await context.supabase.from("user_roles").select("id").eq("user_id",context.userId).eq("role","admin").maybeSingle();
    if (roleError || !role) throw new Error("Accesso riservato agli amministratori.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.requestId) {
      const { error } = await supabaseAdmin.from("account_support_requests").update({status:"reviewing"}).eq("id",data.requestId).eq("status","requested");
      if (error) throw error;
    }
    const { data: rows, error } = await supabaseAdmin.from("account_support_requests").select("id,user_id,category,message,status,created_at").neq("status","completed").order("created_at").range(data.offset,data.offset+19);
    if (error) throw error;
    return { requests: rows ?? [], hasMore: rows?.length === 20 };
  });

export const listMyDeletionRequests = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.from("account_deletion_requests").select("id,status,created_at").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(10);
  if (error) throw new Error("Richieste non disponibili.");
  return data ?? [];
});
export const requestAccountDeletion = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ confirmed: z.literal(true) }).parse(input))
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("account_deletion_requests").insert({ user_id: context.userId }).select("id,status,created_at").single();
    if (error?.code === "23505") return { alreadyRequested: true };
    if (error) throw new Error("Non riesco a inviare la richiesta.");
    return { alreadyRequested: false, request: data };
  });
export const reviewDeletionRequests = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ offset: z.number().int().min(0).default(0), requestId: z.string().uuid().optional() }).parse(input))
  .handler(async ({ data: input, context }) => {
    const { data: role, error: roleError } = await context.supabase.from("user_roles").select("id").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (roleError || !role) throw new Error("Accesso riservato agli amministratori.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (input.requestId) {
      const { error } = await supabaseAdmin.from("account_deletion_requests").update({ status: "reviewing", updated_at: new Date().toISOString() }).eq("id", input.requestId).eq("status", "requested");
      if (error) throw error;
    }
    const { data, error } = await supabaseAdmin.from("account_deletion_requests").select("id,user_id,status,created_at").neq("status", "completed").order("created_at").range(input.offset,input.offset + 19);
    if (error) throw error;
    const requests = await Promise.all((data ?? []).map(async request => {
      const [account, balances, purchases] = await Promise.all([
        supabaseAdmin.auth.admin.getUserById(request.user_id),
        supabaseAdmin.from("ai_credit_balances").select("environment,balance").eq("user_id", request.user_id),
        supabaseAdmin.from("ai_credit_purchases").select("id", { count: "exact", head: true }).eq("user_id", request.user_id),
      ]);
      return { ...request, email: account.data.user?.email ?? null, balances: balances.data ?? [], purchaseCount: purchases.count ?? 0 };
    }));
    return { requests, hasMore: requests.length === 20 };
  });