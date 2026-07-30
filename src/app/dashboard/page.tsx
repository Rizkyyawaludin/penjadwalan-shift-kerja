import React from "react";
import DashboardClientView from "@/components/dashboard/DashboardClientView";
import { getSchedules } from "@/actions/jadwal";
import { getEmployees } from "@/actions/karyawan";
import { AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function DashboardHomePage() {
  const [schedulesRes, employeesRes] = await Promise.all([
    getSchedules(),
    getEmployees()
  ]);

  if (!schedulesRes.success || !employeesRes.success) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", background: "#ffffff", borderRadius: "1rem", border: "1px solid #e2e8f0" }}>
        <AlertCircle size={48} color="#94a3b8" style={{ margin: "0 auto 1rem auto" }} />
        <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#0f172a" }}>Gagal Memuat Data Dashboard</h3>
        <p style={{ color: "#64748b", marginTop: "0.5rem" }}>
          {schedulesRes.error || employeesRes.error || "Terjadi kesalahan sistem saat memuat data."}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-main)", letterSpacing: "-0.025em" }}>
          Dashboard
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginTop: "0.25rem" }}>
          Ringkasan data staf dan jadwal hari ini.
        </p>
      </div>

      <DashboardClientView 
        shifts={schedulesRes.data || []} 
        employees={employeesRes.data || []} 
      />
    </div>
  );
}
