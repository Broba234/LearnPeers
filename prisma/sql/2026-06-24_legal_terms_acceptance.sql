-- Legal documents (Terms of Service, Privacy Policy, …) + a permanent,
-- auditable record of every user's acceptance.
--
-- Powers two things:
--   1. The login-time "sign the terms" gate (every user must accept the current
--      published Terms of Service before using the app).
--   2. The admin "publish updated terms" flow. Each publish creates a new
--      immutable version; users are re-prompted to re-sign unless the version is
--      flagged to grandfather existing acceptances.
--
-- Acceptance rows are never updated or deleted by the app — they are the record
-- of who agreed to what, when, and from where (IP + user-agent captured).

-- ── Versioned documents ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "public"."LegalDocuments" (
  "id"                    uuid        NOT NULL DEFAULT gen_random_uuid(),
  "type"                  text        NOT NULL,                 -- 'terms_of_service' | 'privacy_policy' | …
  "version"               integer     NOT NULL,                 -- monotonic per type, starting at 1
  "title"                 text        NOT NULL,
  "content"              text         NOT NULL,                 -- HTML body, authored by the owner
  "summary"               text,                                 -- "what changed" note for this version
  "requires_acceptance"   boolean     NOT NULL DEFAULT true,    -- gate users on this doc type?
  "requires_reacceptance" boolean     NOT NULL DEFAULT true,    -- publishing forces re-sign (false = grandfather)
  "status"                text        NOT NULL DEFAULT 'draft', -- 'draft' | 'published' | 'archived'
  "effective_date"        timestamptz,
  "published_at"          timestamptz,
  "created_by"            uuid,                                 -- admin profile id
  "created_at"            timestamptz NOT NULL DEFAULT now(),
  "updated_at"            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "LegalDocuments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LegalDocuments_type_version_key" UNIQUE ("type", "version")
);

CREATE INDEX IF NOT EXISTS "LegalDocuments_type_status_idx"
  ON "public"."LegalDocuments" ("type", "status");

