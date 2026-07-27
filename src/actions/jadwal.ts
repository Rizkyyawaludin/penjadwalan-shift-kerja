"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { 
  ShiftGeneticOptimizer, 
  ShiftSlot, 
  StaffMember, 
  GAOptimizationResult 
} from "@/lib/ga/shiftOptimizer";

export interface GenerateScheduleParams {
  department: string;
  startDate: string; // YYYY-MM-DD
  daysCount: number; // 7, 14, or 30 days
  selectedShiftTypes: string[]; // ["Shift Pagi", "Shift Siang", "Shift Malam"]
}

export async function getSchedules(departmentFilter?: string) {
  try {
    const whereClause: any = {};
    if (departmentFilter && departmentFilter !== "ALL") {
      whereClause.employee = {
        department: departmentFilter,
      };
    }

    const shifts = await prisma.shift.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            role: true,
            department: true,
            experienceYears: true,
            kaggleStaffId: true,
          },
        },
      },
      orderBy: {
        startTime: "asc",
      },
      take: 500, // batasi tampilan 500 shift agar UI tetap ringan
    });

    return { success: true, data: shifts };
  } catch (error) {
    console.error("Gagal mengambil data jadwal dari database:", error);
    return { success: false, error: "Gagal memuat jadwal shift dari database.", data: [] };
  }
}

export async function generateAutomaticSchedule(params: GenerateScheduleParams): Promise<{
  success: boolean;
  result?: GAOptimizationResult;
  error?: string;
}> {
  try {
    const { department, startDate, daysCount, selectedShiftTypes } = params;

    if (!startDate || daysCount <= 0 || selectedShiftTypes.length === 0) {
      return { success: false, error: "Parameter tanggal awal, durasi hari, dan jenis shift wajib diisi." };
    }

    // 1. Ambil staf dari database
    const staffWhere: any = {};
    if (department && department !== "ALL") {
      staffWhere.department = department;
    }

    const dbStaff = await prisma.employee.findMany({
      where: staffWhere,
    });

    if (dbStaff.length < 2) {
      return {
        success: false,
        error: `Jumlah staf di departemen (${department || "Semua"}) tidak mencukupi (${dbStaff.length} orang). Minimal dibutuhkan 2 staf untuk pembuatan jadwal otomatis. Silakan import dataset Kaggle terlebih dahulu.`,
      };
    }

    // Konversi ke interface StaffMember
    const staffMembers: StaffMember[] = dbStaff.map((s) => ({
      id: s.id,
      name: s.name,
      role: s.role,
      department: s.department,
      shiftDuration: s.shiftDuration,
      workdaysPerMonth: s.workdaysPerMonth,
      experienceYears: s.experienceYears,
      satisfactionScore: s.satisfactionScore,
    }));

    // 2. Buat daftar slot shift berdasarkan hari dan jenis shift
    const slots: ShiftSlot[] = [];
    const baseDate = new Date(startDate);
    
    // Tentukan jumlah staf per slot: optimal 2, minimal 1
    const requiredCountPerSlot = Math.max(1, Math.min(3, Math.floor(dbStaff.length / (selectedShiftTypes.length * 2))));

    for (let i = 0; i < daysCount; i++) {
      const currentDate = new Date(baseDate);
      currentDate.setDate(baseDate.getDate() + i);
      const dateStr = currentDate.toISOString().split("T")[0];

      for (const shiftType of selectedShiftTypes) {
        let startHour = 8;
        let endHour = 16;
        let nextDay = false;

        if (shiftType === "Shift Pagi") {
          startHour = 8;
          endHour = 16;
        } else if (shiftType === "Shift Siang") {
          startHour = 16;
          endHour = 24;
        } else if (shiftType === "Shift Malam") {
          startHour = 0;
          endHour = 8;
          nextDay = true;
        }

        const startTime = new Date(`${dateStr}T00:00:00.000Z`);
        startTime.setUTCHours(startHour, 0, 0, 0);

        const endTime = new Date(`${dateStr}T00:00:00.000Z`);
        if (nextDay || endHour === 24) {
          endTime.setDate(endTime.getDate() + 1);
          endTime.setUTCHours(endHour === 24 ? 0 : endHour, 0, 0, 0);
        } else {
          endTime.setUTCHours(endHour, 0, 0, 0);
        }

        slots.push({
          id: `${dateStr}_${shiftType}`,
          date: dateStr,
          title: shiftType,
          startTime,
          endTime,
          requiredCount: requiredCountPerSlot,
        });
      }
    }

    // 3. Eksekusi Algoritma Genetika
    const optimizer = new ShiftGeneticOptimizer(staffMembers, slots);
    const gaResult = optimizer.optimize(department);

    if (gaResult.bestSchedule.length === 0) {
      return { success: false, error: "Algoritma Genetika gagal menghasilkan konfigurasi jadwal yang valid." };
    }

    // 4. Simpan hasil optimasi ke Database PostgreSQL via Prisma
    // Pertama, bersihkan jadwal lama pada rentang tanggal dan staf yang terlibat agar tidak tumpang tindih
    const staffIds = dbStaff.map((s) => s.id);
    const firstDate = slots[0].startTime;
    const lastDate = slots[slots.length - 1].endTime;

    await prisma.shift.deleteMany({
      where: {
        employeeId: {
          in: staffIds,
        },
        startTime: {
          gte: firstDate,
        },
        endTime: {
          lte: lastDate,
        },
      },
    });

    // Simpan semua jadwal baru secara batch (createMany)
    const shiftRecords = gaResult.bestSchedule.map((item) => ({
      title: item.shiftSlot.title,
      startTime: item.shiftSlot.startTime,
      endTime: item.shiftSlot.endTime,
      employeeId: item.employeeId,
      status: "SCHEDULED",
    }));

    await prisma.shift.createMany({
      data: shiftRecords,
    });

    revalidatePath("/dashboard/jadwal");
    revalidatePath("/dashboard/karyawan");

    return { success: true, result: gaResult };
  } catch (error) {
    console.error("Gagal mengeksekusi penjadwalan otomatis Algoritma Genetika:", error);
    return { success: false, error: "Terjadi kesalahan sistem saat menjalankan optimasi jadwal AI." };
  }
}

export async function clearAllSchedules(departmentFilter?: string) {
  try {
    if (departmentFilter && departmentFilter !== "ALL") {
      // Hapus hanya shift dari karyawan di departemen tertentu
      const emps = await prisma.employee.findMany({
        where: { department: departmentFilter },
        select: { id: true },
      });
      const ids = emps.map((e) => e.id);
      await prisma.shift.deleteMany({
        where: { employeeId: { in: ids } },
      });
    } else {
      await prisma.shift.deleteMany({});
    }

    revalidatePath("/dashboard/jadwal");
    revalidatePath("/dashboard/karyawan");
    return { success: true };
  } catch (error) {
    console.error("Gagal menghapus semua jadwal:", error);
    return { success: false, error: "Gagal mengosongkan jadwal shift." };
  }
}
