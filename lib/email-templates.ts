// Branded, client-safe HTML for LearnPeers transactional mail.
//
// Hand-built with tables + inline styles — the lowest common denominator that
// renders consistently across Gmail, Apple Mail and Outlook. Deliberately
// image-free: the wordmark is live text styled in the brand colours, so the
// email still looks branded even when a recipient blocks images (the default
// in many clients).
//
// Brand palette (from tailwind.config.js):
//   brand-600 #0077be (azure "Learn"), brand-700 #02628f
//   ink-900   #243036 (charcoal "Peers"), ink-500 #4f636d (body copy)

const BRAND = "#0077be";
const BRAND_DARK = "#02628f";
const BRAND_TINT = "#eff8fd";
const BRAND_TINT_BORDER = "#b4ddf4";
const INK = "#243036";
const INK_BODY = "#4f636d";
const INK_FAINT = "#8a99a1";
const CANVAS = "#f4f7f8";
const BORDER = "#e6ebed";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://learnpeers.com";
const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

type LayoutArgs = {
  preheader: string;
  heading: string;
  body: string; // inner HTML (use the `p()` helper for paragraphs)
  cta?: { label: string; href: string };
  footnote?: string;
};

/** Wraps content in the branded LearnPeers shell (header, card, footer). */
export function layout({ preheader, heading, body, cta, footnote }: LayoutArgs): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light only" />
    <title>${heading}</title>
  </head>
  <body style="margin:0;padding:0;background:${CANVAS};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CANVAS};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid ${BORDER};border-radius:16px;overflow:hidden;">
            <tr><td style="height:4px;line-height:4px;font-size:4px;background:linear-gradient(90deg,${BRAND},${BRAND_DARK});">&nbsp;</td></tr>
            <tr>
              <td align="center" style="padding:30px 32px 6px;">
                <span style="font-family:${FONT};font-size:23px;font-weight:800;letter-spacing:-0.3px;">
                  <span style="color:${BRAND};">Learn</span><span style="color:${INK};">Peers</span>
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 32px 4px;font-family:${FONT};">
                <h1 style="margin:0 0 14px;color:${INK};font-size:21px;font-weight:700;line-height:1.35;">${heading}</h1>
                ${body}
                ${
                  cta
                    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 6px;"><tr><td style="border-radius:10px;background:${BRAND};">
                        <a href="${cta.href}" style="display:inline-block;padding:13px 30px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${cta.label}</a>
                      </td></tr></table>`
                    : ``
                }
                ${
                  footnote
                    ? `<p style="margin:18px 0 0;color:${INK_FAINT};font-size:13px;line-height:1.6;">${footnote}</p>`
                    : ``
                }
              </td>
            </tr>
            <tr>
              <td style="padding:26px 32px 30px;">
                <div style="border-top:1px solid ${BORDER};padding-top:18px;font-family:${FONT};">
                  <p style="margin:0;color:${INK_FAINT};font-size:12px;line-height:1.7;">
                    LearnPeers — learn from peers who actually get it.<br />
                    <a href="${APP_URL}" style="color:${INK_BODY};text-decoration:none;">${APP_URL.replace(/^https?:\/\//, "")}</a>
                  </p>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Body paragraph in the standard muted body style. */
export const p = (text: string) =>
  `<p style="margin:0 0 14px;color:${INK_BODY};font-size:15px;line-height:1.65;">${text}</p>`;

/** Welcome email — sent from hello@ when a new account is created. */
export function welcomeEmailHtml(firstName?: string): string {
  const hi = firstName ? `Hi ${firstName},` : "Hi there,";
  return layout({
    preheader: "Welcome to LearnPeers — you're in. Here's how to get started.",
    heading: "Welcome to LearnPeers 👋",
    body:
      p(hi) +
      p(
        "You're in! LearnPeers connects you with peers who actually get what you're studying — book a session when you're stuck, or earn by tutoring what you already know."
      ) +
      p("Jump in whenever you're ready:"),
    cta: { label: "Open LearnPeers", href: APP_URL },
    footnote:
      "Questions? Just reply to this email — a real person (me) reads every one. — Edouard",
  });
}

/** School-email verification code — sent from noreply@. */
export function verificationEmailHtml(code: string, institutionName: string): string {
  return layout({
    preheader: `${code} is your LearnPeers verification code.`,
    heading: "Verify your school email",
    body:
      p(
        `Enter this code in LearnPeers to confirm you study at <strong style="color:${INK};">${institutionName}</strong>:`
      ) +
      `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0;"><tr><td align="center" style="background:${BRAND_TINT};border:1px solid ${BRAND_TINT_BORDER};border-radius:12px;padding:18px 30px;font-family:${FONT};font-size:34px;font-weight:800;letter-spacing:10px;color:${BRAND};">${code}</td></tr></table>`,
    footnote:
      "This code expires in 15 minutes. If you didn't request it, you can safely ignore this email.",
  });
}