-- ── Acceptance records (immutable audit log) ───────────────────────────────
CREATE TABLE IF NOT EXISTS "public"."LegalAcceptances" (
  "id"               uuid        NOT NULL DEFAULT gen_random_uuid(),
  "profile_id"       uuid        NOT NULL,
  "document_id"      uuid        NOT NULL,
  "document_type"    text        NOT NULL,
  "document_version" integer     NOT NULL,
  "accepted_at"      timestamptz NOT NULL DEFAULT now(),
  "ip_address"       text,
  "user_agent"       text,
  "method"           text,                                      -- 'login_gate' | 'signup' | 'reaccept'
  CONSTRAINT "LegalAcceptances_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LegalAcceptances_profile_document_key" UNIQUE ("profile_id", "document_id"),
  CONSTRAINT "LegalAcceptances_profile_fkey" FOREIGN KEY ("profile_id")
    REFERENCES "public"."Profiles" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "LegalAcceptances_document_fkey" FOREIGN KEY ("document_id")
    REFERENCES "public"."LegalDocuments" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "LegalAcceptances_profile_idx"
  ON "public"."LegalAcceptances" ("profile_id");
CREATE INDEX IF NOT EXISTS "LegalAcceptances_document_idx"
  ON "public"."LegalAcceptances" ("document_id");

-- ── Seed v1: Terms of Service (published, acceptance required) ──────────────
INSERT INTO "public"."LegalDocuments"
  ("type", "version", "title", "summary", "status", "requires_acceptance", "requires_reacceptance", "effective_date", "published_at", "content")
SELECT
  'terms_of_service', 1, 'LearnPeers Terms of Service',
  'Initial Terms of Service.', 'published', true, true, now(), now(),
$doc$
<p class="legal-meta">These Terms of Service ("Terms") govern your access to and use of the LearnPeers platform, websites, and applications (collectively, the "Service"). Please read them carefully. <strong>By creating an account, signing in, or otherwise using the Service, you agree to be bound by these Terms.</strong> If you do not agree, do not use the Service.</p>

<h2>1. Who We Are</h2>
<p>LearnPeers ("LearnPeers", "we", "us", or "our") operates an online marketplace that connects students seeking academic help with peer tutors who offer it. LearnPeers provides the technology that lets users find one another, schedule sessions, communicate, hold live video sessions, and process payments. <strong>LearnPeers is a neutral venue and technology provider. We are not a school, tutoring agency, employer, or educational institution, and we are not a party to the agreements, sessions, or interactions that take place between students and tutors.</strong></p>

<h2>2. Eligibility &amp; Accounts</h2>
<ul>
<li>You must be at least 13 years old to use the Service. If you are under the age of majority where you live, you may only use the Service with the involvement and consent of a parent or legal guardian, who agrees to be bound by these Terms on your behalf.</li>
<li>You agree to provide accurate, current, and complete information and to keep it up to date.</li>
<li>You are responsible for safeguarding your login credentials and for all activity that occurs under your account. Notify us immediately of any unauthorized use.</li>
<li>You may not impersonate any person, misrepresent your identity, qualifications, or affiliation, or create an account on behalf of someone else without authorization.</li>
</ul>

<h2>3. The Marketplace &amp; Independent Tutors</h2>
<p>Tutors on LearnPeers are independent individuals. They are <strong>not</strong> employees, agents, partners, or representatives of LearnPeers, and we do not direct, supervise, control, or guarantee any tutor's work, qualifications, conduct, or availability.</p>
<ul>
<li>Listings, credentials, ratings, and other information are provided by users. We do not independently verify, endorse, or guarantee the accuracy of any user-provided information, including a tutor's identity, education, or expertise, except where we expressly state that a specific verification has been performed.</li>
<li>We do not conduct background checks on users unless expressly stated. You are solely responsible for your decisions about whom to interact with and for evaluating the suitability of any tutor or student.</li>
<li>We make no guarantee regarding academic results, grades, outcomes, or the quality, safety, or legality of any session. Tutoring is supplemental academic assistance and is not a substitute for a student's own work, coursework, or examinations.</li>
</ul>

<h2>4. Sessions, Conduct &amp; Safety</h2>
<p>Sessions may take place over live video, audio, shared whiteboards, chat, and screen sharing. You agree that, during any session and in any communication on the Service, you will:</p>
<ul>
<li>treat others with respect and behave lawfully, honestly, and professionally;</li>
<li>not harass, threaten, defraud, exploit, or endanger any other person;</li>
<li>not share content that is unlawful, harmful, hateful, sexually explicit, or that infringes another's rights;</li>
<li>not use the Service to facilitate academic dishonesty in violation of an institution's policies, or to complete work that a student is required to do independently;</li>
<li>not solicit or arrange to take payments, contact, or sessions off-platform to circumvent fees, safety features, or these Terms.</li>
</ul>
<p><strong>You are solely responsible for your own conduct and for the consequences of your interactions with other users.</strong> We do not monitor or supervise sessions in real time and are not responsible for the acts or omissions of any user. If you feel unsafe, end the session and contact us and, where appropriate, local authorities.</p>

<h2>5. Recordings</h2>
<p>Sessions may be recorded, transcribed, and stored to support quality, safety, dispute resolution, and the features of the Service. By participating in a session you consent to such recording and processing where it occurs. You must not separately record, reproduce, or distribute a session or another user's likeness, voice, or content without that user's consent and except as permitted by law. Recordings are handled in accordance with our Privacy Policy.</p>

<h2>6. Payments, Fees &amp; Refunds</h2>
<ul>
<li>Payments are processed by our third-party payment provider, Stripe. By making or receiving payments you agree to Stripe's applicable terms. We do not store full card details.</li>
<li>Students authorize charges for the sessions they book, including applicable platform fees and taxes. Tutors receive payouts, less the LearnPeers platform fee, through Stripe Connect.</li>
<li>Prices, platform fees, and payout terms are shown in the Service and may change prospectively. Tutors are solely responsible for setting lawful prices and for all taxes on their earnings.</li>
<li>Refunds, cancellations, and disputes are handled according to the policies presented in the Service at the time of booking. Except as required by law or expressly stated, payments are non-refundable once a session has occurred.</li>
<li>You agree not to initiate fraudulent chargebacks. We may suspend accounts and withhold payouts in connection with suspected fraud, abuse, or violations of these Terms.</li>
</ul>

<h2>7. Tutor Terms</h2>
<p>If you offer tutoring, you additionally represent and agree that: you are an independent contractor solely responsible for your own taxes, licenses, and legal compliance; the qualifications and information you publish are truthful; you will deliver sessions competently and lawfully; and you are responsible for your own equipment, environment, and conduct. LearnPeers does not guarantee any volume of bookings or earnings.</p>

<h2>8. Intellectual Property &amp; User Content</h2>
<p>The Service, including its software, design, and trademarks, is owned by LearnPeers and protected by law. You retain ownership of content you create and submit ("User Content"). You grant LearnPeers a worldwide, non-exclusive, royalty-free license to host, store, reproduce, and display User Content as necessary to operate, secure, and improve the Service. You are responsible for ensuring you have the rights to any content you share, and you must not infringe the intellectual-property or privacy rights of others.</p>

<h2>9. Third-Party Services</h2>
<p>The Service relies on third-party providers, including Stripe (payments), LiveKit (real-time audio/video and recording), and Supabase (authentication and data hosting). Your use of features provided through them may be subject to their terms, and we are not responsible for the acts, omissions, or availability of third parties.</p>

<h2>10. Disclaimers</h2>
<p><strong>THE SERVICE AND ALL SESSIONS, CONTENT, AND INTERACTIONS ARE PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING ANY IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, ACCURACY, OR UNINTERRUPTED OR ERROR-FREE OPERATION.</strong></p>
<p>LearnPeers does not warrant or guarantee the qualifications, conduct, identity, or reliability of any user; the accuracy, quality, or value of any session, advice, or content; or any educational, academic, or other outcome. Tutoring provided through the Service is not professional, medical, legal, financial, psychological, or other licensed advice. You use the Service and engage with other users at your own risk.</p>

<h2>11. Assumption of Risk &amp; Release</h2>
<p>You understand that interacting with other users, online or in person, carries inherent risks, and that LearnPeers does not screen, supervise, or control users or sessions. <strong>To the fullest extent permitted by law, you knowingly and voluntarily assume all risks arising out of or relating to your use of the Service and your interactions with other users, including anything that occurs during, before, or after a session.</strong></p>
<p><strong>You release, waive, and discharge LearnPeers and its officers, directors, employees, and agents from any and all claims, demands, damages, losses, liabilities, and causes of action, known or unknown, arising out of or relating to: (a) the conduct, acts, or omissions of any user; (b) the content, accuracy, safety, or outcome of any session; (c) any dispute between users; and (d) any injury, loss, or damage of any kind resulting from your use of the Service or your interactions with other users.</strong> If you are in a jurisdiction that does not permit the release of unknown claims, you waive the benefit of any law to that effect to the maximum extent permitted.</p>

<h2>12. Limitation of Liability</h2>
<p><strong>TO THE FULLEST EXTENT PERMITTED BY LAW, LEARNPEERS AND ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF PROFITS, DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR RELATING TO THE SERVICE OR ANY SESSION OR INTERACTION, WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), STATUTE, OR ANY OTHER LEGAL THEORY, AND WHETHER OR NOT WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.</strong></p>
<p><strong>TO THE FULLEST EXTENT PERMITTED BY LAW, OUR TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THE SERVICE WILL NOT EXCEED THE GREATER OF (A) THE TOTAL PLATFORM FEES YOU PAID TO LEARNPEERS IN THE THREE (3) MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM, OR (B) ONE HUNDRED CANADIAN DOLLARS (CAD $100).</strong> Some jurisdictions do not allow certain limitations, so some of the above may not apply to you; in that case our liability is limited to the maximum extent permitted by law.</p>

