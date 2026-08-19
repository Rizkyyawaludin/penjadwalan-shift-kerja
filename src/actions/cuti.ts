"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface LeaveFormData {
  employeeId: string;
  type: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  notes?: string;
}

export async function getLeaves() {
  try {
    const leaves = await prisma.leave.findMany({
      orderBy: { startDate: "desc" },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            role: true,
            department: true,
          },
        },
      },
    });

    return { success: true, data: leaves };
  } catch (error) {
    console.error("Gagal mengambil data cuti:", error);
    return { success: false, error: "Gagal memuat data cuti dari database.", data: [] };
  }
}

export async function createLeave(formData: LeaveFormData) {
  try {
    const { employeeId, type, startDate, endDate, notes } = formData;

    if (!employeeId || !type || !startDate || !endDate) {
      return { success: false, error: "Karyawan, jenis cuti, tanggal mulai, dan tanggal selesai wajib diisi." };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      return { success: false, error: "Tanggal selesai tidak boleh lebih awal dari tanggal mulai." };
    }

    // Periksa apakah karyawan ada
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return { success: false, error: "Karyawan tidak ditemukan." };
    }

    // Periksa apakah ada cuti yang overlap untuk karyawan ini
    const overlapping = await prisma.leave.findFirst({
      where: {
        employeeId,
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });

    if (overlapping) {
      return { success: false, error: "Karyawan sudah memiliki cuti yang bentrok dengan periode ini." };
    }

    await prisma.leave.create({
      data: {
        type,
        startDate: start,
        endDate: end,
        notes: notes || null,
        employeeId,
      },
    });

    // Jalankan Skenario C: Auto-Reassign
    const reassignDetails = await autoReassignShifts(employeeId, employee.department, start, end);

    revalidatePath("/dashboard/cuti");
    revalidatePath("/dashboard/jadwal"); // Pastikan jadwal terupdate juga
    
    let message = "Data cuti berhasil ditambahkan.";
    if (reassignDetails.length > 0) {
      message += `\n\nSistem mengalihkan ${reassignDetails.length} shift:\n`;
      reassignDetails.forEach(d => {
        message += `- ${d.date} (${d.shiftTitle}): dialihkan ke ${d.newName}\n`;
      });
    }

    return { success: true, message };
  } catch (error) {
    console.error("Gagal menambahkan cuti:", error);
    return { success: false, error: "Terjadi kesalahan saat menyimpan data cuti." };
  }
}

/**
 * Auto-Reassign (Skenario C): Mencari pengganti terbaik untuk shift yang bentrok dengan periode cuti.
 * Mengutamakan staf di departemen yang sama, tidak cuti, tidak double shift, dan workload paling sedikit.
 */
async function autoReassignShifts(employeeId: string, department: string | null, start: Date, end: Date) {
  const searchStart = new Date(start);
  searchStart.setHours(0, 0, 0, 0);
  const searchEnd = new Date(end);
  searchEnd.setHours(23, 59, 59, 999);

  // 1. Cari shift yang bentrok dengan cuti ini
  const overlappingShifts = await prisma.shift.findMany({
    where: {
      employeeId,
      startTime: { gte: searchStart },
      endTime: { lte: searchEnd }
    },
    orderBy: { startTime: 'asc' }
  });

  console.log("AutoReassign - Start:", searchStart, "End:", searchEnd);
  console.log("AutoReassign - Overlapping Shifts Found:", overlappingShifts.length);

  if (overlappingShifts.length === 0) return []; // Tidak ada shift yang perlu diganti

  // 2. Ambil semua karyawan di departemen yang sama untuk jadi kandidat
  const candidates = await prisma.employee.findMany({
    where: {
      id: { not: employeeId },
      department: department
    },
    include: {
      leaves: true,
      shifts: {
        where: {
          startTime: { gte: searchStart, lte: searchEnd }
        }
      }
    }
  });

  console.log("AutoReassign - Candidates Found:", candidates.length);

  const reassignedDetails = [];

  // 3. Untuk setiap shift yang ditinggalkan, cari pengganti terbaik
  for (const shift of overlappingShifts) {
    const shiftDateStr = shift.startTime.toISOString().split('T')[0];

    // Filter kandidat yang TIDAK cuti pada tanggal shift ini
    const availableCandidates = candidates.filter(c => {
      const isOnLeave = c.leaves.some(l => {
        const leaveStart = new Date(l.startDate).toISOString().split('T')[0];
        const leaveEnd = new Date(l.endDate).toISOString().split('T')[0];
        return shiftDateStr >= leaveStart && shiftDateStr <= leaveEnd;
      });
      return !isOnLeave;
    });

    if (availableCandidates.length === 0) continue; // Terpaksa dibiarkan kalau benar-benar tidak ada yang sedia

    // Urutkan kandidat menggunakan sistem skoring
    let bestCandidate = null;
    let bestScore = -999999;

    for (const c of availableCandidates) {
      let score = 0;
      
      // Kriteria 1: Jangan double shift di hari yang sama
      const hasShiftSameDay = c.shifts.some(s => s.startTime.toISOString().split('T')[0] === shiftDateStr);
      if (hasShiftSameDay) score -= 10000;

      // Kriteria 2: Harus ada rest gap 16 jam
      let hasRestGap = true;
      for (const s of c.shifts) {
        const gap1 = shift.startTime.getTime() - s.endTime.getTime();
        const gap2 = s.startTime.getTime() - shift.endTime.getTime();
        if (Math.max(gap1, gap2) < 16 * 60 * 60 * 1000) {
          hasRestGap = false;
          break;
        }
      }
      if (!hasRestGap) score -= 5000;

      // Kriteria 3: Workload balance (prioritaskan yang shiftnya paling sedikit)
      score -= c.shifts.length * 10;

      if (score > bestScore) {
        bestScore = score;
        bestCandidate = c;
      }
    }

    if (bestCandidate) {
      // Reassign ke best candidate
      await prisma.shift.update({
        where: { id: shift.id },
        data: { employeeId: bestCandidate.id }
      });
      
      // Update local state candidate so next loop knows they took a shift
      bestCandidate.shifts.push(shift as any);
      
      reassignedDetails.push({
        date: shiftDateStr,
        shiftTitle: shift.title,
        newName: bestCandidate.name
      });
    }
  }

  return reassignedDetails;
}

export async function deleteLeave(id: string) {
  try {
    if (!id) {
      return { success: false, error: "ID cuti tidak valid." };
    }

    await prisma.leave.delete({
      where: { id },
    });

    revalidatePath("/dashboard/cuti");
    return { success: true, message: "Data cuti berhasil dihapus." };
  } catch (error) {
    console.error("Gagal menghapus cuti:", error);
    return { success: false, error: "Terjadi kesalahan saat menghapus data cuti." };
  }
}
