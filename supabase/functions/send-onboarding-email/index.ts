import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createSupabaseContext } from "jsr:@supabase/server@^1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const demoRecipientEmail = "mateen9ostech@gmail.com";

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

export default {
  fetch: async (request: Request) => {
    if (request.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return jsonResponse({ ok: false, error: "Method not allowed." }, 405);
    }

    const { data: context, error: authError } = await createSupabaseContext(request, {
      auth: "user",
    });

    if (authError || !context?.userClaims?.email) {
      return jsonResponse({ ok: false, error: "Your session is no longer valid." }, 401);
    }

    if (!context.userClaims.email.toLowerCase().endsWith("@9ostech.com")) {
      return jsonResponse({ ok: false, error: "Only 9ostech accounts can send plans." }, 403);
    }

    try {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      const senderEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

      if (!resendApiKey) {
        return jsonResponse({ ok: false, error: "Email service is not configured." }, 503);
      }

      const body = await request.json();
      const to = typeof body.to === "string" ? body.to.trim() : "";
      const cc = typeof body.cc === "string" ? body.cc.trim() : "";
      const subject = typeof body.subject === "string" ? body.subject.trim() : "";
      const html = typeof body.html === "string" ? body.html : "";
      const attachment = body.attachment && typeof body.attachment === "object"
        ? body.attachment as { filename?: unknown; content?: unknown }
        : null;

      if (!emailPattern.test(to) || (cc && !emailPattern.test(cc))) {
        return jsonResponse({ ok: false, error: "A recipient email is invalid." }, 400);
      }

      if (to.toLowerCase() !== demoRecipientEmail || cc) {
        return jsonResponse(
          { ok: false, error: `Demo Mode can only send to ${demoRecipientEmail}.` },
          403,
        );
      }

      if (!subject || subject.length > 200 || !html || html.length > 200_000) {
        return jsonResponse({ ok: false, error: "The email content is invalid." }, 400);
      }

      const attachmentFilename = typeof attachment?.filename === "string"
        ? attachment.filename.trim()
        : "";
      const attachmentContent = typeof attachment?.content === "string"
        ? attachment.content
        : "";
      if (
        !attachmentFilename.toLowerCase().endsWith(".pdf") ||
        !attachmentContent ||
        attachmentContent.length > 12_000_000 ||
        !/^[A-Za-z0-9+/=]+$/.test(attachmentContent)
      ) {
        return jsonResponse({ ok: false, error: "The PDF attachment is invalid or too large." }, 400);
      }

      const resendPayload: Record<string, unknown> = {
        from: senderEmail,
        to: [to],
        subject,
        html,
        attachments: [{
          filename: attachmentFilename,
          content: attachmentContent,
        }],
      };
      if (cc) resendPayload.cc = [cc];

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(resendPayload),
      });

      const resendResult = await resendResponse.json();
      if (!resendResponse.ok) {
        console.error("Resend rejected the email:", resendResult);
        return jsonResponse({ ok: false, error: "The email provider rejected the request." }, 502);
      }

      return jsonResponse({ ok: true, id: resendResult.id });
    } catch (error) {
      console.error("send-onboarding-email failed:", error);
      return jsonResponse({ ok: false, error: "Unable to send the email." }, 500);
    }
  },
};
