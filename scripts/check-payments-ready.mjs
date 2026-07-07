/**
 * Payment-readiness check for the session→payment flow.
 *
 *   node scripts/check-payments-ready.mjs
 *
 * The booking flow charges a card ONLY when three things are true. When any is
 * false, create-session-payment-intent silently falls back to a no-charge
 * booking ("Payment is settled later") — which is why an E2E test can't complete
 * a payment. This prints exactly which precondition is missing.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import Stripe from 'stripe';
import pkg from 'pg';
const { Client } = pkg;

const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const bad = (m) => console.log(`  \x1b[31m✗\x1b[0m ${m}`);
const info = (m) => console.log(`  · ${m}`);

let ready = true;

// 1. A usable Stripe secret key.
const key = process.env.STRIPE_SECRET_KEY || '';
console.log('\nStripe key');
if (!key) { bad('STRIPE_SECRET_KEY is not set'); ready = false; }
else info(`mode: ${key.startsWith('sk_live') ? 'LIVE' : key.startsWith('sk_test') ? 'test' : 'unknown'}`);

const stripe = key ? new Stripe(key) : null;
let keyValid = false;
if (stripe) {
  try { await stripe.balance.retrieve(); keyValid = true; ok('key is valid (Stripe accepted it)'); }
  catch (e) { bad(`key rejected by Stripe: ${e.message}`); ready = false; }
}

// 2. At least one tutor onboarded with transfers active.
console.log('\nTutor Stripe Connect onboarding');
const c = new Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
const tutors = await c.query(
  `SELECT id, name, email, stripe_account_id FROM "Profiles"
   WHERE stripe_account_id IS NOT NULL`);
await c.end();

if (tutors.rows.length === 0) { bad('no profiles have a stripe_account_id'); ready = false; }
let anyChargeable = false;
if (stripe && keyValid) {
  for (const t of tutors.rows) {
    try {
      const a = await stripe.accounts.retrieve(t.stripe_account_id);
      const transfers = a.capabilities?.transfers;
      if (transfers === 'active') { ok(`${t.name} <${t.email}> — transfers ACTIVE (chargeable)`); anyChargeable = true; }
      else bad(`${t.name} <${t.email}> — transfers: ${transfers ?? 'none'} (not chargeable)`);
    } catch (e) {
      bad(`${t.name} <${t.email}> — account not found under this key (${e.message.split('.')[0]})`);
    }
  }
  if (!anyChargeable) ready = false;
} else {
  info(`${tutors.rows.length} tutor(s) have an account id — cannot verify capability without a valid key`);
  ready = false;
}

console.log('\n' + (ready
  ? '\x1b[32mREADY: the booking flow will charge a card.\x1b[0m'
  : '\x1b[31mNOT READY: bookings will fall back to no-charge. Fix the ✗ items above.\x1b[0m') + '\n');
process.exit(ready ? 0 : 1);
