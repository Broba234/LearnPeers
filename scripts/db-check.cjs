require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('../prisma/generated');
const p = new PrismaClient();
(async () => {
  console.log('Institutions:', await p.institutions.count());
  console.log('InstitutionCourses:', await p.institutionCourses.count());
  console.log('Subjects:', await p.subjects.count());
  console.log('Profiles:', await p.profiles.count());
  const insts = await p.institutions.findMany({ select: { name: true, abbreviation: true, province: true } });
  console.log(JSON.stringify(insts, null, 1));
  await p.$disconnect();
})().catch(e => { console.error('FAIL:', e.message.slice(0, 200)); process.exit(1); });
