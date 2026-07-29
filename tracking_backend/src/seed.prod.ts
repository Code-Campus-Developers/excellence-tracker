/**
 * Production seed — safe to run multiple times.
 * Only creates admin + default settings if they don't already exist.
 * NEVER deletes existing data.
 */
import prisma from "./lib/prisma";
import { hashPassword } from "./lib/auth";

const TRACKS = [
  "Software Engineering", "Data Analytics", "Cloud Engineering",
  "Digital Marketing", "Cybersecurity Engineering", "Artificial Intelligence (AI)",
  "Blockchain Engineering", "Project Management", "Product Design", "Product Management",
];

async function seedProd() {
  console.log("🌱 Running production seed...");

  // --- Admin account ---
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error("❌ ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env");
    process.exit(1);
  }

  const existingAdmin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (existingAdmin) {
    console.log(`✅ Admin already exists (${existingAdmin.email}) — skipping`);
  } else {
    const passwordHash = await hashPassword(adminPassword);
    await prisma.user.create({
      data: {
        name: "Admin",
        email: adminEmail,
        passwordHash,
        role: "ADMIN",
      },
    });
    console.log(`✅ Created admin user (${adminEmail})`);
  }

  // --- Default settings (only if not already set) ---
  const existingSettings = await prisma.setting.count();
  if (existingSettings > 0) {
    console.log("✅ Settings already exist — skipping");
  } else {
    const defaultTrackWeeks: Record<string, number> = {};
    TRACKS.forEach((t: string) => (defaultTrackWeeks[t] = 1));

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
  }

  console.log("🎉 Production seed complete — no existing data was modified");
}

seedProd()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
