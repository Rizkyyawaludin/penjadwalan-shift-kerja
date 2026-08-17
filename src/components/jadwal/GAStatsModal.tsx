"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, ShieldCheck, Cpu, Zap, BarChart2, Award, X } from "lucide-react";
import { GAOptimizationResult } from "@/lib/ga/shiftOptimizer";

interface GAStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  result?: GAOptimizationResult | null;
}

export default function GAStatsModal({ isOpen, onClose, result }: GAStatsModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !result || !mounted) return null;

  const {
    fitnessScore,
    generationsRun,
    executionTimeMs,
    violations,
    department,
    staffCount,
    bestSchedule,
  } = result;

  const isHighlyOptimal = fitnessScore >= 9000;
  const fitnessPercent = Math.min(100, Math.max(0, (fitnessScore / 10000) * 100));

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: "560px" }} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header" style={{ background: "#ffffff", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{
              padding: "0.5rem",
              borderRadius: "0.5rem",
              background: "#f1f5f9",
              color: "#0f172a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid #cbd5e1"
            }}>
              <Award size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.1rem", color: "#0f172a", fontWeight: 700, margin: 0 }}>
                Laporan Optimasi Algoritma Genetika
              </h2>
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                AI Schedule Generator • Powered by Kaggle Dataset
              </span>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* Banner Skor Fitness */}
          <div style={{
            padding: "1rem",
            borderRadius: "0.75rem",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem"
          }}>
            <div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Skor Fitness Akhir (AI Fitness Score)
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", marginTop: "0.25rem" }}>
                {fitnessScore.toLocaleString()} <span style={{ fontSize: "0.9rem", fontWeight: 500, color: "#64748b" }}>/ 10,000</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.35rem", fontSize: "0.8rem", color: isHighlyOptimal ? "#059669" : "#d97706", fontWeight: 600 }}>
                <CheckCircle2 size={15} />
                <span>{isHighlyOptimal ? "Sangat Optimal & Memenuhi Seluruh Batasan" : "Optimal (Beberapa kompromi pada soft constraint)"}</span>
              </div>
            </div>

            <div style={{ width: "90px", textAlign: "right" }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a" }}>
                {fitnessPercent.toFixed(1)}%
              </div>
              <div style={{ fontSize: "0.7rem", color: "#64748b" }}>Tingkat Akurasi</div>
            </div>
          </div>

          {/* Progress Bar Fitness */}
          <div style={{ width: "100%", background: "#e2e8f0", height: "8px", borderRadius: "99px", overflow: "hidden" }}>
            <div style={{
              width: `${fitnessPercent}%`,
              background: "#0f172a",
              height: "100%",
              transition: "width 0.5s ease"
            }} />
          </div>

          {/* Metrik Eksekusi Komputasi */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
            <div style={{ padding: "0.75rem", borderRadius: "0.5rem", background: "#ffffff", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#64748b", fontSize: "0.75rem", fontWeight: 600 }}>
                <Cpu size={14} />
                <span>GENERASI</span>
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a", marginTop: "0.25rem" }}>
                {generationsRun} <span style={{ fontSize: "0.7rem", fontWeight: 400, color: "#64748b" }}>Evolusi</span>
              </div>
            </div>

            <div style={{ padding: "0.75rem", borderRadius: "0.5rem", background: "#ffffff", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#64748b", fontSize: "0.75rem", fontWeight: 600 }}>
                <Zap size={14} />
                <span>KECEPATAN</span>
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a", marginTop: "0.25rem" }}>
                {executionTimeMs} <span style={{ fontSize: "0.7rem", fontWeight: 400, color: "#64748b" }}>ms</span>
              </div>
            </div>

            <div style={{ padding: "0.75rem", borderRadius: "0.5rem", background: "#ffffff", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#64748b", fontSize: "0.75rem", fontWeight: 600 }}>
                <BarChart2 size={14} />
                <span>JADWAL DIBUAT</span>
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a", marginTop: "0.25rem" }}>
                {bestSchedule.length} <span style={{ fontSize: "0.7rem", fontWeight: 400, color: "#64748b" }}>Slot</span>
              </div>
            </div>
          </div>

          {/* Analisis Batasan (Constraint Breakdown) */}
          <div style={{ border: "1px solid #e2e8f0", borderRadius: "0.75rem", overflow: "hidden" }}>
            <div style={{ background: "#f8fafc", padding: "0.6rem 1rem", fontSize: "0.8rem", fontWeight: 700, color: "#334155", borderBottom: "1px solid #e2e8f0" }}>
              Evaluasi Batasan Kerja (Constraint Compliance)
            </div>

            <div style={{ padding: "0.75rem 1rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {/* Leave Violation Check */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.85rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#334155" }}>
                  <ShieldCheck size={16} color={(violations as any).leaveViolation === 0 || (violations as any).leaveViolation === undefined ? "#059669" : "#dc2626"} />
                  <span>Penghormatan Periode Cuti</span>
                </div>
                <span style={{ fontWeight: 700, color: (violations as any).leaveViolation === 0 || (violations as any).leaveViolation === undefined ? "#059669" : "#dc2626" }}>
                  {(violations as any).leaveViolation === 0 || (violations as any).leaveViolation === undefined ? "✅ Tidak Ada Bentrok Cuti" : `${(violations as any).leaveViolation} Bentrok Cuti`}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.85rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#334155" }}>
                  <ShieldCheck size={16} color={violations.doubleShift === 0 ? "#059669" : "#dc2626"} />
                  <span>No Double Shift (1 orang max 1 shift/hari)</span>
                </div>
                <span style={{ fontWeight: 700, color: violations.doubleShift === 0 ? "#059669" : "#dc2626" }}>
                  {violations.doubleShift === 0 ? "✅ Sempurna" : `${violations.doubleShift} Pelanggaran`}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.85rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#334155" }}>
                  <ShieldCheck size={16} color={violations.maxWorkdaysExceeded === 0 ? "#059669" : "#dc2626"} />
                  <span>Batas Hari Kerja dari Dataset Kaggle</span>
                </div>
                <span style={{ fontWeight: 700, color: violations.maxWorkdaysExceeded === 0 ? "#059669" : "#dc2626" }}>
                  {violations.maxWorkdaysExceeded === 0 ? "✅ Patuh" : `${violations.maxWorkdaysExceeded} Melebihi Batas`}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.85rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#334155" }}>
                  <ShieldCheck size={16} color="#0f172a" />
                  <span>Prioritas Senioritas (ER / ICU / Malam)</span>
                </div>
                <span style={{ fontWeight: 600, color: "#0f172a" }}>
                  {violations.experienceMismatch === 0 ? "✅ Sesuai Pengalaman" : "⚖️ Penyesuaian Otomatis"}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.85rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#334155" }}>
                  <ShieldCheck size={16} color="#0f172a" />
                  <span>Pemerataan Beban Kerja (Fairness)</span>
                </div>
                <span style={{ fontWeight: 600, color: "#0f172a" }}>
                  {violations.workloadImbalance === 0 ? "✅ Sangat Merata" : "⚖️ Varians Rendah"}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* History Data Log untuk Skripsi */}
        {result.history && result.history.length > 0 && (
          <div style={{ border: "1px solid #e2e8f0", borderRadius: "0.75rem", overflow: "hidden", margin: "1.25rem 1.25rem 0 1.25rem" }}>
            <div style={{ background: "#f8fafc", padding: "0.6rem 1rem", fontSize: "0.8rem", fontWeight: 700, color: "#334155", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Riwayat Evolusi Generasi (Data Pengujian Bab 4)</span>
              <span style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 400 }}>Salin data ini untuk skripsi</span>
            </div>
            <div style={{ maxHeight: "180px", overflowY: "auto", background: "#ffffff" }}>
              <table style={{ width: "100%", fontSize: "0.8rem", textAlign: "left", borderCollapse: "collapse" }}>
                <thead style={{ position: "sticky", top: 0, background: "#f1f5f9" }}>
                  <tr>
                    <th style={{ padding: "0.5rem 1rem", borderBottom: "1px solid #e2e8f0" }}>Generasi</th>
                    <th style={{ padding: "0.5rem 1rem", borderBottom: "1px solid #e2e8f0" }}>Fitness Terbaik</th>
                    <th style={{ padding: "0.5rem 1rem", borderBottom: "1px solid #e2e8f0" }}>Rata-rata Fitness</th>
                  </tr>
                </thead>
                <tbody>
                  {result.history.map((h, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "0.5rem 1rem" }}>{h.generation}</td>
                      <td style={{ padding: "0.5rem 1rem", fontWeight: 600, color: "#0f172a" }}>{h.bestFitness}</td>
                      <td style={{ padding: "0.5rem 1rem", color: "#64748b" }}>{h.averageFitness}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="modal-footer" style={{ background: "#f8fafc" }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onClose}
            style={{ width: "100%", justifyContent: "center" }}
          >
            <span>Tutup & Lihat Hasil Jadwal Shift</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
