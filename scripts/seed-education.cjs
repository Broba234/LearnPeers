// Seeds institutions (universities, school boards, curriculum authorities)
// and the course catalogs parsed from data/education_seed.json.
// Run: node scripts/seed-education.cjs
require('dotenv').config({ path: '.env.local', quiet: true });
const { PrismaClient } = require('../prisma/generated');
const data = require('../data/education_seed.json');
const prisma = new PrismaClient();

const UNIVERSITIES = [
  { name: 'University of Toronto', abbreviation: 'UofT', city: 'Toronto', email_domains: ['mail.utoronto.ca', 'utoronto.ca'], website: 'https://www.utoronto.ca' },
  { name: 'University of Waterloo', abbreviation: 'UW', city: 'Waterloo', email_domains: ['uwaterloo.ca'], website: 'https://uwaterloo.ca' },
  { name: 'Western University', abbreviation: 'Western', city: 'London', email_domains: ['uwo.ca'], website: 'https://www.uwo.ca' },
  { name: "Queen's University", abbreviation: "Queen's", city: 'Kingston', email_domains: ['queensu.ca'], website: 'https://www.queensu.ca' },
  { name: 'McMaster University', abbreviation: 'McMaster', city: 'Hamilton', email_domains: ['mcmaster.ca'], website: 'https://www.mcmaster.ca' },
  { name: 'York University', abbreviation: 'York', city: 'Toronto', email_domains: ['my.yorku.ca', 'yorku.ca'], website: 'https://www.yorku.ca' },
  { name: 'Toronto Metropolitan University', abbreviation: 'TMU', city: 'Toronto', email_domains: ['torontomu.ca'], website: 'https://www.torontomu.ca' },
  { name: 'University of Ottawa', abbreviation: 'uOttawa', city: 'Ottawa', email_domains: ['uottawa.ca'], website: 'https://www.uottawa.ca' },
  { name: 'Wilfrid Laurier University', abbreviation: 'Laurier', city: 'Waterloo', email_domains: ['mylaurier.ca', 'wlu.ca'], website: 'https://www.wlu.ca' },
  { name: 'University of Guelph', abbreviation: 'Guelph', city: 'Guelph', email_domains: ['uoguelph.ca'], website: 'https://www.uoguelph.ca' },
  { name: 'Carleton University', abbreviation: 'Carleton', city: 'Ottawa', email_domains: ['cmail.carleton.ca', 'carleton.ca'], website: 'https://carleton.ca' },
  { name: 'Brock University', abbreviation: 'Brock', city: 'St. Catharines', email_domains: ['brocku.ca'], website: 'https://brocku.ca' },
];

const SCHOOL_BOARDS = [
  { name: 'Toronto District School Board', abbreviation: 'TDSB', city: 'Toronto' },
  { name: 'Peel District School Board', abbreviation: 'PDSB', city: 'Mississauga' },
  { name: 'Ottawa-Carleton District School Board', abbreviation: 'OCDSB', city: 'Ottawa' },
  { name: 'Hamilton-Wentworth District School Board', abbreviation: 'HWDSB', city: 'Hamilton' },
];

// Curriculum authorities own the course catalogs in InstitutionCourses
const AUTHORITIES = [
  { key: 'ontario_standard', name: 'Ontario Ministry of Education', abbreviation: 'ON-STD' },
  { key: 'ib', name: 'International Baccalaureate', abbreviation: 'IB' },
  { key: 'ap', name: 'Advanced Placement (College Board)', abbreviation: 'AP' },
];

async function upsertInstitution(fields) {
  const existing = await prisma.institutions.findFirst({ where: { name: fields.name } });
  if (existing) {
    return prisma.institutions.update({ where: { id: existing.id }, data: fields });
  }
  return prisma.institutions.create({ data: fields });
}

async function main() {
  // 1. Remove junk test subjects if unreferenced
  for (const code of ['1234', '2222']) {
    const junk = await prisma.subjects.findFirst({
      where: { code },
      include: { ProfilesOnSubjects: true, InstitutionCourses: true },
    });
    if (junk && junk.ProfilesOnSubjects.length === 0 && junk.InstitutionCourses.length === 0) {
      await prisma.subjects.delete({ where: { id: junk.id } });
      console.log('deleted junk subject', code);
    }
  }

  // 2. Institutions
  const authorityIds = {};
  for (const a of AUTHORITIES) {
    const row = await upsertInstitution({ name: a.name, abbreviation: a.abbreviation, type: 'curriculum', province: a.key === 'ontario_standard' ? 'Ontario' : null, country: 'Canada' });
    authorityIds[a.key] = row.id;
  }
  for (const b of SCHOOL_BOARDS) {
    await upsertInstitution({ ...b, type: 'school_board', province: 'Ontario', country: 'Canada' });
  }
  for (const u of UNIVERSITIES) {
    await upsertInstitution({ ...u, type: 'university', province: 'Ontario', country: 'Canada' });
  }
  console.log('institutions seeded:', await prisma.institutions.count());

  // 3. Subjects + InstitutionCourses per curriculum
  const existingSubjects = await prisma.subjects.findMany({ select: { id: true, code: true } });
  const subjectByCode = new Map(existingSubjects.map(s => [s.code, s.id]));

  let createdSubjects = 0, createdCourses = 0;
  for (const a of AUTHORITIES) {
    const instId = authorityIds[a.key];
    for (const course of data[a.key]) {
      let subjectId = subjectByCode.get(course.code);
      if (!subjectId) {
        const s = await prisma.subjects.create({
          data: { name: course.name, code: course.code, grade: course.grade, category: course.category },
        });
        subjectId = s.id;
        subjectByCode.set(course.code, subjectId);
        createdSubjects++;
      }
      const existing = await prisma.institutionCourses.findUnique({
        where: { institution_id_code: { institution_id: instId, code: course.code } },
      }).catch(() => null);
      if (!existing) {
        await prisma.institutionCourses.create({
          data: { institution_id: instId, subject_id: subjectId, code: course.code, name: course.name },
        });
        createdCourses++;
      }
    }
  }
  console.log({ createdSubjects, createdCourses, totalSubjects: await prisma.subjects.count(), totalCourses: await prisma.institutionCourses.count() });
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
