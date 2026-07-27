import React from "react";
import { getEmployees } from "@/actions/karyawan";
import EmployeeClientView from "@/components/karyawan/EmployeeClientView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kelola Data Karyawan | ShiftMaster Pro",
  description: "Manajemen data karyawan operasional dan pengaturan koordinator shift kerja.",
};

export const dynamic = "force-dynamic";

export default async function KaryawanPage() {
  const { data = [], stats = { total: 0, managers: 0, staff: 0 } } = await getEmployees();

  return <EmployeeClientView initialEmployees={data} stats={stats} />;
}
