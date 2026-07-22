import prisma from "./lib/prisma";
import { hashPassword } from "./lib/auth";

const students = [
  { id: "s1", name: "John Doe",       email: "john@codecampus.ng",    track: "Software Engineering",  avatarColor: "#16a34a" },
  { id: "s2", name: "Aisha Bello",    email: "aisha@codecampus.ng",   track: "Data Analytics",        avatarColor: "#059669" },
  { id: "s3", name: "Chinedu Okafor", email: "chinedu@codecampus.ng", track: "Cloud Engineering",     avatarColor: "#15803d" },
  { id: "s4", name: "Fatima Yusuf",   email: "fatima@codecampus.ng",  track: "Software Engineering",  avatarColor: "#22c55e" },
  { id: "s5", name: "Emeka Nwosu",    email: "emeka@codecampus.ng",   track: "Digital Marketing",     avatarColor: "#10b981" },
  { id: "s6", name: "Zara Ibrahim",   email: "zara@codecampus.ng",    track: "Data Analytics",        avatarColor: "#166534" },
  { id: "s7", name: "Tunde Adeyemi",  email: "tunde@codecampus.ng",   track: "Cloud Engineering",     avatarColor: "#4ade80" },
  { id: "s8", name: "Ngozi Eze",      email: "ngozi@codecampus.ng",   track: "Frontend",  avatarColor: "#65a30d" },
];

type Scores = Record<string, number>;
const KEYS = ["attendance","linkedin","project","coding","teamwork","learning","housekeeping"];
const MAXES = [25, 10, 20, 20, 10, 10, 5];

function mkScores(vals: number[]): Scores {
  const s: Scores = {};
  KEYS.forEach((k, i) => (s[k] = Math.min(vals[i] ?? 0, MAXES[i])));
  return s;
}
function sum(s: Scores) { return Object.values(s).reduce((a, b) => a + b, 0); }

const rawEvals: { sid: string; week: number; vals: number[]; notes?: string }[] = [
  { sid: "s1", week: 1, vals: [22,8,18,18,9,10,5], notes: "Strong start." },
  { sid: "s1", week: 2, vals: [24,9,19,20,10,10,5], notes: "Excellent commits." },
  { sid: "s1", week: 3, vals: [20,6,16,15,8,8,4], notes: "Missed one class." },
  { sid: "s1", week: 4, vals: [25,10,20,20,10,10,5], notes: "Perfect week!" },
  { sid: "s2", week: 1, vals: [20,7,15,16,8,8,4] },
  { sid: "s2", week: 2, vals: [22,8,17,18,9,9,5] },
  { sid: "s2", week: 3, vals: [23,9,18,19,9,10,5] },
  { sid: "s2", week: 4, vals: [24,9,19,20,10,10,5] },
  { sid: "s3", week: 1, vals: [18,5,14,14,7,7,3] },
  { sid: "s3", week: 2, vals: [17,6,15,13,7,8,4] },
  { sid: "s3", week: 3, vals: [19,7,16,15,8,8,4] },
  { sid: "s3", week: 4, vals: [20,8,17,17,9,9,5] },
  { sid: "s4", week: 1, vals: [23,9,18,18,9,9,5] },
  { sid: "s4", week: 2, vals: [24,10,19,19,10,10,5] },
  { sid: "s4", week: 3, vals: [22,8,17,18,9,9,5] },
  { sid: "s4", week: 4, vals: [23,9,18,19,9,10,5] },
  { sid: "s5", week: 1, vals: [15,4,12,12,6,6,3] },
  { sid: "s5", week: 2, vals: [14,3,11,10,5,6,2] },
  { sid: "s5", week: 3, vals: [16,5,13,13,6,7,3] },
  { sid: "s5", week: 4, vals: [18,6,14,14,7,8,4] },
  { sid: "s6", week: 3, vals: [21,8,17,17,9,9,5] },
  { sid: "s6", week: 4, vals: [22,9,18,18,9,10,5] },
  { sid: "s7", week: 2, vals: [19,6,15,15,8,8,4] },
  { sid: "s7", week: 3, vals: [20,7,16,16,8,9,4] },
  { sid: "s7", week: 4, vals: [21,8,17,17,9,9,5] },
  { sid: "s8", week: 4, vals: [12,3,10,9,5,5,2], notes: "Needs support." },
];

async function seed() {
  console.log("🌱 Seeding database...");

  await prisma.evaluation.deleteMany();
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();
  await prisma.setting.deleteMany();

  // Seed admin — credentials from env vars
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@codecampus.ng";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin@1234";
  const adminHash = await hashPassword(adminPassword);
  await prisma.user.create({
    data: {
      name: "Admin",
      email: adminEmail,
      passwordHash: adminHash,
      role: "ADMIN",
    },
  });
  console.log(`✅ Created admin user (${adminEmail})`);
  console.log(`   Password: ${adminPassword} — change this immediately in production!`);

  // Seed default settings
  const defaultTrackWeeks: Record<string, number> = {
    "Software Engineering": 4,
    "Data Analytics": 4,
    "Cloud Engineering": 4,
    "Digital Marketing": 4,
    "Cybersecurity Engineering": 4,
    "Artificial Intelligence (AI)": 4,
    "Blockchain Engineering": 4,
    "Project Management": 4,
    "Product Design": 4,
    "Product Management": 4,
  };
  await prisma.setting.createMany({
    data: [
      { key: "grade_excellent", value: "85" },
      { key: "grade_good", value: "70" },
      { key: "grade_needs", value: "50" },
      { key: "total_weeks", value: "16" },
      { key: "track_weeks", value: JSON.stringify(defaultTrackWeeks) },
      { key: "cohort_name", value: "Cohort 1" },
      { key: "cohort_start_date", value: "" },
    ],
  });
  console.log("✅ Created default settings");

  await prisma.student.createMany({ data: students });
  console.log(`✅ Created ${students.length} students`);

  let count = 0;
  for (const e of rawEvals) {
    const scores = mkScores(e.vals);
    await prisma.evaluation.create({
      data: {
        id: `e_${e.sid}_w${e.week}`,
        studentId: e.sid,
        week: e.week,
        evaluator: "Mentor Sarah",
        scores,
        total: sum(scores),
        notes: e.notes ?? "",
      },
    });
    count++;
  }
  console.log(`✅ Created ${count} evaluations`);
  console.log("🎉 Seed complete");
}

seed()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
