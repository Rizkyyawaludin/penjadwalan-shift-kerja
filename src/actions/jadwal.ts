"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { 
  ShiftGeneticOptimizer, 
  ShiftSlot, 
  StaffMember, 
  GAOptimizationResult,
  LeavePeriod,
} from "@/lib/ga/shiftOptimizer";

export interface GenerateScheduleParams {
  department: string;
  startDate: string; // YYYY-MM-DD
  daysCount: number; // 7, 14, or 30 days
  selectedShiftTypes: string[]; // ["Shift Pagi", "Shift Sore", "Shift Malam"]
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
      // Menghapus take: 500 agar jadwal sebulan (yang bisa mencapai ribuan data) tetap terambil semua
    });

    return { success: true, data: shifts };
  } catch (error) {
    console.error("Gagal mengambil data jadwal dari database:", error);
    return { success: false, error: "Gagal memuat jadwal shift dari database.", data: [] };
  }
}

export async function getShiftsByEmployee(employeeId: string) {
  try {
    const shifts = await prisma.shift.findMany({
      where: { employeeId },
      orderBy: { startTime: "asc" },
    });
    return { success: true, data: shifts };
  } catch (error) {
    console.error("Gagal mengambil shift untuk karyawan:", error);
    return { success: false, error: "Gagal memuat jadwal karyawan.", data: [] };
  }
}

