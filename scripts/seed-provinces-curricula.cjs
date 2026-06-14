// Seeds Provinces, Curricula, Ontario school boards, and re-scopes course codes
// under their curriculum — from data/education_seed.json (parsed from the data
// scientist's Ontario_School_Codes_Navigator xlsx). Idempotent.
// Run: node scripts/seed-provinces-curricula.cjs
require('dotenv').config({ path: '.env.local', quiet: true });
const { PrismaClient } = require('../prisma/generated');
const data = require('../data/education_seed.json');
const prisma = new PrismaClient();

async function main() {
  // 1. Provinces
  const provinceByCode = {};
  for (const p of data.provinces) {
    const row = await prisma.provinces.upsert({
      where: { code: p.code },
      create: { code: p.code, name: p.name, is_territory: p.is_territory },
      update: { name: p.name, is_territory: p.is_territory },
    });
    provinceByCode[p.code] = row.id;
  }
  console.log('provinces:', Object.keys(provinceByCode).length);

  // 2. Backfill Institutions.province_id from legacy text + remove fake curriculum institutions
  await prisma.institutions.updateMany({
    where: { province: 'Ontario' },
    data: { province_id: provinceByCode['ON'] },
  });
  // The 3 "curriculum" institution rows are replaced by Curricula — drop them and
  // their now-redundant InstitutionCourses (verified: 0 profile references).
  const curriculumInsts = await prisma.institutions.findMany({ where: { type: 'curriculum' }, select: { id: true } });
  if (curriculumInsts.length) {
    const ids = curriculumInsts.map((i) => i.id);
    await prisma.institutionCourses.deleteMany({ where: { institution_id: { in: ids } } });
    await prisma.institutions.deleteMany({ where: { id: { in: ids } } });
    console.log('removed legacy curriculum institutions:', ids.length);
  }

  // 3. Curricula (provincial_secondary + global ib/ap)
  const curriculumByKey = {};
  for (const c of data.curricula) {
    const provinceId = c.province ? provinceByCode[c.province] : null;
    // Match on (kind, province) for provincial; (kind) for global
    let existing = await prisma.curricula.findFirst({
      where: { kind: c.kind, province_id: provinceId, institution_id: null },
    });
    const row = existing
      ? await prisma.curricula.update({ where: { id: existing.id }, data: { name: c.name } })
      : await prisma.curricula.create({ data: { name: c.name, kind: c.kind, province_id: provinceId } });
    curriculumByKey[c.key] = row.id;
  }
  console.log('curricula:', Object.keys(curriculumByKey).length);

  // 4. University curricula — one per university (institution-specific catalogs)
  const universities = await prisma.institutions.findMany({ where: { type: 'university' }, select: { id: true, name: true } });
  for (const u of universities) {
    const existing = await prisma.curricula.findFirst({ where: { institution_id: u.id } });
    if (!existing) {
      await prisma.curricula.create({ data: { name: `${u.name} Courses`, kind: 'university', institution_id: u.id } });
    }
  }
  console.log('university curricula ensured:', universities.length);

  // 5. Ontario school boards (institutions of type school_board, linked to ON)
  for (const b of data.ontario_boards) {
    const existing = await prisma.institutions.findFirst({ where: { name: b.name } });
    const fields = { abbreviation: b.abbreviation, type: 'school_board', province: 'Ontario', province_id: provinceByCode['ON'], country: 'Canada' };
    if (existing) await prisma.institutions.update({ where: { id: existing.id }, data: fields });
    else await prisma.institutions.create({ data: { name: b.name, ...fields } });
  }
  console.log('ontario boards ensured:', data.ontario_boards.length);

  // 6. Courses → Subjects scoped to their curriculum (upsert by code, set curriculum_id)
  let created = 0, rescoped = 0;
  for (const [key, list] of Object.entries(data.courses)) {
    const curriculumId = curriculumByKey[key];
    for (const course of list) {
      const existing = await prisma.subjects.findFirst({ where: { code: course.code } });
      if (existing) {
        await prisma.subjects.update({
          where: { id: existing.id },
          data: { curriculum_id: curriculumId, name: course.name, grade: course.grade, category: course.category },
        });
        rescoped++;
      } else {
        await prisma.subjects.create({
          data: { name: course.name, code: course.code, grade: course.grade, category: course.category, curriculum_id: curriculumId },
        });
        created++;
      }
    }
  }
  console.log({ created, rescoped });

  // 7. Integrity report
  const orphanSubjects = await prisma.subjects.count({ where: { curriculum_id: null } });
  console.log('subjects without curriculum (orphans):', orphanSubjects);
  console.log('totals:', {
    provinces: await prisma.provinces.count(),
    curricula: await prisma.curricula.count(),
    institutions: await prisma.institutions.count(),
    subjects: await prisma.subjects.count(),
  });
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
