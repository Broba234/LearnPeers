// Minimal email sender. Uses Resend when RESEND_API_KEY is set;
// otherwise logs to the server console and reports the code back to the
// caller in development so the flow stays testable without a provider.

type SendResult = { delivered: boolean; devCode?: string };

export async function sendSchoolVerificationEmail(
  to: string,
  code: string,
  institutionName: string
): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "LearnPeers <verify@learnpeers.com>";

  if (apiKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `${code} is your LearnPeers verification code`,
        html: `
          <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
            <h2 style="color:#243036;margin:0 0 8px;">Verify your school email</h2>
            <p style="color:#4f636d;line-height:1.5;">Enter this code in LearnPeers to confirm you study at <strong>${institutionName}</strong>:</p>
            <p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#0077be;margin:24px 0;">${code}</p>
            <p style="color:#a6b4bb;font-size:13px;">This code expires in 15 minutes. If you didn't request it, you can ignore this email.</p>
          </div>`,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[EMAIL] Resend send failed:", res.status, body);
      throw new Error("Failed to send verification email");
    }
    return { delivered: true };
  }

  console.warn(
    `[EMAIL] No RESEND_API_KEY configured — verification code for ${to} (${institutionName}): ${code}`
  );
  if (process.env.NODE_ENV !== "production") {
    return { delivered: false, devCode: code };
  }
  throw new Error("Email provider not configured");
}
