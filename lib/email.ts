// Outbound transactional email via Resend.
//
// Two branded senders, two jobs:
//   - noreply@learnpeers.com  → system mail (verification codes, resets). No reply expected.
//   - hello@learnpeers.com    → warm onboarding (welcome). Replies route to your real inbox.
//
// Both are send-only From identities — they need NO mailbox, only domain
// verification in Resend. Your personal inbox (edouard@learnpeers.com, on
// iCloud+) is a separate system and is unaffected by anything here.
//
// When RESEND_API_KEY is unset we log to the server console and, in
// development, hand the code back to the caller so flows stay testable.

import {
  welcomeEmailHtml,
  verificationEmailHtml,
  accountVerificationEmailHtml,
} from "./email-templates";

const NOREPLY_FROM =
  process.env.EMAIL_FROM_NOREPLY || "LearnPeers <noreply@learnpeers.com>";
const HELLO_FROM =
  process.env.EMAIL_FROM_HELLO || "Edouard at LearnPeers <hello@learnpeers.com>";
// Where replies to hello@ should land (your real iCloud inbox).
const REPLY_TO = process.env.EMAIL_REPLY_TO || "edouard@learnpeers.com";

type SendResult = { delivered: boolean; devCode?: string };

type EmailArgs = {
  from: string;
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
};

// Core sender. Returns true on delivery, throws on a real provider failure,
// returns false when no provider is configured (dev fallback handled by callers).
async function sendEmail({ from, to, subject, html, replyTo }: EmailArgs): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[EMAIL] No RESEND_API_KEY — would send "${subject}" to ${to}`);
    return false;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[EMAIL] Resend send failed:", res.status, body);
    throw new Error("Failed to send email");
  }
  return true;
}

// System mail — account-email confirmation code. Sent from noreply@ at signup.
export async function sendAccountVerificationEmail(
  to: string,
  code: string
): Promise<SendResult> {
  const delivered = await sendEmail({
    from: NOREPLY_FROM,
    to,
    subject: `${code} is your LearnPeers confirmation code`,
    html: accountVerificationEmailHtml(code),
  });

  if (delivered) return { delivered: true };
  if (process.env.NODE_ENV !== "production") return { delivered: false, devCode: code };
  throw new Error("Email provider not configured");
}

// System mail — verification code. Sent from noreply@.
export async function sendSchoolVerificationEmail(
  to: string,
  code: string,
  institutionName: string
): Promise<SendResult> {
  const delivered = await sendEmail({
    from: NOREPLY_FROM,
    to,
    subject: `${code} is your LearnPeers verification code`,
    html: verificationEmailHtml(code, institutionName),
  });

  if (delivered) return { delivered: true };
  if (process.env.NODE_ENV !== "production") return { delivered: false, devCode: code };
  throw new Error("Email provider not configured");
}

// Warm onboarding — welcome. Sent from hello@, replies route to your inbox.
export async function sendWelcomeEmail(to: string, firstName?: string): Promise<SendResult> {
  const delivered = await sendEmail({
    from: HELLO_FROM,
    to,
    replyTo: REPLY_TO,
    subject: "Welcome to LearnPeers 👋",
    html: welcomeEmailHtml(firstName),
  });

  if (delivered || process.env.NODE_ENV !== "production") return { delivered };
  throw new Error("Email provider not configured");
}
