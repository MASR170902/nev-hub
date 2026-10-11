import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { Role, EventStatus } from "../src/common/enums";

const prisma = new PrismaClient();

async function main() {
  const name = process.env.BOOTSTRAP_ADMIN_NAME || "NEVHub Super Admin";
  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL || "admin@nevhub.local").toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error("BOOTSTRAP_ADMIN_PASSWORD must be set to a unique password with at least 12 characters.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: Role.SUPER_ADMIN, active: true },
    create: { name, email, passwordHash, role: Role.SUPER_ADMIN },
  });

  // Sample published Event
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextWeekEnd = new Date(nextWeek.getTime() + 4 * 60 * 60 * 1000);

  const existingEvent = await prisma.event.findFirst();
  if (!existingEvent) {
    await prisma.event.create({
      data: {
        title: "NEV Bootcamp: Web Development & IoT",
        description: "Pelatihan intensif pengembangan aplikasi web fullstack dan implementasi IoT untuk mahasiswa dan anggota NEV.",
        location: "Lab Komputer 3 & Hybrid Online",
        startsAt: nextWeek,
        endsAt: nextWeekEnd,
        capacity: 50,
        status: EventStatus.PUBLISHED,
        rundown: JSON.stringify([
          { time: "09:00 - 09:30", activity: "Registrasi & Pembukaan" },
          { time: "09:30 - 12:00", activity: "Sesi 1: Dasar Fullstack Web & Database" },
          { time: "12:00 - 13:00", activity: "Istirahat & Networking" },
          { time: "13:00 - 15:00", activity: "Sesi 2: Hands-on Project & Q&A" },
        ]),
      },
    });
  }

  console.log(`Seeding selesai. Super Admin ${email} siap; password tersimpan sebagai hash bcrypt.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
