import React from "react";
import { getSchedules } from "@/actions/jadwal";
import { getDatasetStats, KaggleDatasetStats } from "@/actions/dataset";
import { getEmployees } from "@/actions/karyawan";
import ScheduleClientView from "@/components/jadwal/ScheduleClientView";

export const dynamic = "force-dynamic";

export default async function JadwalPage() {
  const [schedulesRes, statsRes, employeesRes] = await Promise.all([
    getSchedules(),
    getDatasetStats(),
    getEmployees(),
  ]);

  const initialShifts = schedulesRes.success ? schedulesRes.data : [];
  const initialEmployees = employeesRes.success ? employeesRes.data : [];
  const initialStats: KaggleDatasetStats = statsRes.success && statsRes.data ? statsRes.data : {
    totalImported: 0,
    byDepartment: { ER: 0, ICU: 0, Pediatrics: 0, GeneralMedicine: 0 },
  };

  return (
    <div style={{ paddingBottom: "3rem" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.5px" }}>
          Jadwal Shift Kerja Otomatis
        </h1>
        <p style={{ color: "#64748b", fontSize: "0.95rem", margin: "0.35rem 0 0 0" }}>
          Optimasi penugasan shift medis menggunakan Algoritma Genetika dengan parameter nyata dari Dataset Kaggle.
        </p>
      </div>

      <ScheduleClientView
        initialShifts={initialShifts || []}
        initialStats={initialStats}
        initialEmployees={initialEmployees || []}
      />
    </div>
  );
}
