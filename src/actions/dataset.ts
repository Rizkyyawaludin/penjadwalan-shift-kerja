"use server";

import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface KaggleDatasetStats {
  totalImported: number;
  byDepartment: {
    ER: number;
    ICU: number;
    Pediatrics: number;
    GeneralMedicine: number;
  };
}

// Array nama depan dan belakang untuk memberikan nama realistis pada ID Kaggle
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

export async function getDatasetStats(): Promise<{ success: boolean; data?: KaggleDatasetStats; error?: string }> {
  try {
    const kaggleEmployees = await prisma.employee.findMany({
      where: {
        kaggleStaffId: {
          not: null,
        },
      },
      select: {
        department: true,
      },
    });

    const stats: KaggleDatasetStats = {
      totalImported: kaggleEmployees.length,
      byDepartment: {
        ER: kaggleEmployees.filter((e) => e.department === "ER").length,
        ICU: kaggleEmployees.filter((e) => e.department === "ICU").length,
        Pediatrics: kaggleEmployees.filter((e) => e.department === "Pediatrics").length,
        GeneralMedicine: kaggleEmployees.filter((e) => e.department === "General Medicine").length,
      },
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error("Gagal mengambil statistik dataset Kaggle:", error);
    return { success: false, error: "Gagal memuat informasi dataset dari database." };
  }
}

export async function importKaggleDataset(targetDepartment?: string, limitPerDept: number = 25): Promise<{ success: boolean; count?: number; message?: string; error?: string }> {
  try {
    const csvPath = path.join(process.cwd(), "data", "kaggle_staff_scheduling.csv");
    if (!fs.existsSync(csvPath)) {
      return { success: false, error: "File CSV dataset Kaggle tidak ditemukan di sistem server (data/kaggle_staff_scheduling.csv)." };
    }

    const fileContent = fs.readFileSync(csvPath, "utf-8");
    const lines = fileContent.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);

    if (lines.length <= 1) {
      return { success: false, error: "File CSV dataset kosong atau tidak valid." };
    }

    // Header: Staff ID,Department,Shift Duration (Hours),Patient Load,Workdays per Month,Satisfaction Score,Overtime Hours,Years of Experience,Previous Satisfaction Rating,Absenteeism (Days)
    const dataLines = lines.slice(1);

    // Filter by department jika ada
    let filteredLines = dataLines;
    if (targetDepartment && targetDepartment !== "ALL") {
      filteredLines = dataLines.filter((line) => {
        const cols = line.split(",");
        return cols[1] === targetDepartment;
      });
    }

    // Ambil sejumlah limit per departemen agar jadwal optimal & stabil
    const deptCounts: Record<string, number> = {};
    const selectedLines: string[] = [];

    for (const line of filteredLines) {
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
      if (cols.length < 10) continue;

      const staffId = cols[0]; // S00000
      const department = cols[1]; // Pediatrics, ER, dll
      const shiftDuration = parseInt(cols[2], 10) || 8;
      const workdaysPerMonth = parseInt(cols[4], 10) || 20;
      const satisfactionScore = parseFloat(cols[5]) || 3.5;
      const experienceYears = parseInt(cols[7], 10) || 5;

      const name = generateRealisticName(staffId, department, i);
      const email = `${staffId.toLowerCase()}@shiftmaster.pro`;
      const role = experienceYears >= 12 ? "MANAGER" : "STAFF";

      await prisma.employee.upsert({
        where: { kaggleStaffId: staffId },
        update: {
          name,
          role,
          department,
          shiftDuration,
          workdaysPerMonth,
          satisfactionScore,
          experienceYears,
        },
        create: {
          name,
          email,
          role,
          department,
          shiftDuration,
          workdaysPerMonth,
          satisfactionScore,
          experienceYears,
          kaggleStaffId: staffId,
        },
      });

      importedCount++;
    }

    revalidatePath("/dashboard/jadwal");
    revalidatePath("/dashboard/karyawan");

    return {
      success: true,
      count: importedCount,
      message: `Berhasil mengimpor dan memperbarui ${importedCount} data staf medis dari dataset Kaggle ke database!`,
    };
  } catch (error) {
    console.error("Gagal mengimpor dataset Kaggle:", error);
    return { success: false, error: "Terjadi kesalahan internal saat memproses data CSV Kaggle." };
  }
}
