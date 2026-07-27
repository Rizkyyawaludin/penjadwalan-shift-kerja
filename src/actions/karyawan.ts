"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface EmployeeFormData {
  name: string;
  email: string;
  role: string;
}

export async function getEmployees() {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { shifts: true },
        },
      },
    });

    const total = employees.length;
    const managers = employees.filter((e) => e.role === "MANAGER").length;
    const staff = employees.filter((e) => e.role === "STAFF").length;

    return {
      success: true,
      data: employees,
      stats: {
        total,
        managers,
        staff,
      },
    };
  } catch (error) {
    console.error("Failed to fetch employees:", error);
    return {
      success: false,
      error: "Gagal mengambil data karyawan dari database.",
      data: [],
      stats: { total: 0, managers: 0, staff: 0 },
    };
  }
}

export async function createEmployee(formData: EmployeeFormData) {
  try {
    const { name, email, role } = formData;

    if (!name || !email) {
      return { success: false, error: "Nama dan Email wajib diisi." };
    }

    // Periksa apakah email sudah terdaftar
    const existing = await prisma.employee.findUnique({
      where: { email },
    });

    if (existing) {
      return { success: false, error: "Email sudah terdaftar untuk karyawan lain." };
    }

    const employee = await prisma.employee.create({
      data: {
        name,
        email,
        role: role || "STAFF",
      },
    });

    revalidatePath("/dashboard/karyawan");
    return { success: true, data: employee };
  } catch (error) {
    console.error("Failed to create employee:", error);
    return { success: false, error: "Terjadi kesalahan saat menyimpan data karyawan." };
  }
}

export async function updateEmployee(id: string, formData: EmployeeFormData) {
  try {
    const { name, email, role } = formData;

    if (!name || !email) {
      return { success: false, error: "Nama dan Email wajib diisi." };
    }

    // Periksa apakah email baru sudah dipakai karyawan lain
    const existing = await prisma.employee.findFirst({
      where: {
        email,
        NOT: { id },
      },
    });

    if (existing) {
      return { success: false, error: "Email sudah digunakan oleh karyawan lain." };
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        name,
        email,
        role: role || "STAFF",
      },
    });

    revalidatePath("/dashboard/karyawan");
    return { success: true, data: employee };
  } catch (error) {
    console.error("Failed to update employee:", error);
    return { success: false, error: "Terjadi kesalahan saat memperbarui data karyawan." };
  }
}

export async function deleteEmployee(id: string) {
  try {
    await prisma.employee.delete({
      where: { id },
    });

    revalidatePath("/dashboard/karyawan");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete employee:", error);
    return { success: false, error: "Gagal menghapus data karyawan dari database." };
  }
}