<h2>13. Indemnification</h2>
<p>To the fullest extent permitted by law, you agree to indemnify, defend, and hold harmless LearnPeers and its affiliates, officers, directors, employees, and agents from and against any claims, damages, losses, liabilities, costs, and expenses (including reasonable legal fees) arising out of or relating to your use of the Service, your User Content, your conduct in or relating to any session, your violation of these Terms, or your violation of any law or the rights of any third party.</p>

<h2>14. Suspension &amp; Termination</h2>
<p>We may suspend or terminate your access to the Service at any time, with or without notice, if we believe you have violated these Terms or to protect the Service or other users. You may stop using the Service at any time. Provisions that by their nature should survive termination (including Sections 10–13 and 15) will survive.</p>

<h2>15. Dispute Resolution &amp; Governing Law</h2>
<p>These Terms are governed by the laws of the Province of Ontario and the federal laws of Canada applicable therein, without regard to conflict-of-laws rules. You agree that any dispute will be resolved on an individual basis and you waive any right to participate in a class, collective, or representative action to the extent permitted by law. The courts located in Ontario, Canada will have jurisdiction, except where applicable law gives you the right to bring a claim in your local courts.</p>

<h2>16. Changes to These Terms</h2>
<p>We may update these Terms from time to time. When we do, we will post the updated version and update the effective date. <strong>For material changes, we will require you to review and accept the updated Terms before you continue using the Service.</strong> Your continued use of the Service after updated Terms take effect constitutes acceptance of them.</p>

<h2>17. General</h2>
<p>These Terms, together with the Privacy Policy and any policies referenced in the Service, are the entire agreement between you and LearnPeers regarding the Service. If any provision is found unenforceable, the remaining provisions remain in effect. Our failure to enforce a provision is not a waiver. You may not assign these Terms without our consent; we may assign them in connection with a merger, acquisition, or sale of assets.</p>

