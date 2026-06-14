require('dotenv').config({ path: '.env.local', quiet: true });
const { PrismaClient } = require('../prisma/generated');
const p = new PrismaClient();
(async () => {
  const counts = {
    Profiles: await p.profiles.count(),
    Institutions: await p.institutions.count(),
    InstitutionCourses: await p.institutionCourses.count(),
    Subjects: await p.subjects.count(),
    ProfilesOnSubjects: await p.profilesOnSubjects.count(),
    ProfileInstitutions: await p.profileInstitutions.count(),
    TutorAvailability: await p.tutorAvailability.count(),
  };
  console.log('COUNTS', JSON.stringify(counts, null, 1));

  console.log('\n-- Institutions by type --');
  const byType = await p.$queryRawUnsafe(`select type, count(*)::int from "Institutions" group by type order by 2 desc`);
  console.log(byType);

  console.log('\n-- InstitutionCourses per institution --');
  const perInst = await p.$queryRawUnsafe(`
    select i.name, i.type, count(ic.id)::int as courses
    from "Institutions" i left join "InstitutionCourses" ic on ic.institution_id = i.id
    group by i.id, i.name, i.type order by courses desc limit 20`);
  console.log(perInst);

  console.log('\n-- Subjects: distinct codes, dupes --');
  const dupes = await p.$queryRawUnsafe(`
    select code, count(*)::int from "Subjects" group by code having count(*) > 1 order by 2 desc limit 20`);
  console.log('duplicate codes:', dupes);

  console.log('\n-- ProfilesOnSubjects sample (does it carry institution_course_id?) --');
  const pos = await p.$queryRawUnsafe(`select profile_id, subject_id, institution_course_id, price_1 from "ProfilesOnSubjects" limit 10`);
  console.log(pos);

  console.log('\n-- Profiles: institution_id populated? --');
  const profInst = await p.$queryRawUnsafe(`select count(*)::int filter (where institution_id is not null) as with_inst, count(*)::int as total from "Profiles"`);
  console.log(profInst);

  await p.$disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });
