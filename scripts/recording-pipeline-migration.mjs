// Adds the columns the live recording pipeline needs to correlate a LiveKit
// Egress job with its SessionRecordings row and surface processing state.
// Idempotent.
//
//   node scripts/recording-pipeline-migration.mjs
//
import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

const env = fs.readFileSync(path.resolve('.env.local'), 'utf8');
const url = env.split('\n').find((l) => l.startsWith('DATABASE_URL=')).replace('DATABASE_URL=', '').trim().replace(/^"|"$/g, '');
const client = new Client({ connectionString: url });

async function main() {
  await client.connect();
  await client.query(`
    ALTER TABLE public."SessionRecordings"
      ADD COLUMN IF NOT EXISTS egress_id          text,
      ADD COLUMN IF NOT EXISTS status             text NOT NULL DEFAULT 'ready',
      ADD COLUMN IF NOT EXISTS recording_started_at timestamptz,
      ADD COLUMN IF NOT EXISTS error              text;
  `);
  // status lifecycle: recording → processing → transcribing → ready | failed
  await client.query(`CREATE INDEX IF NOT EXISTS "SessionRecordings_egress_id_idx" ON public."SessionRecordings"(egress_id);`);
  const r = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='SessionRecordings' ORDER BY ordinal_position`);
  console.log('✓ SessionRecordings columns:', r.rows.map((x) => x.column_name).join(', '));
  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