<h2>18. Contact</h2>
<p>Questions about these Terms can be sent to <a href="mailto:hello@learnpeers.com">hello@learnpeers.com</a>.</p>
$doc$
WHERE NOT EXISTS (
  SELECT 1 FROM "public"."LegalDocuments" WHERE "type" = 'terms_of_service'
);

-- ── Seed v1: Privacy Policy (published, informational — referenced by the ToS) ──
INSERT INTO "public"."LegalDocuments"
  ("type", "version", "title", "summary", "status", "requires_acceptance", "requires_reacceptance", "effective_date", "published_at", "content")
SELECT
  'privacy_policy', 1, 'LearnPeers Privacy Policy',
  'Initial Privacy Policy.', 'published', false, false, now(), now(),
$doc$
<p class="legal-meta">This Privacy Policy explains what information LearnPeers ("we", "us") collects, how we use it, and the choices you have. It forms part of, and should be read together with, our Terms of Service.</p>

<h2>1. Information We Collect</h2>
<ul>
<li><strong>Account &amp; profile information:</strong> name, email, role (student or tutor), and the profile details you provide, such as bio, education, subjects, availability, and rates.</li>
<li><strong>Session information:</strong> bookings, schedules, messages, whiteboard and shared content, and, where applicable, audio/video recordings and transcripts of live sessions.</li>
<li><strong>Payment information:</strong> processed by Stripe. We receive limited details such as payment status and payout records, but we do not store full card numbers.</li>
<li><strong>Usage &amp; device information:</strong> log data, device and browser information, IP address, and how you interact with the Service, including records of your acceptance of our legal agreements.</li>
<li><strong>Communications:</strong> messages you send to us or to other users through the Service.</li>
</ul>

<h2>2. How We Use Information</h2>
<ul>
<li>to provide, operate, secure, and improve the Service;</li>
<li>to connect students and tutors, schedule and run sessions, and process payments and payouts;</li>
<li>to maintain safety and integrity, prevent fraud and abuse, and enforce our Terms;</li>
<li>to keep records of agreements and consents (including legal-acceptance records);</li>
<li>to communicate with you about your account, sessions, and updates;</li>
<li>to comply with legal obligations and respond to lawful requests.</li>
</ul>

<h2>3. How We Share Information</h2>
<ul>
<li><strong>With other users:</strong> students and tutors see the profile and session information necessary to connect and hold sessions.</li>
<li><strong>With service providers:</strong> including Stripe (payments), LiveKit (real-time audio/video and recording), and Supabase (authentication and data hosting), who process information on our behalf.</li>
<li><strong>For legal reasons:</strong> when required by law, to protect rights and safety, or in connection with a corporate transaction such as a merger or sale.</li>
</ul>
<p>We do not sell your personal information.</p>

<h2>4. Recordings</h2>
<p>Where sessions are recorded or transcribed, we use those recordings to operate the Service and to support quality, safety, and dispute resolution. Access is limited and recordings are retained as described below.</p>

<h2>5. Data Retention</h2>
<p>We retain information for as long as your account is active and as needed to provide the Service, comply with legal obligations, resolve disputes, and enforce our agreements. Legal-acceptance records are retained as long as necessary to evidence your agreement.</p>

<h2>6. Security</h2>
<p>We use reasonable technical and organizational measures to protect information. No method of transmission or storage is completely secure, and we cannot guarantee absolute security.</p>

<h2>7. Your Choices &amp; Rights</h2>
<p>Depending on where you live, you may have rights to access, correct, delete, or export your personal information, or to object to certain processing. You can manage much of your information in your profile settings, and you can contact us to exercise applicable rights.</p>

<h2>8. Children</h2>
<p>The Service is not directed to children under 13. Where minors use the Service, it must be with the involvement and consent of a parent or guardian as described in our Terms.</p>

<h2>9. International Transfers</h2>
<p>Your information may be processed and stored in countries other than your own, including by our service providers. We take steps to ensure appropriate protection for such transfers where required.</p>

<h2>10. Changes</h2>
<p>We may update this Privacy Policy from time to time. We will post the updated version and update the effective date.</p>

<h2>11. Contact</h2>
<p>Questions about privacy can be sent to <a href="mailto:hello@learnpeers.com">hello@learnpeers.com</a>.</p>
$doc$
WHERE NOT EXISTS (
  SELECT 1 FROM "public"."LegalDocuments" WHERE "type" = 'privacy_policy'
);
