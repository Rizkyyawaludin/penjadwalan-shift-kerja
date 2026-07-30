"use client";

import React, { useMemo, useState } from "react";
import { Download, Printer, Filter, Calendar } from "lucide-react";

interface LaporanClientViewProps {
  initialShifts: any[];
  employees: any[];
}

export default function LaporanClientView({ initialShifts, employees }: LaporanClientViewProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [selectedDept, setSelectedDept] = useState<string>("ALL");

  // Extract unique months from shifts for the filter dropdown
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    initialShifts.forEach(shift => {
      const date = new Date(shift.startTime);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; // e.g., "2026-07"
      months.add(monthStr);
    });
    return Array.from(months).sort();
  }, [initialShifts]);

  // Aggregate workload data
  const workloadData = useMemo(() => {
    // 1. Filter shifts by month if necessary
    const filteredShifts = initialShifts.filter(shift => {
      if (selectedMonth !== "ALL") {
        const date = new Date(shift.startTime);
        const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (monthStr !== selectedMonth) return false;
      }
      return true;
    });

    // 2. Aggregate by employeeId
    const employeeMap = new Map<string, { employee: any, totalShifts: number, totalHours: number }>();
    
    // Initialize map with all active employees that match the department filter
    employees.forEach(emp => {
      if (selectedDept !== "ALL" && emp.department !== selectedDept) return;
      employeeMap.set(emp.id, {
        employee: emp,
        totalShifts: 0,
        totalHours: 0
      });
    });

    // Calculate shifts and hours
    filteredShifts.forEach(shift => {
      if (employeeMap.has(shift.employeeId)) {
        const data = employeeMap.get(shift.employeeId)!;
        data.totalShifts += 1;
        
        // Calculate duration in hours
        const start = new Date(shift.startTime).getTime();
        const end = new Date(shift.endTime).getTime();
        const diffMs = end - start;
        const diffHours = diffMs / (1000 * 60 * 60);
        
        data.totalHours += diffHours;
      }
    });

    // Convert to array and sort by total hours descending
    return Array.from(employeeMap.values()).sort((a, b) => b.totalHours - a.totalHours);

  }, [initialShifts, employees, selectedMonth, selectedDept]);

  const handleExportCSV = () => {
    const headers = ["Nama Karyawan", "Departemen", "ID Staf", "Total Shift", "Total Jam Kerja"];
    
    const rows = workloadData.map(data => [
      `"${data.employee.name}"`,
      `"${data.employee.department || "Umum"}"`,
      `"${data.employee.kaggleStaffId || "-"}"`,
      data.totalShifts.toString(),
      data.totalHours.toFixed(1)
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    const monthLabel = selectedMonth === "ALL" ? "Semua_Bulan" : selectedMonth;
    const deptLabel = selectedDept === "ALL" ? "Semua_Dept" : selectedDept;
    
    link.setAttribute("href", url);
    link.setAttribute("download", `Laporan_Beban_Kerja_${deptLabel}_${monthLabel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const formatMonthLabel = (monthStr: string) => {
    if (monthStr === "ALL") return "Semua Bulan";
    const [year, month] = monthStr.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
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

      <div className="card print-area" style={{ padding: "1.5rem" }}>
        
        {/* Header untuk Print PDF (Disembunyikan di layar, ditampilkan di PDF) */}
        <div className="print-header">
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>Laporan Rekapitulasi Beban Kerja</h2>
          <p style={{ fontSize: "0.9rem", color: "#64748b", margin: "4px 0 0 0" }}>
            Periode: {formatMonthLabel(selectedMonth)} | Departemen: {selectedDept === "ALL" ? "Semua Departemen" : selectedDept}
          </p>
          <hr style={{ margin: "1rem 0", borderTop: "2px solid #0f172a" }} />
        </div>

        {/* Kontrol UI (Disembunyikan saat Print) */}
        <div className="no-print" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
          
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Filter size={16} color="#64748b" />
              <select 
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                style={{ padding: "0.4rem 0.75rem", borderRadius: "0.4rem", border: "1px solid #cbd5e1", fontSize: "0.85rem", fontWeight: 500 }}
              >
                <option value="ALL">Semua Departemen</option>
                <option value="ER">ER (Emergency)</option>
                <option value="ICU">ICU</option>
                <option value="Pediatrics">Pediatrics</option>
                <option value="General Medicine">General Med</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Calendar size={16} color="#64748b" />
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{ padding: "0.4rem 0.75rem", borderRadius: "0.4rem", border: "1px solid #cbd5e1", fontSize: "0.85rem", fontWeight: 500 }}
              >
                <option value="ALL">Semua Bulan</option>
                {availableMonths.map(month => (
                  <option key={month} value={month}>{formatMonthLabel(month)}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button 
              onClick={handleExportCSV}
              className="btn btn-secondary" 
              style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem", background: "#fff", color: "#0f172a", border: "1px solid #cbd5e1" }}
            >
              <Download size={14} />
              <span>Ekspor Excel (CSV)</span>
            </button>
            <button 
              onClick={handlePrintPDF}
              className="btn btn-primary" 
              style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem", background: "#2563eb", borderColor: "#2563eb" }}
            >
              <Printer size={14} />
              <span>Cetak / Ekspor PDF</span>
            </button>
          </div>
        </div>

        {/* Tabel Data */}
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                <th style={{ padding: "0.85rem 1.25rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Nama Karyawan</th>
                <th style={{ padding: "0.85rem 1.25rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Departemen</th>
                <th style={{ padding: "0.85rem 1.25rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Kaggle ID</th>
                <th style={{ padding: "0.85rem 1.25rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", textAlign: "center" }}>Total Shift</th>
                <th style={{ padding: "0.85rem 1.25rem", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", textAlign: "right" }}>Total Jam Kerja</th>
              </tr>
            </thead>
            <tbody>
              {workloadData.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "3rem", textAlign: "center", color: "#64748b", fontSize: "0.9rem" }}>
                    Tidak ada data beban kerja untuk filter yang dipilih.
                  </td>
                </tr>
              ) : (
                workloadData.map(({ employee, totalShifts, totalHours }) => (
                  <tr key={employee.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "0.85rem 1.25rem", fontWeight: 600, color: "#0f172a" }}>
                      {employee.name}
                    </td>
                    <td style={{ padding: "0.85rem 1.25rem" }}>
                      <span style={{
                        padding: "0.2rem 0.6rem",
                        borderRadius: "99px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        background: "#f1f5f9",
                        color: "#334155",
                      }}>
                        {employee.department || "Umum"}
                      </span>
                    </td>
                    <td style={{ padding: "0.85rem 1.25rem", fontSize: "0.8rem", color: "#64748b", fontFamily: "monospace" }}>
                      {employee.kaggleStaffId || "-"}
                    </td>
                    <td style={{ padding: "0.85rem 1.25rem", textAlign: "center", fontWeight: 600 }}>
                      <span style={{ 
                        display: "inline-block", 
                        minWidth: "32px", 
                        background: totalShifts > 0 ? "#e0f2fe" : "#f1f5f9", 
                        color: totalShifts > 0 ? "#0284c7" : "#94a3b8",
                        padding: "0.15rem 0.4rem", 
                        borderRadius: "0.3rem" 
                      }}>
                        {totalShifts}
                      </span>
                    </td>
                    <td style={{ padding: "0.85rem 1.25rem", textAlign: "right", fontWeight: 700, color: totalHours > 40 ? "#b45309" : "#0f172a" }}>
                      {totalHours.toFixed(1)} <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "#64748b" }}>jam</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {workloadData.length > 0 && (
          <div className="no-print" style={{ padding: "1rem 1.25rem", background: "#f8fafc", borderRadius: "0.5rem", marginTop: "1rem", display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
            <div style={{ color: "#0ea5e9", marginTop: "2px" }}>💡</div>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "#475569", lineHeight: 1.5 }}>
              <strong>Tips Ekspor PDF:</strong> Saat dialog cetak (Print) muncul, ubah *Destination* menjadi <strong>"Save as PDF"</strong>. Aktifkan opsi <em>Background graphics</em> agar warna tabel muncul dengan sempurna.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