export async function generateAutomaticSchedule(params: GenerateScheduleParams): Promise<{
  success: boolean;
  result?: GAOptimizationResult;
  draftShifts?: any[];
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

    const dbStaffAll = await prisma.employee.findMany({
      where: staffWhere,
    });

    // Filter karyawan yang sedang cuti pada periode jadwal
    const scheduleStart = new Date(startDate);
    const scheduleEnd = new Date(startDate);
    scheduleEnd.setDate(scheduleEnd.getDate() + daysCount - 1);

    const activeLeaves = await prisma.leave.findMany({
      where: {
        startDate: { lte: scheduleEnd },
        endDate: { gte: scheduleStart },
      },
      select: { employeeId: true, startDate: true, endDate: true },
    });

    // Semua karyawan tetap masuk GA — leave handling dilakukan di level per-tanggal oleh optimizer
    const dbStaff = dbStaffAll;

    if (dbStaff.length < 2) {
      // Hitung jumlah karyawan yang cuti untuk pesan error yang informatif
      const uniqueLeaveEmpIds = new Set(activeLeaves.map(l => l.employeeId));
      return {
        success: false,
        error: `Jumlah staf aktif di departemen (${department || "Semua"}) tidak mencukupi (${dbStaff.length} orang tersedia, ${uniqueLeaveEmpIds.size} orang memiliki cuti dalam periode ini). Minimal dibutuhkan 2 staf untuk pembuatan jadwal otomatis.`,
      };
    }

    const deptsToRun = department === "ALL" 
      ? Array.from(new Set(dbStaff.map(s => s.department).filter(Boolean))) as string[]
      : [department];

    let allDraftShifts: any[] = [];
    let combinedResult: GAOptimizationResult = { 
      fitnessScore: 10000, 
      bestSchedule: [], 
      violations: { doubleShift: 0, maxWorkdaysExceeded: 0, experienceMismatch: 0, workloadImbalance: 0, leaveViolation: 0 }, 
      generationsRun: 0, 
      executionTimeMs: 0,
      department: "ALL",
      staffCount: dbStaff.length,
      history: []
    };

    for (const dept of deptsToRun) {
      const deptDbStaff = dbStaff.filter(s => s.department === dept);
      if (deptDbStaff.length < 2) continue; // Skip jika staf tidak cukup

      // Konversi ke interface StaffMember (termasuk data cuti sebagai LeavePeriod[])
      const staffMembers: StaffMember[] = deptDbStaff.map((s) => {
        const empLeaves: LeavePeriod[] = activeLeaves
          .filter(l => l.employeeId === s.id)
          .map(l => ({ startDate: new Date(l.startDate), endDate: new Date(l.endDate) }));
          
        return {
          id: s.id,
          name: s.name,
          role: s.role,
          department: s.department,
          shiftDuration: s.shiftDuration,
          workdaysPerMonth: s.workdaysPerMonth,
          experienceYears: s.experienceYears,
          satisfactionScore: s.satisfactionScore,
          leaves: empLeaves,
        };
      });

      // 2. Buat daftar slot shift berdasarkan hari dan jenis shift
      const slots: ShiftSlot[] = [];
      const baseDate = new Date(startDate);
      
      // Sesuai instruksi mutlak: 6 orang di tiap departemen per shift
      const requiredCountPerSlot = 6;

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
          } else if (shiftType === "Shift Sore") {
            startHour = 16;
            endHour = 24;
          } else if (shiftType === "Shift Malam") {
            startHour = 0;
            endHour = 8;
            nextDay = false; // 00:00 hingga 08:00 ada di hari yang sama
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

      // 3. Eksekusi Algoritma Genetika KHUSUS untuk departemen ini
      const optimizer = new ShiftGeneticOptimizer(staffMembers, slots);
      const gaResult = optimizer.optimize(dept);

      if (gaResult.bestSchedule.length === 0) continue;

      // 4. Buat objek Draft Shifts untuk di-preview di UI
      const deptDraftShifts = gaResult.bestSchedule.map((item, index) => {
        const emp = deptDbStaff.find(s => s.id === item.employeeId);
        return {
          id: `draft_${dept}_${index}_${Date.now()}`,
          title: item.shiftSlot.title,
          startTime: item.shiftSlot.startTime,
          endTime: item.shiftSlot.endTime,
          employeeId: item.employeeId,
          status: "DRAFT",
          employee: emp ? {
            id: emp.id,
            name: emp.name,
            role: emp.role,
            department: emp.department,
            experienceYears: emp.experienceYears,
            kaggleStaffId: emp.kaggleStaffId,
          } : null,
        };
      });

      allDraftShifts = allDraftShifts.concat(deptDraftShifts);
      
      // Gabungkan hasil statistik
      combinedResult.bestSchedule = combinedResult.bestSchedule.concat(gaResult.bestSchedule);
      combinedResult.fitnessScore = Math.min(combinedResult.fitnessScore, gaResult.fitnessScore);
      combinedResult.violations.doubleShift += gaResult.violations.doubleShift;
      combinedResult.violations.maxWorkdaysExceeded += gaResult.violations.maxWorkdaysExceeded;
      combinedResult.violations.experienceMismatch += gaResult.violations.experienceMismatch;
      combinedResult.violations.workloadImbalance += gaResult.violations.workloadImbalance;
      combinedResult.violations.leaveViolation += gaResult.violations.leaveViolation;
      combinedResult.generationsRun = Math.max(combinedResult.generationsRun, gaResult.generationsRun);
      combinedResult.executionTimeMs += gaResult.executionTimeMs;
      
      if (gaResult.history && gaResult.history.length > 0) {
        combinedResult.history = gaResult.history;
      }
    }

    if (allDraftShifts.length === 0) {
      return { success: false, error: "Algoritma Genetika gagal menghasilkan konfigurasi jadwal yang valid untuk departemen mana pun." };
    }

    // Simpan otomatis sebagai DRAFT tanpa perlu konfirmasi manual dari Admin
    const saveResult = await saveDraftSchedule(allDraftShifts);
    if (!saveResult.success) {
      return { success: false, error: "Jadwal berhasil dibuat tapi gagal disimpan: " + saveResult.error };
    }

    return { success: true, result: combinedResult };
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

export async function saveDraftSchedule(draftShifts: any[]) {
  try {
    if (!draftShifts || draftShifts.length === 0) {
      return { success: false, error: "Data draft kosong." };
    }

    // Identifikasi rentang tanggal dan staff yang terlibat
    const staffIds = Array.from(new Set(draftShifts.map((s: any) => s.employeeId)));
    const startDates = draftShifts.map((s: any) => new Date(s.startTime).getTime());
    const endDates = draftShifts.map((s: any) => new Date(s.endTime).getTime());
    const firstDate = new Date(Math.min(...startDates));
    const lastDate = new Date(Math.max(...endDates));

    // Hapus jadwal lama agar tidak tumpang tindih
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

    // Simpan jadwal final
    const shiftRecords = draftShifts.map((item: any) => ({
      title: item.title,
      startTime: new Date(item.startTime),
      endTime: new Date(item.endTime),
      employeeId: item.employeeId,
      status: "DRAFT",
    }));

    await prisma.shift.createMany({
      data: shiftRecords,
    });

    revalidatePath("/dashboard/jadwal");
    revalidatePath("/dashboard/karyawan");
    revalidatePath("/dashboard/kalender");

    return { success: true };
  } catch (error) {
    console.error("Gagal menyimpan jadwal hasil konfirmasi:", error);
    return { success: false, error: "Terjadi kesalahan saat menyimpan jadwal final ke database." };
  }
}
