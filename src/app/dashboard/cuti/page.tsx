import React from "react";
import { getLeaves } from "@/actions/cuti";
import { prisma } from "@/lib/prisma";
import LeaveClientView from "@/components/cuti/LeaveClientView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kelola Cuti Karyawan | ShiftMaster Pro",
  description: "Manajemen cuti, izin, dan ketidakhadiran karyawan untuk penjadwalan shift kerja.",
};

export const dynamic = "force-dynamic";

export default async function CutiPage() {
  const { data: leaves = [] } = await getLeaves();

  // Ambil daftar karyawan untuk dropdown form
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      name: true,
      department: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <LeaveClientView
      initialLeaves={leaves as any}
      employees={employees}
    />
  );
}
