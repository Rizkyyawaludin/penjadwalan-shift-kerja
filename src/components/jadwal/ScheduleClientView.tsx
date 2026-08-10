"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  CheckCircle2,
  Save,
  XCircle,
  Printer
} from "lucide-react";
import { importKaggleDataset, getDatasetStats, KaggleDatasetStats } from "@/actions/dataset";
import { generateAutomaticSchedule, clearAllSchedules, getSchedules, saveDraftSchedule } from "@/actions/jadwal";
import { GAOptimizationResult } from "@/lib/ga/shiftOptimizer";
import GAStatsModal from "./GAStatsModal";

interface ScheduleClientViewProps {
  initialShifts: any[];
  initialStats: KaggleDatasetStats;
  initialEmployees: any[];
}

// Pesan informatif yang diputar bergiliran saat GA berjalan
const GA_LOADING_LABELS = [
  "Menginisialisasi populasi GA...",
  "Mengevaluasi kromosom generasi awal...",
  "Seleksi & crossover berlangsung...",
  "Mutasi & optimasi jadwal...",
  "Mengeliminasi bentrok shift...",
  "Menyeimbangkan beban kerja...",
  "Hampir selesai, finalisasi hasil...",
];

export default function ScheduleClientView({ initialShifts, initialStats, initialEmployees }: ScheduleClientViewProps) {
  const [shifts, setShifts] = useState(initialShifts);
  const [stats, setStats] = useState<KaggleDatasetStats>(initialStats);
  const [employees, setEmployees] = useState(initialEmployees);

  // State Draft Mode
  const [isDraftMode, setIsDraftMode] = useState(false);
  const [draftShifts, setDraftShifts] = useState<any[]>([]);
  const [loadingSaveDraft, setLoadingSaveDraft] = useState(false);

  // State Generator
  const [targetDept, setTargetDept] = useState("ALL");
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    // Gunakan tanggal lokal klien sebagai default
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const [daysCount, setDaysCount] = useState<number>(7);
  const [selectedShiftTypes, setSelectedShiftTypes] = useState<string[]>(["Shift Pagi", "Shift Sore", "Shift Malam"]);

  // State UI & Loading
  const [loadingImport, setLoadingImport] = useState(false);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [generatePhase, setGeneratePhase] = useState(0); // cycling label index saat loading
  const [loadingClear, setLoadingClear] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // State Modal & View
  const [gaResult, setGaResult] = useState<GAOptimizationResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "matrix">("matrix");

  // State Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 1; // Menampilkan 1 hari per halaman

  useEffect(() => {
    setCurrentPage(1);
  }, [shifts, draftShifts]);

  // Saat generate sedang berjalan, putar pesan informatif tiap 2 detik
  // agar user tahu proses berjalan (tidak freeze) meskipun server action synchronous
  useEffect(() => {
    if (!loadingGenerate) return;
    const interval = setInterval(() => {
      setGeneratePhase(prev => (prev + 1) % GA_LOADING_LABELS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [loadingGenerate]);

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
      const res = await importKaggleDataset(targetDept === "ALL" ? undefined : targetDept, 26);
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
    setGeneratePhase(0);
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
        setDraftShifts(res.draftShifts || []);
        setIsDraftMode(true);
        setNotification({ type: "success", message: `Jadwal optimal untuk ${daysCount} hari berhasil dibuat. Silakan periksa atau ubah, lalu klik Simpan & Konfirmasi.` });
      }
    } catch (err) {
      setNotification({ type: "error", message: "Terjadi kesalahan koneksi server." });
    } finally {
      setLoadingGenerate(false);
    }
  };

  const handleConfirmDraft = async () => {
    setLoadingSaveDraft(true);
    setNotification(null);
    try {
      const res = await saveDraftSchedule(draftShifts);
      if (res.success) {
        setIsDraftMode(false);
        setDraftShifts([]);
        setNotification({ type: "success", message: "Jadwal final berhasil dikonfirmasi dan disimpan ke database!" });
        await refreshData(targetDept);
      } else {
        setNotification({ type: "error", message: res.error || "Gagal menyimpan jadwal." });
      }
    } catch (err) {
      setNotification({ type: "error", message: "Terjadi kesalahan server saat menyimpan jadwal." });
    } finally {
      setLoadingSaveDraft(false);
    }
  };

  const handleCancelDraft = () => {
    if (!confirm("Apakah Anda yakin ingin membatalkan draft jadwal ini? Data yang belum disimpan akan hilang.")) return;
    setIsDraftMode(false);
    setDraftShifts([]);
    setNotification({ type: "success", message: "Draft jadwal berhasil dibatalkan." });
  };

  const handleDraftEmployeeChange = (shiftId: string, newEmployeeId: string) => {
    const selectedEmp = employees.find((e: any) => e.id === newEmployeeId);
    if (!selectedEmp) return;

    setDraftShifts(prev => prev.map(shift => {
      if (shift.id === shiftId) {
        return {
          ...shift,
          employeeId: selectedEmp.id,
          employee: {
            id: selectedEmp.id,
            name: selectedEmp.name,
            role: selectedEmp.role,
            department: selectedEmp.department,
            experienceYears: selectedEmp.experienceYears,
            kaggleStaffId: selectedEmp.kaggleStaffId
          }
        };
      }
      return shift;
    }));
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

  // Kelompokkan shift berdasarkan tanggal untuk tampilan tabel rapi
  const displayShifts = isDraftMode ? draftShifts : shifts;
  const groupedShifts = displayShifts.reduce((acc: Record<string, any[]>, shift) => {
    const dateKey = new Date(shift.startTime).toISOString().split("T")[0];
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(shift);
    return acc;
  }, {});

  const employeeShiftCounts = displayShifts.reduce((acc: Record<string, number>, shift) => {
    const empId = shift.employeeId || shift.employee?.id;
    if (empId) acc[empId] = (acc[empId] || 0) + 1;
    return acc;
  }, {});

  // Data untuk Matrix View
  const uniqueDates = Object.keys(groupedShifts).sort();
  const matrixData = useMemo(() => {
    const map = new Map<string, any>();
    displayShifts.forEach(shift => {
      const empName = shift.employee?.name;
      if (!empName) return;
      if (!map.has(empName)) {
        map.set(empName, {
          dept: shift.employee?.department,
          total: 0,
          shiftsByDate: {}
        });
      }
      const data = map.get(empName);
      const dateKey = new Date(shift.startTime).toISOString().split("T")[0];
      data.shiftsByDate[dateKey] = shift.title;
      data.total += 1;
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [displayShifts]);

  const handleExportCSV = () => {
    const headers = ["Tanggal", "Shift", "Waktu Mulai", "Waktu Selesai", "Nama Karyawan", "Departemen", "Total Beban Shift"];

    const rows = shifts.map(shift => {
      const date = formatDateTime(shift.startTime).split(",")[0];
      const startTime = formatTime(shift.startTime);
      const endTime = formatTime(shift.endTime);
      const empId = shift.employeeId || shift.employee?.id;
      const totalShift = employeeShiftCounts[empId] || 0;

      return [
        `"${date}"`,
        `"${shift.title}"`,
        `"${startTime}"`,
        `"${endTime}"`,
        `"${shift.employee?.name || "-"}"`,
        `"${shift.employee?.department || "Umum"}"`,
        `"${totalShift}"`
      ];
    });

    const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Jadwal_Shift_${targetDept}_${startDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const formatDateTime = (dateVal: string | Date) => {
    const d = new Date(dateVal);
    return d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  };

  const formatTime = (dateVal: string | Date) => {
    const d = new Date(dateVal);
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <style dangerouslySetInnerHTML={{
        __html: `
        @media screen {
          .screen-hidden { display: none !important; }
        }
        @media print {
          @page {
            size: landscape;
            margin: 0; /* Margin 0 menghilangkan header/footer URL bawaan browser */
          }
          body {
            padding: 10mm !important; /* Tambahkan padding manual agar konten tidak menyentuh ujung kertas */
          }
          /* Sembunyikan elemen bawaan dashboard dan elemen kontrol */
          .sidebar-nav, .glass-header, .no-print {
            display: none !important;
          }
          /* Izinkan scrolling dan hapus pembatas tinggi (height) untuk Pagination */
          body, html, .dashboard-layout, .main-content, .content-body, .card, div {
            overflow: visible !important;
            height: auto !important;
            min-height: auto !important;
          }
          /* Maksimalkan lebar kertas */
          .main-content {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
          .content-body {
            padding: 0 !important;
          }
          /* Styling tabel khusus cetak */
          table {
            border-collapse: collapse !important;
            width: 100% !important;
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          th {
            background-color: #f1f5f9 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          th, td {
            border: 1px solid #cbd5e1 !important;
            padding: 8px 12px !important;
          }
          .matrix-table {
            zoom: 0.55; /* Perkecil hingga 55% agar 30 kolom hari muat di satu layar A4 Landscape */
            font-size: 11px !important;
          }
          .matrix-table th, .matrix-table td {
            padding: 4px 6px !important;
            white-space: nowrap !important;
            position: static !important; /* Mencegah bug sticky header saat PDF dicetak */
          }
          .print-header {
            display: block !important;
            margin-bottom: 20px;
            text-align: center;
          }
        }
        .print-header {
          display: none;
        }
      `}} />

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

      {/* Bagian 1: Dataset Kaggle Integration Card (Disembunyikan Sementara) */}
      <div className="card no-print" style={{ display: "none", background: "#ffffff", border: "1px solid #e2e8f0" }}>
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
      <div className="card no-print" style={{ background: "#ffffff", border: "1px solid #e2e8f0", padding: "1.75rem", borderRadius: "1rem", boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.03)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.75rem", paddingBottom: "1.25rem", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{
            padding: "0.75rem", borderRadius: "0.75rem",
            background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
            color: "#ffffff", boxShadow: "0 4px 10px rgba(15, 23, 42, 0.25)"
          }}>
            <Sparkles size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.01em" }}>
              AI Genetic Algorithm Generator
            </h3>
            <span style={{ fontSize: "0.85rem", color: "#64748b", display: "block", marginTop: "0.2rem" }}>
              Konfigurasi mesin cerdas untuk meracik jadwal shift optimal tanpa bentrok.
            </span>
          </div>
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem",
          background: "#f8fafc", padding: "1.25rem", borderRadius: "0.75rem", border: "1px solid #f1f5f9"
        }}>
          {/* Departemen */}
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.6rem" }}>
              Target Departemen
            </label>
            <select
              className="input-field"
              value={targetDept}
              onChange={(e) => setTargetDept(e.target.value)}
              style={{
                background: "#ffffff",
                border: "2px solid #e2e8f0",
                padding: "0.75rem 1rem",
                borderRadius: "0.5rem",
                fontSize: "0.95rem",
                fontWeight: 600,
                color: "#0f172a",
                boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)",
                cursor: "pointer"
              }}
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
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.6rem" }}>
              Tanggal Mulai
            </label>
            <input
              type="date"
              className="input-field"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                background: "#ffffff",
                border: "2px solid #e2e8f0",
                padding: "0.75rem 1rem",
                borderRadius: "0.5rem",
                fontSize: "0.95rem",
                fontWeight: 600,
                color: "#0f172a",
                boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)",
                cursor: "pointer"
              }}
            />
          </div>

          {/* Durasi Hari */}
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.6rem" }}>
              Durasi Penjadwalan
            </label>
            <select
              className="input-field"
              value={daysCount}
              onChange={(e) => setDaysCount(Number(e.target.value))}
              style={{
                background: "#ffffff",
                border: "2px solid #e2e8f0",
                padding: "0.75rem 1rem",
                borderRadius: "0.5rem",
                fontSize: "0.95rem",
                fontWeight: 600,
                color: "#0f172a",
                boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)",
                cursor: "pointer"
              }}
            >
              <option value={7}>7 Hari (Mingguan)</option>
              <option value={14}>14 Hari (Dua Mingguan)</option>
              <option value={30}>30 Hari (Bulanan)</option>
            </select>
          </div>
        </div>

        {/* Checkbox Jenis Shift */}
        <div style={{ marginTop: "1.75rem" }}>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "0.85rem" }}>
            Pilih Jenis Shift Dilibatkan:
          </label>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
            {["Shift Pagi", "Shift Sore", "Shift Malam"].map((type) => {
              const isSelected = selectedShiftTypes.includes(type);
              return (
                <div
                  key={type}
                  onClick={() => toggleShiftType(type)}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.85rem", cursor: "pointer",
                    padding: "1rem", borderRadius: "0.75rem",
                    border: `2px solid ${isSelected ? "#0f172a" : "#e2e8f0"}`,
                    background: isSelected ? "#f8fafc" : "#ffffff",
                    transition: "all 0.2s ease",
                    boxShadow: isSelected ? "0 4px 10px -2px rgba(15, 23, 42, 0.15)" : "none"
                  }}
                >
                  <div style={{
                    width: "22px", height: "22px", borderRadius: "6px",
                    background: isSelected ? "#0f172a" : "#f1f5f9",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: `1px solid ${isSelected ? "#0f172a" : "#cbd5e1"}`,
                    transition: "all 0.2s ease"
                  }}>
                    {isSelected && <CheckCircle2 size={16} color="#ffffff" />}
                  </div>
                  <div>
                    <div style={{ fontSize: "0.95rem", color: isSelected ? "#0f172a" : "#334155", fontWeight: 700 }}>
                      {type}
                    </div>
                    <span style={{ fontSize: "0.75rem", color: isSelected ? "#475569" : "#94a3b8", marginTop: "0.15rem", display: "block", fontWeight: 600 }}>
                      {type === "Shift Pagi" ? "08:00 - 16:00" : type === "Shift Sore" ? "16:00 - 00:00" : "00:00 - 08:00"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tombol Eksekusi */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid #e2e8f0" }}>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleClearSchedules}
            disabled={loadingClear || shifts.length === 0}
            style={{
              background: "transparent", color: "var(--danger)", border: "2px solid #fecaca",
              padding: "0.75rem 1.25rem", borderRadius: "0.5rem", fontWeight: 600, transition: "all 0.2s"
            }}
          >
            {loadingClear ? <Loader2 size={18} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={18} />}
            <span>Kosongkan Jadwal</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleGenerateGA}
            disabled={loadingGenerate || selectedShiftTypes.length === 0}
            style={{
              background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
              border: "none",
              color: "#ffffff",
              padding: "0.75rem 1.75rem", fontSize: "1rem", fontWeight: 700,
              boxShadow: "0 10px 15px -3px rgba(15, 23, 42, 0.3)",
              transition: "all 0.2s transform"
            }}
          >
            {loadingGenerate ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem", width: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <Loader2 size={18} style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} />
                  <span style={{ fontSize: "0.9rem" }}>Algoritma Genetika Berjalan...</span>
                </div>
                <span
                  key={generatePhase}
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 400,
                    opacity: 0.8,
                    animation: "slideUp 0.4s ease",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "260px"
                  }}
                >
                  {GA_LOADING_LABELS[generatePhase]}
                </span>
              </div>
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
      <div className="card print-area" style={{ background: "#ffffff", border: "1px solid #e2e8f0", padding: 0, overflow: "hidden" }}>

        {/* Print Header untuk PDF */}
        <div className="print-header">
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>Jadwal Shift Karyawan</h2>
          <p style={{ fontSize: "0.9rem", color: "#64748b", margin: "4px 0 0 0" }}>
            Departemen: {targetDept === "ALL" ? "Semua Departemen" : targetDept} | Tanggal Mulai: {startDate}
          </p>
          <hr style={{ margin: "1rem 0", borderTop: "2px solid #0f172a" }} />
        </div>

        <div className="no-print" style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Calendar size={18} color="#0f172a" />
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
              {isDraftMode ? "Mode Draft: Pratinjau Jadwal" : "Daftar Jadwal Shift Terbentuk"} ({displayShifts.length} Slot)
            </h3>
          </div>

          {isDraftMode ? (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleCancelDraft}
                disabled={loadingSaveDraft}
                style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", background: "#fff", color: "var(--danger)", border: "1px solid #fecaca" }}
              >
                <XCircle size={14} />
                <span>Batalkan</span>
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmDraft}
                disabled={loadingSaveDraft}
                style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", background: "#10b981", borderColor: "#10b981" }}
              >
                {loadingSaveDraft ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                <span>Konfirmasi & Simpan</span>
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
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
              {shifts.length > 0 && (
                <>
                  <div className="no-print" style={{ display: "flex", gap: "0.25rem", background: "#f1f5f9", padding: "0.25rem", borderRadius: "0.5rem", marginRight: "0.5rem" }}>
                    <button
                      type="button"
                      onClick={() => setViewMode("matrix")}
                      style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem", fontWeight: 600, background: viewMode === "matrix" ? "#fff" : "transparent", color: viewMode === "matrix" ? "#0f172a" : "#64748b", borderRadius: "0.35rem", border: "none", boxShadow: viewMode === "matrix" ? "0 1px 2px rgba(0,0,0,0.05)" : "none", cursor: "pointer" }}
                    >Matriks</button>
                    <button
                      type="button"
                      onClick={() => setViewMode("list")}
                      style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem", fontWeight: 600, background: viewMode === "list" ? "#fff" : "transparent", color: viewMode === "list" ? "#0f172a" : "#64748b", borderRadius: "0.35rem", border: "none", boxShadow: viewMode === "list" ? "0 1px 2px rgba(0,0,0,0.05)" : "none", cursor: "pointer" }}
                    >Daftar Baris</button>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleExportCSV}
                    style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", background: "#fff", color: "#0f172a", border: "1px solid #cbd5e1" }}
                  >
                    <Download size={14} />
                    <span>Ekspor CSV</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handlePrintPDF}
                    style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", background: "#2563eb", borderColor: "#2563eb" }}
                  >
                    <Printer size={14} />
                    <span>Cetak PDF</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {displayShifts.length === 0 ? (
          <div style={{ padding: "4rem 2rem", textAlign: "center", color: "#64748b" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem auto", color: "#94a3b8" }}>
              <Calendar size={28} />
            </div>
            <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", margin: "0 0 0.5rem 0" }}>Belum Ada Jadwal Terbentuk</h4>
            <p style={{ fontSize: "0.85rem", maxWidth: "420px", margin: "0 auto", lineHeight: 1.5 }}>
              Silakan atur parameter departemen dan durasi di atas, lalu klik tombol <strong>Generate Jadwal Otomatis (AI)</strong> untuk membuat jadwal tanpa bentrok.
            </p>
          </div>
        ) : viewMode === "matrix" && !isDraftMode ? (
          <div style={{ overflowX: "auto", paddingBottom: "1rem" }}>
            <table className="table matrix-table" style={{ width: "100%", borderCollapse: "collapse", whiteSpace: "nowrap" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
                  <th style={{ padding: "0.85rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", position: "sticky", left: 0, background: "#f8fafc", zIndex: 10, borderRight: "1px solid #e2e8f0" }}>Nama Karyawan</th>
                  <th style={{ padding: "0.85rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", borderRight: "1px solid #e2e8f0" }}>Total Shift</th>
                  {uniqueDates.map(dateKey => (
                    <th key={dateKey} style={{ padding: "0.85rem 0.2rem", minWidth: "40px", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textAlign: "center" }}>
                      {new Date(dateKey).getDate()}/{new Date(dateKey).getMonth() + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixData.map(([empName, data], idx) => (
                  <tr key={empName} style={{ background: idx % 2 === 0 ? "#ffffff" : "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "0.6rem 0.85rem", fontSize: "0.8rem", fontWeight: 600, color: "#0f172a", position: "sticky", left: 0, background: idx % 2 === 0 ? "#ffffff" : "#f8fafc", zIndex: 10, borderRight: "1px solid #e2e8f0" }}>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span>{empName.replace(/\s*\(.*?\)/, "")}</span>
                        <span style={{ fontSize: "0.65rem", color: "#64748b", fontWeight: 400 }}>{data.dept}</span>
                      </div>
                    </td>
                    <td style={{ padding: "0.6rem 0.85rem", fontSize: "0.85rem", fontWeight: 700, color: "#3b82f6", textAlign: "center", borderRight: "1px solid #e2e8f0" }}>
                      {data.total}
                    </td>
                    {uniqueDates.map(dateKey => {
                      const shiftTitle = data.shiftsByDate[dateKey];
                      let bg = "transparent"; let textColor = "#94a3b8"; let text = "-";
                      if (shiftTitle) {
                        if (shiftTitle.includes("Pagi")) { bg = "#fef3c7"; textColor = "#d97706"; text = "P"; }
                        else if (shiftTitle.includes("Sore")) { bg = "#e0f2fe"; textColor = "#0284c7"; text = "S"; }
                        else if (shiftTitle.includes("Malam")) { bg = "#1e293b"; textColor = "#ffffff"; text = "M"; }
                      }
                      return (
                        <td key={dateKey} style={{ padding: "0.4rem", textAlign: "center", borderRight: "1px dashed #f1f5f9" }}>
                          {shiftTitle ? (
                            <div style={{ background: bg, color: textColor, fontSize: "0.75rem", fontWeight: 700, width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "0.3rem", margin: "0 auto" }} title={shiftTitle}>
                              {text}
                            </div>
                          ) : (
                            <span style={{ color: "#cbd5e1" }}>-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
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
                  <th style={{ padding: "0.85rem 1.25rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Total Beban Shift</th>
                  <th className="no-print" style={{ padding: "0.85rem 1.25rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(groupedShifts).sort().map((dateKey, index) => {
                  const isVisibleOnScreen = index >= (currentPage - 1) * itemsPerPage && index < currentPage * itemsPerPage;
                  const rowClass = isVisibleOnScreen ? "" : "screen-hidden";

                  return (
                    <React.Fragment key={dateKey}>
                      <tr className={rowClass} style={{ background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
                        <td colSpan={6} style={{ padding: "0.5rem 1.25rem", fontSize: "0.8rem", fontWeight: 700, color: "#0f172a" }}>
                          📅 {formatDateTime(dateKey)}
                        </td>
                      </tr>
                      {groupedShifts[dateKey].map((shift: any) => (
                        <tr 
                          key={shift.id} 
                          className={rowClass} 
                          style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <td style={{ padding: "0.85rem 1.25rem", fontSize: "0.85rem", color: "#334155", paddingLeft: "2.5rem" }}>
                            {formatDateTime(shift.startTime).split(",")[0]}
                          </td>
                          <td style={{ padding: "0.85rem 1.25rem", fontSize: "0.85rem", color: "#0f172a", fontWeight: 600 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <span style={{
                                padding: "0.25rem 0.6rem", borderRadius: "0.35rem", fontSize: "0.75rem", fontWeight: 700,
                                background: shift.title.includes("Pagi") ? "#fef3c7" : shift.title.includes("Sore") ? "#e0f2fe" : "#1e293b",
                                color: shift.title.includes("Pagi") ? "#d97706" : shift.title.includes("Sore") ? "#0284c7" : "#ffffff"
                              }}>
                                {shift.title}
                              </span>
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 400, marginTop: "0.15rem" }}>
                              {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                            </div>
                          </td>
                          <td style={{ padding: "0.85rem 1.25rem" }}>
                            {isDraftMode ? (
                              <select
                                value={shift.employeeId}
                                onChange={(e) => handleDraftEmployeeChange(shift.id, e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "0.4rem",
                                  borderRadius: "0.4rem",
                                  border: "1px solid #cbd5e1",
                                  background: "#fff",
                                  fontSize: "0.85rem",
                                  fontWeight: 500,
                                  color: "#0f172a",
                                  cursor: "pointer"
                                }}
                              >
                                <option value="" disabled>Pilih Staf</option>
                                {employees
                                  .filter((e: any) => targetDept === "ALL" || e.department === targetDept)
                                  .map((emp: any) => (
                                    <option key={emp.id} value={emp.id}>
                                      {emp.name} ({emp.experienceYears} thn)
                                    </option>
                                  ))}
                              </select>
                            ) : (
                              <>
                                <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.9rem" }}>{shift.employee?.name || "Staf Tidak Dikenal"}</div>
                                {shift.employee?.experienceYears && (
                                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Pengalaman: {shift.employee.experienceYears} Tahun</div>
                                )}
                              </>
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
                          <td style={{ padding: "0.85rem 1.25rem", fontSize: "0.85rem", color: "#0f172a", fontWeight: 700 }}>
                            {employeeShiftCounts[shift.employeeId || shift.employee?.id] || 0} <span style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 500 }}>Hari</span>
                          </td>
                          <td className="no-print" style={{ padding: "0.85rem 1.25rem" }}>
                            <span style={{
                              padding: "0.25rem 0.6rem",
                              borderRadius: "99px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              background: isDraftMode ? "#fef3c7" : "#f0fdf4",
                              color: isDraftMode ? "#d97706" : "#15803d",
                              border: `1px solid ${isDraftMode ? "#fde68a" : "#bbf7d0"}`
                            }}>
                              {isDraftMode ? "DRAFT" : "AI SCHEDULED"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {Object.keys(groupedShifts).length > itemsPerPage && displayShifts.length > 0 && (
          <div className="no-print" style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1rem 1.5rem",
            borderTop: "1px solid #e2e8f0",
            background: "#f8fafc"
          }}>
            <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
              Menampilkan halaman <strong style={{ color: "#0f172a" }}>{currentPage}</strong> dari <strong style={{ color: "#0f172a" }}>{Math.ceil(Object.keys(groupedShifts).length / itemsPerPage)}</strong>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: "0.4rem 0.8rem",
                  fontSize: "0.85rem",
                  background: "#fff",
                  color: "#0f172a",
                  fontWeight: 500,
                  border: "1px solid #cbd5e1",
                  borderRadius: "0.375rem",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  opacity: currentPage === 1 ? 0.5 : 1,
                  transition: "all 0.2s"
                }}
              >
                &lt; Sebelumnya
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(Object.keys(groupedShifts).length / itemsPerPage), p + 1))}
                disabled={currentPage === Math.ceil(Object.keys(groupedShifts).length / itemsPerPage)}
                style={{
                  padding: "0.4rem 0.8rem",
                  fontSize: "0.85rem",
                  background: "#fff",
                  color: "#0f172a",
                  fontWeight: 500,
                  border: "1px solid #cbd5e1",
                  borderRadius: "0.375rem",
                  cursor: currentPage === Math.ceil(Object.keys(groupedShifts).length / itemsPerPage) ? "not-allowed" : "pointer",
                  opacity: currentPage === Math.ceil(Object.keys(groupedShifts).length / itemsPerPage) ? 0.5 : 1,
                  transition: "all 0.2s"
                }}
              >
                Selanjutnya &gt;
              </button>
            </div>
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
