"use client";

import React, { useState } from "react";
import { Check, X, ShieldAlert, AlertTriangle, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { approveDraftSchedules, rejectDraftSchedules } from "@/actions/approval";

interface DraftShift {
  id: string;
  title: string;
  startTime: Date | string;
  endTime: Date | string;
  employee: {
    id: string;
    name: string;
    department: string | null;
  };
}

export default function ApprovalClientView({ 
  initialDrafts 
}: { 
  initialDrafts: DraftShift[];
  initialStats: any;
  initialEmployees: any;
}) {
  const [drafts, setDrafts] = useState<DraftShift[]>(initialDrafts);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: "success" | "error", text: string} | null>(null);
  const [viewMode, setViewMode] = useState<"matrix" | "list">("matrix");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 1;

  const handleApprove = async () => {
    if (!confirm("Anda yakin ingin MENYETUJUI semua jadwal draft ini?")) return;
    setLoading(true);
    setMessage(null);
    const result = await approveDraftSchedules();
    if (result.success) {
      setMessage({ type: "success", text: result.message || "Jadwal berhasil disetujui." });
      setDrafts([]);
    } else {
      setMessage({ type: "error", text: result.error || "Gagal menyetujui jadwal." });
    }
    setLoading(false);
  };

  const handleReject = async () => {
    if (!confirm("Anda yakin ingin MENOLAK dan MENGHAPUS semua jadwal draft ini? Admin harus men-generate ulang.")) return;
    setLoading(true);
    setMessage(null);
    const result = await rejectDraftSchedules();
    if (result.success) {
      setMessage({ type: "success", text: result.message || "Jadwal berhasil ditolak." });
      setDrafts([]);
    } else {
      setMessage({ type: "error", text: result.error || "Gagal menolak jadwal." });
    }
    setLoading(false);
  };

  const groupedByDate = drafts.reduce((acc, curr) => {
    const dateStr = new Date(curr.startTime).toISOString().split("T")[0];
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(curr);
    return acc;
  }, {} as Record<string, DraftShift[]>);

  const uniqueDates = Object.keys(groupedByDate).sort();

  const matrixData = React.useMemo(() => {
    const map = new Map<string, any>();
    drafts.forEach(shift => {
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
  }, [drafts]);

  if (drafts.length === 0 && !loading) {
    return (
      <div className="card" style={{ padding: "3rem", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
        <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#ecfdf5", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ShieldAlert size={32} />
        </div>
        <div>
          <h2 style={{ margin: "0 0 0.5rem 0", color: "#0f172a" }}>Tidak Ada Jadwal Draft</h2>
          <p style={{ margin: 0, color: "#64748b" }}>Semua jadwal sudah disetujui atau belum ada jadwal baru yang di-generate oleh Admin.</p>
        </div>
        {message && (
          <div style={{ marginTop: "1rem", padding: "1rem", borderRadius: "0.5rem", background: message.type === "success" ? "#d1fae5" : "#fee2e2", color: message.type === "success" ? "#065f46" : "#b91c1c", fontWeight: 500 }}>
            {message.text}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {message && (
        <div style={{ padding: "1rem", borderRadius: "0.5rem", background: message.type === "success" ? "#d1fae5" : "#fee2e2", color: message.type === "success" ? "#065f46" : "#b91c1c", fontWeight: 500, display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {message.type === "success" ? <Check size={18} /> : <AlertTriangle size={18} />}
          {message.text}
        </div>
      )}

      {/* Action Bar */}
      <div className="card" style={{ padding: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", borderLeft: "4px solid #f59e0b" }}>
        <div>
          <h3 style={{ margin: "0 0 0.25rem 0", color: "#92400e", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertTriangle size={18} /> Menunggu Persetujuan
          </h3>
          <p style={{ margin: 0, color: "#b45309", fontSize: "0.9rem" }}>
            Terdapat <strong>{drafts.length}</strong> shift yang menunggu persetujuan Anda.
          </p>
        </div>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "0.25rem", background: "#f1f5f9", padding: "0.25rem", borderRadius: "0.5rem" }}>
            <button
              type="button"
              onClick={() => setViewMode("matrix")}
              style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", fontWeight: 600, background: viewMode === "matrix" ? "#fff" : "transparent", color: viewMode === "matrix" ? "#0f172a" : "#64748b", borderRadius: "0.35rem", border: "none", boxShadow: viewMode === "matrix" ? "0 1px 2px rgba(0,0,0,0.05)" : "none", cursor: "pointer" }}
            >Matriks Baris</button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", fontWeight: 600, background: viewMode === "list" ? "#fff" : "transparent", color: viewMode === "list" ? "#0f172a" : "#64748b", borderRadius: "0.35rem", border: "none", boxShadow: viewMode === "list" ? "0 1px 2px rgba(0,0,0,0.05)" : "none", cursor: "pointer" }}
            >List Per Hari</button>
          </div>
          
          <button
            onClick={handleReject}
            disabled={loading}
            style={{
              padding: "0.75rem 1.25rem",
              borderRadius: "0.5rem",
              border: "1px solid #fecaca",
              background: "#fff",
              color: "#ef4444",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              transition: "all 0.2s"
            }}
          >
            <X size={18} />
            Tolak & Hapus
          </button>
          
          <button
            onClick={handleApprove}
            disabled={loading}
            style={{
              padding: "0.75rem 1.25rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "#10b981",
              color: "#fff",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              boxShadow: "0 4px 6px -1px rgba(16, 185, 129, 0.2)",
              transition: "all 0.2s"
            }}
          >
            <Check size={18} />
            {loading ? "Memproses..." : "Setujui Semua"}
          </button>
        </div>
      </div>

      {/* Draft List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {viewMode === "matrix" ? (
          <div className="card" style={{ overflowX: "auto", padding: "0" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", whiteSpace: "nowrap", fontSize: "0.85rem", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  <th style={{ padding: "0.75rem 1rem", position: "sticky", left: 0, background: "#f8fafc", zIndex: 10, borderRight: "2px solid #e2e8f0" }}>Nama Karyawan</th>
                  <th style={{ padding: "0.75rem 1rem", borderRight: "1px solid #e2e8f0" }}>Departemen</th>
                  <th style={{ padding: "0.75rem 1rem", borderRight: "2px solid #e2e8f0", textAlign: "center" }}>Total Shift</th>
                  {uniqueDates.map(d => (
                    <th key={d} style={{ padding: "0.75rem 1rem", borderRight: "1px solid #e2e8f0", textAlign: "center" }}>
                      {d.substring(5)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixData.map(([empName, data]) => (
                  <tr key={empName} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "0.75rem 1rem", position: "sticky", left: 0, background: "#ffffff", zIndex: 9, borderRight: "2px solid #e2e8f0", fontWeight: 600, color: "#0f172a" }}>
                      {empName}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", borderRight: "1px solid #e2e8f0", color: "#64748b" }}>
                      {data.dept || "—"}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", borderRight: "2px solid #e2e8f0", textAlign: "center", fontWeight: 700 }}>
                      {data.total}
                    </td>
                    {uniqueDates.map(d => {
                      const shift = data.shiftsByDate[d];
                      return (
                        <td key={d} style={{ padding: "0.5rem 0.25rem", borderRight: "1px solid #e2e8f0", textAlign: "center" }}>
                          {shift ? (
                            <span style={{
                              display: "inline-block",
                              padding: "0.25rem 0.5rem",
                              borderRadius: "0.35rem",
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              background: shift.includes("Pagi") ? "#e0f2fe" : shift.includes("Sore") ? "#fef3c7" : "#000000",
                              color: shift.includes("Pagi") ? "#0369a1" : shift.includes("Sore") ? "#b45309" : "#ffffff",
                            }}>
                              {shift.includes("Pagi") ? "P" : shift.includes("Sore") ? "S" : "M"}
                            </span>
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
          Object.entries(groupedByDate).slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(([date, shiftsOfDay]) => {
            const readableDate = new Date(date).toLocaleDateString("id-ID", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            });
            return (
              <div key={date} className="card" style={{ overflow: "hidden" }}>
                <div style={{ padding: "1rem 1.5rem", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <CalendarDays size={18} color="#64748b" />
                  <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#334155" }}>{readableDate}</h4>
                </div>
              <div style={{ padding: "0" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
                  <thead>
                    <tr style={{ background: "#f1f5f9", color: "#64748b" }}>
                      <th style={{ padding: "0.75rem 1.5rem", fontWeight: 600 }}>Shift</th>
                      <th style={{ padding: "0.75rem 1.5rem", fontWeight: 600 }}>Nama Karyawan</th>
                      <th style={{ padding: "0.75rem 1.5rem", fontWeight: 600 }}>Departemen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shiftsOfDay.map((shift) => (
                      <tr key={shift.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "0.75rem 1.5rem", fontWeight: 500, color: "#0f172a" }}>
                          <span style={{ 
                            display: "inline-block", 
                            padding: "0.25rem 0.75rem", 
                            borderRadius: "99px", 
                            background: shift.title.includes("Pagi") ? "#e0f2fe" : shift.title.includes("Sore") ? "#fef3c7" : "#000000",
                            color: shift.title.includes("Pagi") ? "#0369a1" : shift.title.includes("Sore") ? "#b45309" : "#ffffff",
                            fontSize: "0.75rem",
                            fontWeight: 700
                          }}>
                            {shift.title}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem 1.5rem", color: "#334155" }}>{shift.employee?.name || "—"}</td>
                        <td style={{ padding: "0.75rem 1.5rem", color: "#64748b" }}>{shift.employee?.department || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            );
          })
        )}
      </div>

      {viewMode === "list" && Object.keys(groupedByDate).length > itemsPerPage && (() => {
        const totalItems = Object.keys(groupedByDate).length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        return (
          <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.5rem", borderTop: "1px solid #e2e8f0", background: "#f8fafc", flexWrap: "wrap", gap: "1rem", borderRadius: "0.5rem" }}>
            <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
              Menampilkan <span style={{ fontWeight: 600, color: "#0f172a" }}>{(currentPage - 1) * itemsPerPage + 1}</span> - <span style={{ fontWeight: 600, color: "#0f172a" }}>{Math.min(currentPage * itemsPerPage, totalItems)}</span> dari total <span style={{ fontWeight: 600, color: "#0f172a" }}>{totalItems}</span> data
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="btn-icon"
                style={{ padding: "0.4rem", border: "1px solid #cbd5e1", borderRadius: "0.4rem", background: currentPage === 1 ? "#f8fafc" : "#fff", opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
              >
                <ChevronLeft size={16} />
              </button>
              
              <div style={{ display: "flex", alignItems: "center", margin: "0 0.5rem" }}>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    style={{
                      width: "32px",
                      height: "32px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "0.4rem",
                      border: "none",
                      background: currentPage === page ? "#0f172a" : "transparent",
                      color: currentPage === page ? "#fff" : "#64748b",
                      fontSize: "0.85rem",
                      fontWeight: currentPage === page ? 600 : 500,
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="btn-icon"
                style={{ padding: "0.4rem", border: "1px solid #cbd5e1", borderRadius: "0.4rem", background: currentPage === totalPages ? "#f8fafc" : "#fff", opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
