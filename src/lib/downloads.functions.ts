import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Creates a short-lived signed URL for a digital product the caller owns. */
export const getDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ downloadId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("downloads")
      .select("*")
      .eq("id", data.downloadId)
      .maybeSingle();
    if (!row || row.user_id !== context.userId) throw new Error("Download not found.");
    if (!row.is_active) throw new Error("This download has been disabled. Contact support.");
    if (row.expires_at && new Date(row.expires_at) < new Date())
      throw new Error("This download link has expired. Contact support to have it reissued.");
    if (row.download_count >= row.max_downloads)
      throw new Error("You have reached the download limit for this product. Contact support.");
    if (!row.file_path) throw new Error("The file for this product is not ready yet.");

    const { data: signed, error } = await supabaseAdmin.storage
      .from("product-files")
      .createSignedUrl(row.file_path, 300, { download: true });
    if (error || !signed) throw new Error("Could not generate a download link. Please try again.");

    await supabaseAdmin
      .from("downloads")
      .update({ download_count: row.download_count + 1 })
      .eq("id", row.id);

    return { url: signed.signedUrl, remaining: Math.max(0, row.max_downloads - row.download_count - 1) };
  });

/** Signed URL for a payment proof image — owner or staff only. */
export const getProofUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ paymentId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: isStaff } = await context.supabase.rpc("is_staff", { _user_id: context.userId });

    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("id, user_id, proof_path")
      .eq("id", data.paymentId)
      .maybeSingle();
    if (!payment) throw new Error("Payment not found.");
    if (payment.user_id !== context.userId && isStaff !== true) throw new Error("Forbidden.");
    if (!payment.proof_path) return { url: null };

    const { data: signed } = await supabaseAdmin.storage
      .from("payment-proofs")
      .createSignedUrl(payment.proof_path, 600);
    return { url: signed?.signedUrl ?? null };
  });
