"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Calendar, 
  Sparkles, 
  Download, 
  Database, 
  Trash2, 
  Loader2, 
  Filter, 
  Clock, 
  User, 
  Award, 
  Layers, 
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { importKaggleDataset, getDatasetStats, KaggleDatasetStats } from "@/actions/dataset";
import { generateAutomaticSchedule, clearAllSchedules, getSchedules } from "@/actions/jadwal";
import { GAOptimizationResult } from "@/lib/ga/shiftOptimizer";
import GAStatsModal from "./GAStatsModal";

interface ScheduleClientViewProps {
  initialShifts: any[];
  initialStats: KaggleDatasetStats;
}

export default function ScheduleClientView({ initialShifts, initialStats }: ScheduleClientViewProps) {
  const [shifts, setShifts] = useState(initialShifts);
  const [stats, setStats] = useState<KaggleDatasetStats>(initialStats);
  
  // State Generator
  const [targetDept, setTargetDept] = useState("ALL");
  const [startDate, setStartDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });
  const [daysCount, setDaysCount] = useState<number>(7);
  const [selectedShiftTypes, setSelectedShiftTypes] = useState<string[]>(["Shift Pagi", "Shift Siang", "Shift Malam"]);
  
  // State UI & Loading
  const [loadingImport, setLoadingImport] = useState(false);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingClear, setLoadingClear] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  
  // Modal AI Stats
  const [gaResult, setGaResult] = useState<GAOptimizationResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const refreshData = useCallback(async (dept: string) => {
    try {
      const [schedulesRes, statsRes] = await Promise.all([
        getSchedules(dept === "ALL" ? undefined : dept),
        getDatasetStats(),
      ]);
      if (schedulesRes && schedulesRes.success) {
        setShifts(schedulesRes.data || []);
      }
      if (statsRes && statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (err) {
      console.error("Gagal menyinkronkan data UI:", err);
    }
  }, []);

  useEffect(() => {
    refreshData(targetDept);
  }, [targetDept, refreshData]);

  const toggleShiftType = (type: string) => {
    if (selectedShiftTypes.includes(type)) {
      if (selectedShiftTypes.length > 1) {
        setSelectedShiftTypes(selectedShiftTypes.filter((t) => t !== type));
      }
    } else {
      setSelectedShiftTypes([...selectedShiftTypes, type]);
    }
  };

  const handleImportDataset = async () => {
    setLoadingImport(true);
    setNotification(null);
    try {
      const res = await importKaggleDataset(targetDept === "ALL" ? undefined : targetDept, 30);
      if (!res.success) {
        setNotification({ type: "error", message: res.error || "Gagal mengimpor dataset Kaggle." });
      } else {
        setNotification({ type: "success", message: res.message || "Berhasil mengimpor data dari Kaggle!" });
        await refreshData(targetDept);
      }
    } catch (err) {
      setNotification({ type: "error", message: "Terjadi kesalahan koneksi saat import." });
    } finally {
      setLoadingImport(false);
    }
  };

  const handleGenerateGA = async () => {
    setLoadingGenerate(true);
    setNotification(null);
    try {
      const res = await generateAutomaticSchedule({
        department: targetDept,
        startDate,
        daysCount,
        selectedShiftTypes,
      });

      if (!res.success) {
        setNotification({ type: "error", message: res.error || "Gagal membuat jadwal dengan AI." });
      } else if (res.result) {
        setGaResult(res.result);
        setIsModalOpen(true);
        setNotification({ type: "success", message: `Jadwal optimal untuk ${daysCount} hari berhasil dibuat dengan Algoritma Genetika!` });
        await refreshData(targetDept);
      }
    } catch (err) {
      setNotification({ type: "error", message: "Terjadi kesalahan koneksi server." });
    } finally {
      setLoadingGenerate(false);
    }
  };

  const handleClearSchedules = async () => {
    if (!confirm("Apakah Anda yakin ingin menghapus semua data jadwal shift yang ada saat ini?")) return;
    setLoadingClear(true);
    setNotification(null);
    try {
      const res = await clearAllSchedules(targetDept === "ALL" ? undefined : targetDept);
      if (res.success) {
        setShifts([]);
        setNotification({ type: "success", message: "Daftar jadwal shift telah dikosongkan." });
        await refreshData(targetDept);
      } else {
        setNotification({ type: "error", message: res.error || "Gagal menghapus jadwal." });
      }
    } catch (err) {
      setNotification({ type: "error", message: "Terjadi kesalahan server." });
    } finally {
      setLoadingClear(false);
    }
  };

  const formatDateTime = (dateVal: string | Date) => {
    const d = new Date(dateVal);
    return d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  };

  const formatTime = (dateVal: string | Date) => {
    const d = new Date(dateVal);
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  };

  // Kelompokkan shift berdasarkan tanggal untuk tampilan tabel rapi
  const groupedShifts = shifts.reduce((acc: Record<string, any[]>, shift) => {
    const dateKey = new Date(shift.startTime).toISOString().split("T")[0];
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(shift);
    return acc;
  }, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      
      {/* Notifikasi Banner */}
      {notification && (
        <div style={{
          padding: "1rem 1.25rem",
          borderRadius: "0.75rem",
          background: notification.type === "success" ? "#f0fdf4" : "var(--danger-bg)",
          color: notification.type === "success" ? "#15803d" : "var(--danger)",
          border: `1px solid ${notification.type === "success" ? "#bbf7d0" : "#fecaca"}`,
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          fontSize: "0.9rem",
          fontWeight: 500
        }}>
          {notification.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Bagian 1: Dataset Kaggle Integration Card */}
      <div className="card" style={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <div style={{ padding: "0.4rem", borderRadius: "0.4rem", background: "#f1f5f9", color: "#0f172a", border: "1px solid #cbd5e1" }}>
                <Database size={18} />
              </div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                Kaggle Dataset: Healthcare Staff Scheduling
              </h3>
            </div>
            <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "0.35rem 0 0 0" }}>
              Mengunduh dan menyinkronkan 1.000 data staf medis dari dataset resmi Kaggle untuk parameter Algoritma Genetika.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleImportDataset}
            disabled={loadingImport}
            style={{ fontWeight: 600 }}
          >
            {loadingImport ? (
              <>
                <Loader2 size={16} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} />
                <span>Mengimpor Dataset...</span>
              </>
            ) : (
              <>
                <Download size={16} />
                <span>Sync / Import Dataset Kaggle</span>
              </>
            )}
          </button>
        </div>

        {/* Status Chip Departemen Kaggle */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.75rem", marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px dashed #e2e8f0" }}>
          <div style={{ padding: "0.6rem", borderRadius: "0.5rem", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>ER (EMERGENCY)</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a", marginTop: "0.2rem" }}>{stats.byDepartment.ER} <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "#64748b" }}>Staf</span></div>
          </div>
          <div style={{ padding: "0.6rem", borderRadius: "0.5rem", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>ICU (INTENSIVE)</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a", marginTop: "0.2rem" }}>{stats.byDepartment.ICU} <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "#64748b" }}>Staf</span></div>
          </div>
          <div style={{ padding: "0.6rem", borderRadius: "0.5rem", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>PEDIATRICS</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a", marginTop: "0.2rem" }}>{stats.byDepartment.Pediatrics} <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "#64748b" }}>Staf</span></div>
          </div>
          <div style={{ padding: "0.6rem", borderRadius: "0.5rem", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>GEN MEDICINE</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a", marginTop: "0.2rem" }}>{stats.byDepartment.GeneralMedicine} <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "#64748b" }}>Staf</span></div>
          </div>
          <div style={{ padding: "0.6rem", borderRadius: "0.5rem", background: "#f8fafc", border: "1px solid #cbd5e1" }}>
            <div style={{ fontSize: "0.7rem", color: "#0f172a", fontWeight: 700 }}>TOTAL TERDATA</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", marginTop: "0.2rem" }}>{stats.totalImported} <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "#64748b" }}>Karyawan</span></div>
          </div>
        </div>
      </div>

      {/* Bagian 2: AI Schedule Generator Controls */}
      <div className="card" style={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem" }}>
          <div style={{ padding: "0.4rem", borderRadius: "0.4rem", background: "#0f172a", color: "#ffffff" }}>
            <Sparkles size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
              AI Genetic Algorithm Generator
            </h3>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
              Konfigurasi parameter untuk pembuatan jadwal otomatis tanpa bentrok (No Double Shift)
            </span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem" }}>
          {/* Departemen */}
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "0.4rem" }}>
              Target Departemen
            </label>
            <select
              className="input-field"
              value={targetDept}
              onChange={(e) => setTargetDept(e.target.value)}
            >
              <option value="ALL">Semua Departemen</option>
              <option value="ER">ER (Emergency Room)</option>
              <option value="ICU">ICU (Intensive Care)</option>
              <option value="Pediatrics">Pediatrics (Anak)</option>
              <option value="General Medicine">General Medicine</option>
            </select>
          </div>

          {/* Tanggal Mulai */}
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "0.4rem" }}>
              Tanggal Mulai
            </label>
            <input
              type="date"
              className="input-field"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* Durasi Hari */}
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "0.4rem" }}>
              Durasi Penjadwalan
            </label>
            <select
              className="input-field"
              value={daysCount}
              onChange={(e) => setDaysCount(Number(e.target.value))}
            >
              <option value={7}>7 Hari (Mingguan)</option>
              <option value={14}>14 Hari (Dua Mingguan)</option>
              <option value={30}>30 Hari (Bulanan)</option>
            </select>
          </div>
        </div>

        {/* Checkbox Jenis Shift */}
        <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px dashed #e2e8f0" }}>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "0.6rem" }}>
            Pilih Jenis Shift Dilibatkan:
          </label>
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
            {["Shift Pagi", "Shift Siang", "Shift Malam"].map((type) => {
              const isChecked = selectedShiftTypes.includes(type);
              return (
                <label key={type} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.9rem", color: "#0f172a", fontWeight: 500 }}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleShiftType(type)}
                    style={{ width: "16px", height: "16px", accentColor: "#0f172a", cursor: "pointer" }}
                  />
                  <span>{type}</span>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 400 }}>
                    ({type === "Shift Pagi" ? "08:00 - 16:00" : type === "Shift Siang" ? "16:00 - 00:00" : "00:00 - 08:00"})
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Tombol Eksekusi */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid #e2e8f0" }}>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleClearSchedules}
            disabled={loadingClear || shifts.length === 0}
            style={{ background: "transparent", color: "var(--danger)", border: "1px solid #fecaca" }}
          >
            {loadingClear ? <Loader2 size={16} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={16} />}
            <span>Kosongkan Jadwal</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleGenerateGA}
            disabled={loadingGenerate || selectedShiftTypes.length === 0}
            style={{ padding: "0.65rem 1.5rem", fontSize: "0.95rem" }}
          >
            {loadingGenerate ? (
              <>
                <Loader2 size={18} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} />
                <span>Kalkulasi Algoritma Genetika...</span>
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span>Generate Jadwal Otomatis (AI)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Bagian 3: Hasil Jadwal Shift */}
      <div className="card" style={{ background: "#ffffff", border: "1px solid #e2e8f0", padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Calendar size={18} color="#0f172a" />
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
              Daftar Jadwal Shift Terbentuk ({shifts.length} Slot)
            </h3>
          </div>

          {gaResult && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(true)}
              style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
            >
              <Award size={14} />
              <span>Lihat Laporan AI</span>
            </button>
          )}
        </div>

        {shifts.length === 0 ? (
          <div style={{ padding: "4rem 2rem", textAlign: "center", color: "#64748b" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem auto", color: "#94a3b8" }}>
              <Calendar size={28} />
            </div>
            <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", margin: "0 0 0.5rem 0" }}>Belum Ada Jadwal Terbentuk</h4>
            <p style={{ fontSize: "0.85rem", maxWidth: "420px", margin: "0 auto", lineHeight: 1.5 }}>
              Silakan atur parameter departemen dan durasi di atas, lalu klik tombol <strong>Generate Jadwal Otomatis (AI)</strong> untuk membuat jadwal tanpa bentrok.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                  <th style={{ padding: "0.85rem 1.25rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Tanggal</th>
                  <th style={{ padding: "0.85rem 1.25rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Waktu & Jenis Shift</th>
                  <th style={{ padding: "0.85rem 1.25rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Karyawan (Staf)</th>
                  <th style={{ padding: "0.85rem 1.25rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Departemen</th>
                  <th style={{ padding: "0.85rem 1.25rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Kaggle ID</th>
                  <th style={{ padding: "0.85rem 1.25rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(groupedShifts).sort().map((dateKey) => (
                  <React.Fragment key={dateKey}>
                    <tr style={{ background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
                      <td colSpan={6} style={{ padding: "0.5rem 1.25rem", fontSize: "0.8rem", fontWeight: 700, color: "#0f172a" }}>
                        📅 {formatDateTime(dateKey)}
                      </td>
                    </tr>
                    {groupedShifts[dateKey].map((shift: any) => (
                      <tr key={shift.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "0.85rem 1.25rem", fontSize: "0.85rem", color: "#334155", paddingLeft: "2.5rem" }}>
                          {formatDateTime(shift.startTime).split(",")[0]}
                        </td>
                        <td style={{ padding: "0.85rem 1.25rem", fontSize: "0.85rem", color: "#0f172a", fontWeight: 600 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <Clock size={14} color="#64748b" />
                            <span>{shift.title}</span>
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 400, marginTop: "0.15rem" }}>
                            {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                          </div>
                        </td>
                        <td style={{ padding: "0.85rem 1.25rem" }}>
                          <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.9rem" }}>{shift.employee?.name || "Staf Tidak Dikenal"}</div>
                          {shift.employee?.experienceYears && (
                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Pengalaman: {shift.employee.experienceYears} Tahun</div>
                          )}
                        </td>
                        <td style={{ padding: "0.85rem 1.25rem" }}>
                          <span style={{
                            padding: "0.25rem 0.6rem",
                            borderRadius: "99px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            background: "#f1f5f9",
                            color: "#0f172a",
                            border: "1px solid #cbd5e1"
                          }}>
                            {shift.employee?.department || "Umum"}
                          </span>
                        </td>
                        <td style={{ padding: "0.85rem 1.25rem", fontSize: "0.85rem", color: "#64748b", fontFamily: "monospace" }}>
                          {shift.employee?.kaggleStaffId || "-"}
                        </td>
                        <td style={{ padding: "0.85rem 1.25rem" }}>
                          <span style={{
                            padding: "0.25rem 0.6rem",
                            borderRadius: "99px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            background: "#f0fdf4",
                            color: "#15803d",
                            border: "1px solid #bbf7d0"
                          }}>
                            AI SCHEDULED
                          </span>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Statistik AI */}
      <GAStatsModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          refreshData(targetDept);
        }}
        result={gaResult}
      />
    </div>
  );
}
