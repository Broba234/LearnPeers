require('dotenv').config({ path: '.env.local', quiet: true });
const { PrismaClient } = require('../prisma/generated');
const p = new PrismaClient();
(async () => {
  console.log('-- profiles.institution_id populated? --');
  console.log(await p.$queryRawUnsafe(`select count(*) filter (where institution_id is not null) as with_inst, count(*) as total from "Profiles"`));

  console.log('\n-- any profile pointing at a curriculum-type institution? --');
  console.log(await p.$queryRawUnsafe(`
    select pr.email, i.name from "Profiles" pr join "Institutions" i on i.id = pr.institution_id where i.type='curriculum'`));

  console.log('\n-- distinct province values on institutions --');
  console.log(await p.$queryRawUnsafe(`select coalesce(province,'(null)') p, count(*)::int from "Institutions" group by 1`));

  console.log('\n-- subjects: code prefix distribution (curriculum inference) --');
  console.log(await p.$queryRawUnsafe(`
    select case when code like 'IB-%' then 'IB' when code like 'AP-%' then 'AP' else 'ON' end as inferred,
           count(*)::int, count(distinct category)::int as cats
    from "Subjects" group by 1 order by 2 desc`));

  console.log('\n-- subjects with null/blank code --');
  console.log(await p.$queryRawUnsafe(`select count(*)::int from "Subjects" where code is null or code=''`));

  console.log('\n-- InstitutionCourses referenced by any ProfilesOnSubjects? --');
  console.log(await p.$queryRawUnsafe(`select count(*)::int as referenced from "ProfilesOnSubjects" where institution_course_id is not null`));

  await p.$disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });
