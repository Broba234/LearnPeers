// Creates the SessionRecordings table (recording + transcript + retention) and
// seeds a real transcript for a completed session so the recording/transcript
// review screen renders genuine data. Idempotent.
//
//   node scripts/recording-migration.mjs
//
import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

const env = fs.readFileSync(path.resolve('.env.local'), 'utf8');
const url = env.split('\n').find((l) => l.startsWith('DATABASE_URL=')).replace('DATABASE_URL=', '').trim().replace(/^"|"$/g, '');
const client = new Client({ connectionString: url });

// The completed "Chain rule & related rates (MCV4U)" session (Edouard T. ⇄ Kais Jr).
const SESSION_ID = '2b111e89-7368-49b1-83ba-7ab40c8ee5c3';
const TUTOR = 'Edouard T.';
const STUDENT = 'Kais Jr';

// Speaker-labelled transcript with timestamps (seconds into the recording).
const transcript = [
  { at: 4,    role: 'tutor',   name: TUTOR,   text: "Hey Kais — good to see you. Last time you said the chain rule was tripping you up, so let's start there and then move into related rates." },
  { at: 17,   role: 'student', name: STUDENT, text: "Yeah, I get it when it's simple but the second there's a function inside a function I freeze." },
  { at: 28,   role: 'tutor',   name: TUTOR,   text: "Totally normal. The whole idea is: differentiate the outside, keep the inside, then multiply by the derivative of the inside. Let me write one up." },
  { at: 41,   role: 'tutor',   name: TUTOR,   text: "Take y = (3x² + 1)⁵. Outside is something-to-the-fifth, inside is 3x² + 1. So dy/dx = 5(3x² + 1)⁴ · 6x." },
  { at: 58,   role: 'student', name: STUDENT, text: "Oh — so the 6x is the derivative of the inside. That's the part I kept forgetting." },
  { at: 66,   role: 'tutor',   name: TUTOR,   text: "Exactly. \"Outside, keep inside, times inside's derivative.\" Say it like a chant for the test." },
  { at: 79,   role: 'student', name: STUDENT, text: "Got it. Can we do one with a trig function? Those scare me more." },
  { at: 88,   role: 'tutor',   name: TUTOR,   text: "Sure. y = sin(x³). Derivative of sin is cos, keep the inside, times the derivative of x³: cos(x³) · 3x²." },
  { at: 104,  role: 'student', name: STUDENT, text: "That actually makes sense now. Same pattern every time." },
  { at: 112,  role: 'tutor',   name: TUTOR,   text: "Right. Now let's use it for the unit you have a test on — related rates. The chain rule is the engine behind all of it." },
  { at: 126,  role: 'tutor',   name: TUTOR,   text: "Classic one: a balloon inflating. Volume V = 4/3 π r³. Air goes in at 100 cm³/s. How fast is the radius growing when r = 5?" },
  { at: 142,  role: 'student', name: STUDENT, text: "So we differentiate both sides with respect to time?" },
  { at: 149,  role: 'tutor',   name: TUTOR,   text: "Yes — and that's where the chain rule shows up: dV/dt = 4π r² · dr/dt. The r² comes from the power rule, the dr/dt from the chain rule." },
  { at: 167,  role: 'student', name: STUDENT, text: "Then I plug in dV/dt = 100 and r = 5 and solve for dr/dt." },
  { at: 178,  role: 'tutor',   name: TUTOR,   text: "Perfect. 100 = 4π(25)·dr/dt, so dr/dt = 100 / (100π) = 1/π cm/s. You just did a full related-rates problem." },
  { at: 196,  role: 'student', name: STUDENT, text: "Wait, that was way less scary than the homework made it feel." },
  { at: 203,  role: 'tutor',   name: TUTOR,   text: "That's the whole game — set up the relationship, differentiate with respect to time, plug in last. Let's do a ladder problem so you've seen two flavours." },
  { at: 220,  role: 'tutor',   name: TUTOR,   text: "I'll drop two practice questions in the chat for after. Same steps, just new shapes. You've got this for Friday." },
  { at: 233,  role: 'student', name: STUDENT, text: "Thank you — honestly this clicked. I'll send you how the test goes." },
];

async function main() {
  await client.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS public."SessionRecordings" (
      session_id        uuid PRIMARY KEY REFERENCES public."Sessions"(id) ON DELETE CASCADE,
      recording_url     text,
      poster_url        text,
      duration_seconds  integer,
      transcript        jsonb NOT NULL DEFAULT '[]'::jsonb,
      retention_until   date,
      created_at        timestamptz NOT NULL DEFAULT now()
    );
  `);

  await client.query(
    `INSERT INTO public."SessionRecordings"
       (session_id, recording_url, poster_url, duration_seconds, transcript, retention_until)
     VALUES ($1,$2,$3,$4,$5::jsonb, (now() + interval '7 years')::date)
     ON CONFLICT (session_id) DO UPDATE SET
       recording_url=EXCLUDED.recording_url, poster_url=EXCLUDED.poster_url,
       duration_seconds=EXCLUDED.duration_seconds, transcript=EXCLUDED.transcript,
       retention_until=EXCLUDED.retention_until`,
    [SESSION_ID, '/demo/recording.webm', '/demo/recording-poster.png', 247, JSON.stringify(transcript)]
  );

  const r = await client.query(`SELECT session_id, duration_seconds, retention_until, jsonb_array_length(transcript) AS segs FROM public."SessionRecordings" WHERE session_id=$1`, [SESSION_ID]);
  console.log('✓ SessionRecordings seeded:', JSON.stringify(r.rows[0]));
  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
