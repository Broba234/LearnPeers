import { config } from 'dotenv';
config({ path: '.env.local' });
import pkg from 'pg';
const { Client } = pkg;
const c = new Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
const TUTOR = '95f0c742-0f32-484d-bd78-28a208111479';
const SUBJECT = '42c364df-446c-41b6-ae0f-d1b56257b94c';
// One recurring window per weekday, 00:00–23:30, so a slot always exists.
for (let dow = 0; dow <= 6; dow++) {
  const exists = await c.query(
    `SELECT 1 FROM "TutorAvailability" WHERE tutor_id=$1 AND day_of_week=$2 AND start_time='00:00:00'`,
    [TUTOR, dow]);
  if (exists.rowCount) continue;
  await c.query(
    `INSERT INTO "TutorAvailability" (tutor_id, day_of_week, start_time, end_time, timezone, is_active, subject_id)
     VALUES ($1,$2,'00:00:00','23:30:00','America/Toronto',true,$3)`,
    [TUTOR, dow, SUBJECT]);
  console.log('added recurring window for dow', dow);
}
const n = await c.query(`SELECT count(*) FROM "TutorAvailability" WHERE tutor_id=$1`, [TUTOR]);
console.log('total availability rows:', n.rows[0].count);
await c.end();
