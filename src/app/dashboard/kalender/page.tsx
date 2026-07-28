import React from "react";
import InteractiveCalendar from "@/components/kalender/InteractiveCalendar";
import { getSchedules } from "@/actions/jadwal";
import { Calendar as CalendarIcon, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function KalenderPage() {
  const result = await getSchedules();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-main)", letterSpacing: "-0.025em" }}>
          Kalender Jadwal Shift
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginTop: "0.25rem" }}>
          Tampilan visual jadwal kerja bulanan staf medis.
        </p>
      </div>

      {!result.success || !result.data ? (
        <div style={{ padding: "3rem", textAlign: "center", background: "#ffffff", borderRadius: "1rem", border: "1px solid #e2e8f0" }}>
          <AlertCircle size={48} color="#94a3b8" style={{ margin: "0 auto 1rem auto" }} />
          <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#0f172a" }}>Gagal Memuat Jadwal</h3>
          <p style={{ color: "#64748b", marginTop: "0.5rem" }}>{result.error || "Terjadi kesalahan sistem."}</p>
        </div>
      ) : result.data.length === 0 ? (
        <div style={{ padding: "4rem 2rem", textAlign: "center", background: "#ffffff", borderRadius: "1rem", border: "1px dashed #cbd5e1" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem auto" }}>
            <CalendarIcon size={32} color="#94a3b8" />
          </div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#0f172a" }}>Belum Ada Jadwal Bulan Ini</h3>
          <p style={{ color: "#64748b", marginTop: "0.5rem", maxWidth: "400px", margin: "0.5rem auto 0 auto" }}>
            Jadwal shift kosong. Silakan gunakan fitur Generate Jadwal Otomatis (AI) di menu Jadwal Shift untuk membuat penugasan baru.
          </p>
        </div>
      ) : (
        <InteractiveCalendar initialShifts={result.data as any[]} />
      )}
    </div>
  );
}
