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

    revalidatePath("/dashboard/cuti");
    return { success: true, message: "Data cuti berhasil ditambahkan." };
  } catch (error) {
    console.error("Gagal menambahkan cuti:", error);
    return { success: false, error: "Terjadi kesalahan saat menyimpan data cuti." };
  }
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
