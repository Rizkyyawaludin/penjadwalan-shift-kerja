import fs from "fs";
import path from "path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import * as dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const FIRST_NAMES = [
  "Rizki", "Anisa", "Budi", "Citra", "Dedi", "Eka", "Fajar", "Gita", "Hadi", "Indah",
  "Joko", "Kartika", "Lukman", "Maya", "Naufal", "Olivia", "Pratama", "Qori", "Rina", "Surya",
  "Tari", "Utami", "Vina", "Wahyu", "Yudi", "Zahra", "Aditya", "Bayu", "Clarissa", "Dimas"
];

const LAST_NAMES = [
  "Santoso", "Pratama", "Wijaya", "Kusuma", "Saputra", "Lestari", "Hidayat", "Nugroho", "Wulandari", "Setiawan",
  "Purnama", "Siregar", "Nasution", "Halim", "Susanto", "Hartono", "Mulyadi", "Gunawan", "Ramadhan", "Handayani"
];

function generateRealisticName(id: string, department: string, index: number): string {
  const first = FIRST_NAMES[(index + id.charCodeAt(id.length - 1)) % FIRST_NAMES.length];
  const last = LAST_NAMES[(index + id.charCodeAt(id.length - 2)) % LAST_NAMES.length];
  const prefix = department === "General Medicine" || department === "Pediatrics" ? "Dr." : "Ns.";
  return `${prefix} ${first} ${last} (${id})`;
}

async function runImport() {
  try {
    const limitPerDept = 26;
    const csvPath = path.join(process.cwd(), "data", "kaggle_staff_scheduling.csv");
    if (!fs.existsSync(csvPath)) {
      console.error("File CSV tidak ditemukan");
      return;
    }

    const fileContent = fs.readFileSync(csvPath, "utf-8");
    const lines = fileContent.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
    const dataLines = lines.slice(1);

    const deptCounts: Record<string, number> = {};
    const selectedLines: string[] = [];

    for (const line of dataLines) {
      const cols = line.split(",");
      const dept = cols[1];
      if (!deptCounts[dept]) deptCounts[dept] = 0;

      if (deptCounts[dept] < limitPerDept) {
        selectedLines.push(line);
        deptCounts[dept]++;
      }
    }

    let importedCount = 0;

    for (let i = 0; i < selectedLines.length; i++) {
      const cols = selectedLines[i].split(",");
      if (cols.length < 6) continue;

      const staffId = cols[0];
      const department = cols[1];
      const shiftDuration = parseInt(cols[2], 10) || 8;
      const workdaysPerMonth = parseInt(cols[3], 10) || 20;
      const satisfactionScore = parseFloat(cols[4]) || 3.5;
      const experienceYears = parseInt(cols[5], 10) || 5;

      const name = generateRealisticName(staffId, department, i);
      const email = `${staffId.toLowerCase()}@shiftmaster.pro`;
      const role = experienceYears >= 10 ? "Senior Perawat" : "Perawat";

      await (prisma as any).employee.upsert({
        where: { kaggleStaffId: staffId },
        update: {
          name, role, department, shiftDuration, workdaysPerMonth, satisfactionScore, experienceYears,
        },
        create: {
          name, email, role, department, shiftDuration, workdaysPerMonth, satisfactionScore, experienceYears, kaggleStaffId: staffId,
        },
      });

      importedCount++;
    }

    console.log(`Berhasil import ${importedCount} karyawan.`);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

runImport();
