import React from "react";
import { getDraftShifts } from "@/actions/approval";
import { getDatasetStats } from "@/actions/dataset";
import { getEmployees } from "@/actions/karyawan";
import ApprovalClientView from "@/components/approval/ApprovalClientView";

export const dynamic = "force-dynamic";

export default async function ApprovalPage() {
  const [draftsRes, statsRes, employeesRes] = await Promise.all([
    getDraftShifts(),
    getDatasetStats(),
    getEmployees(),
  ]);

  const initialDrafts = draftsRes.success ? draftsRes.data : [];
  const initialEmployees = employeesRes.success ? employeesRes.data : [];
  const initialStats = statsRes.success && statsRes.data ? statsRes.data : {
    totalImported: 0,
    byDepartment: { ER: 0, ICU: 0, Pediatrics: 0, GeneralMedicine: 0 },
  };

  return (
    <div style={{ paddingBottom: "3rem" }}>
      <div className="no-print" style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.5px" }}>
          Approval Jadwal Shift
        </h1>
        <p style={{ color: "#64748b", fontSize: "0.95rem", margin: "0.35rem 0 0 0" }}>
          Silakan tinjau jadwal shift (DRAFT) yang dibuat oleh Admin. Anda dapat menyetujui seluruh jadwal atau menolaknya.
        </p>
      </div>

      <ApprovalClientView 
        initialDrafts={initialDrafts || []}
        initialStats={initialStats}
        initialEmployees={initialEmployees || []}
      />
    </div>
  );
}
