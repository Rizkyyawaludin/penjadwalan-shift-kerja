"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

import * as bcrypt from "bcryptjs";

export async function getDraftShifts() {
  try {
    // Auto-seed Kepala Ruangan jika belum ada (untuk kemudahan testing)
    const existingHeadNurse = await prisma.admin.findUnique({
      where: { email: "kepalaruangan@admin.com" },
    });

    if (!existingHeadNurse) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await prisma.admin.create({
        data: {
          name: "Kepala Ruangan",
          email: "kepalaruangan@admin.com",
          password: hashedPassword,
          role: "HEAD_NURSE",
        },
      });
      console.log("Auto-seeded Head Nurse account!");
    }

    const drafts = await prisma.shift.findMany({
      where: { status: "DRAFT" },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            department: true,
          }
        }
      },
      orderBy: { startTime: "asc" }
    });
    return { success: true, data: drafts };
  } catch (error) {
    console.error("Gagal mengambil jadwal draft:", error);
    return { success: false, error: "Terjadi kesalahan sistem." };
  }
}

export async function approveDraftSchedules() {
  try {
    const result = await prisma.shift.updateMany({
      where: { status: "DRAFT" },
      data: { status: "SCHEDULED" }
    });

    revalidatePath("/dashboard/approval");
    revalidatePath("/dashboard/jadwal");
    revalidatePath("/dashboard/kalender");
    
    return { success: true, message: `${result.count} shift berhasil disetujui.` };
  } catch (error) {
    console.error("Gagal menyetujui jadwal:", error);
    return { success: false, error: "Terjadi kesalahan saat menyetujui jadwal." };
  }
}

export async function rejectDraftSchedules() {
  try {
    const result = await prisma.shift.deleteMany({
      where: { status: "DRAFT" }
    });

    revalidatePath("/dashboard/approval");
    revalidatePath("/dashboard/jadwal");
    
    return { success: true, message: `${result.count} shift draft ditolak dan dihapus.` };
  } catch (error) {
    console.error("Gagal menolak jadwal:", error);
    return { success: false, error: "Terjadi kesalahan saat menghapus jadwal draft." };
  }
}
