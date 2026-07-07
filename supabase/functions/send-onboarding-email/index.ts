const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed." }, 405);
  }

  try {
    const authorization = request.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const senderEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

    if (!authorization || !supabaseUrl || !supabaseAnonKey) {
      return jsonResponse({ ok: false, error: "Authentication is unavailable." }, 401);
    }

    if (!resendApiKey) {
      return jsonResponse({ ok: false, error: "Email service is not configured." }, 503);
    }

    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: authorization,
        apikey: supabaseAnonKey,
      },
    });

    if (!userResponse.ok) {
      return jsonResponse({ ok: false, error: "Your session is no longer valid." }, 401);
    }

    const user = await userResponse.json();
    if (!user.email || !user.email.toLowerCase().endsWith("@9ostech.com")) {
      return jsonResponse({ ok: false, error: "Only 9ostech accounts can send plans." }, 403);
    }

    const body = await request.json();
    const to = typeof body.to === "string" ? body.to.trim() : "";
    const cc = typeof body.cc === "string" ? body.cc.trim() : "";
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const html = typeof body.html === "string" ? body.html : "";

    if (!emailPattern.test(to) || (cc && !emailPattern.test(cc))) {
      return jsonResponse({ ok: false, error: "A recipient email is invalid." }, 400);
    }

    if (!subject || subject.length > 200 || !html || html.length > 200_000) {
      return jsonResponse({ ok: false, error: "The email content is invalid." }, 400);
    }

    const resendPayload: Record<string, unknown> = {
      from: senderEmail,
      to: [to],
      subject,
      html,
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
});
