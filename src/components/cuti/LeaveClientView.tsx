"use client";

import React, { useState } from "react";
import {
  CalendarOff,
  Plus,
  Trash2,
  Search,
  Calendar,
  User,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import LeaveFormModal from "./LeaveFormModal";
import { deleteLeave } from "@/actions/cuti";

export interface LeaveData {
  id: string;
  type: string;
  startDate: string | Date;
  endDate: string | Date;
  notes: string | null;
  employeeId: string;
  employee: {
    id: string;
    name: string;
    role: string;
    department: string | null;
  };
  createdAt: string | Date;
}

export interface EmployeeOption {
  id: string;
  name: string;
  department: string | null;
}

interface LeaveClientViewProps {
  initialLeaves: LeaveData[];
  employees: EmployeeOption[];
}

const LEAVE_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Cuti Melahirkan": { bg: "#fce7f3", text: "#be185d", border: "#f9a8d4" },
  "Cuti Sakit": { bg: "#fee2e2", text: "#b91c1c", border: "#fca5a5" },
  "Izin Pribadi": { bg: "#e0e7ff", text: "#3730a3", border: "#a5b4fc" },
  "Cuti Tahunan": { bg: "#ecfdf5", text: "#065f46", border: "#6ee7b7" },
  "Cuti Khusus": { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" },
};

const ITEMS_PER_PAGE = 8;

export default function LeaveClientView({ initialLeaves, employees }: LeaveClientViewProps) {
  const [leaves, setLeaves] = useState<LeaveData[]>(initialLeaves);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [showFormModal, setShowFormModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const formatDate = (dateStr: string | Date) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const isActiveLeave = (endDate: string | Date) => {
    return new Date(endDate) >= new Date();
  };

  // Filter leaves
  const filteredLeaves = leaves.filter((leave) => {
    const matchSearch =
      leave.employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      leave.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter === "ALL" || leave.type === typeFilter;
    return matchSearch && matchType;
  });

  const totalPages = Math.max(1, Math.ceil(filteredLeaves.length / ITEMS_PER_PAGE));
  const paginatedLeaves = filteredLeaves.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const leaveTypes = Array.from(new Set(leaves.map((l) => l.type)));

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    const result = await deleteLeave(id);
    if (result.success) {
      setLeaves((prev) => prev.filter((l) => l.id !== id));
    }
    setDeleteConfirmId(null);
    setIsDeleting(false);
  };

  const handleLeaveCreated = (newLeave: LeaveData) => {
    setLeaves((prev) => [newLeave, ...prev]);
    setShowFormModal(false);
  };

  const activeCount = leaves.filter((l) => isActiveLeave(l.endDate)).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>
            Kelola Cuti Karyawan
          </h2>
          <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.9rem", color: "#64748b", fontWeight: 500 }}>
            Atur jadwal cuti, izin, dan ketidakhadiran karyawan
          </p>
        </div>
        <button
          onClick={() => setShowFormModal(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.65rem 1.25rem",
            background: "#0f172a",
            color: "#fff",
            border: "none",
            borderRadius: "0.5rem",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#1e293b")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#0f172a")}
        >
          <Plus size={16} />
          <span>Tambah Cuti Baru</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
        <div className="card" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1.25rem" }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569" }}>
            <CalendarOff size={22} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Cuti</p>
            <h3 style={{ margin: "0.15rem 0 0 0", fontSize: "1.5rem", fontWeight: 800, color: "#0f172a" }}>{leaves.length}</h3>
          </div>
        </div>

        <div className="card" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1.25rem" }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", color: "#059669" }}>
            <Calendar size={22} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Cuti Aktif</p>
            <h3 style={{ margin: "0.15rem 0 0 0", fontSize: "1.5rem", fontWeight: 800, color: "#0f172a" }}>{activeCount}</h3>
          </div>
        </div>

        <div className="card" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1.25rem" }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "#e0e7ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#4f46e5" }}>
            <User size={22} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Karyawan Cuti</p>
            <h3 style={{ margin: "0.15rem 0 0 0", fontSize: "1.5rem", fontWeight: 800, color: "#0f172a" }}>
              {new Set(leaves.filter((l) => isActiveLeave(l.endDate)).map((l) => l.employeeId)).size}
            </h3>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="card" style={{ padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1, minWidth: "200px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "0.5rem", padding: "0.5rem 0.75rem" }}>
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="Cari nama karyawan atau jenis cuti..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontSize: "0.85rem", color: "#0f172a" }}
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
          style={{ padding: "0.55rem 0.75rem", border: "1px solid #e2e8f0", borderRadius: "0.5rem", fontSize: "0.85rem", color: "#0f172a", background: "#f8fafc", cursor: "pointer" }}
        >
          <option value="ALL">Semua Jenis</option>
          {leaveTypes.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {paginatedLeaves.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", background: "#f8fafc" }}>
            <CalendarOff size={36} color="#94a3b8" style={{ margin: "0 auto 1rem auto", opacity: 0.5 }} />
            <p style={{ margin: 0, color: "#64748b", fontWeight: 500 }}>
              {searchQuery || typeFilter !== "ALL" ? "Tidak ada data cuti yang sesuai filter." : "Belum ada data cuti. Klik \"Tambah Cuti Baru\" untuk memulai."}
            </p>
          </div>
        ) : (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "0.85rem 1.25rem", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Karyawan</th>
                  <th style={{ padding: "0.85rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Jenis Cuti</th>
                  <th style={{ padding: "0.85rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Periode</th>
                  <th style={{ padding: "0.85rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Catatan</th>
                  <th style={{ padding: "0.85rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</th>
                  <th style={{ padding: "0.85rem 1rem", textAlign: "center", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLeaves.map((leave) => {
                  const colors = LEAVE_TYPE_COLORS[leave.type] || { bg: "#f1f5f9", text: "#475569", border: "#cbd5e1" };
                  const active = isActiveLeave(leave.endDate);

                  return (
                    <tr key={leave.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }} onMouseEnter={(e) => (e.currentTarget.style.background = "#fafbfc")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <td style={{ padding: "1rem 1.25rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <div style={{ width: "36px", height: "36px", borderRadius: "99px", background: "#e0f2fe", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.8rem" }}>
                            {leave.employee.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: "#0f172a" }}>{leave.employee.name}</p>
                            <p style={{ margin: "0.1rem 0 0 0", fontSize: "0.75rem", color: "#64748b" }}>{leave.employee.department || "—"} • {leave.employee.role}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "1rem" }}>
                        <span style={{ display: "inline-block", padding: "0.25rem 0.6rem", background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: "99px", fontSize: "0.75rem", fontWeight: 600 }}>
                          {leave.type}
                        </span>
                      </td>
                      <td style={{ padding: "1rem" }}>
                        <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600, color: "#0f172a" }}>{formatDate(leave.startDate)}</p>
                        <p style={{ margin: "0.15rem 0 0 0", fontSize: "0.8rem", color: "#64748b" }}>s/d {formatDate(leave.endDate)}</p>
                      </td>
                      <td style={{ padding: "1rem" }}>
                        <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {leave.notes || "—"}
                        </p>
                      </td>
                      <td style={{ padding: "1rem" }}>
                        <span style={{
                          display: "inline-block",
                          padding: "0.2rem 0.55rem",
                          background: active ? "#ecfdf5" : "#f1f5f9",
                          color: active ? "#059669" : "#94a3b8",
                          border: `1px solid ${active ? "#6ee7b7" : "#e2e8f0"}`,
                          borderRadius: "99px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                        }}>
                          {active ? "Aktif" : "Selesai"}
                        </span>
                      </td>
                      <td style={{ padding: "1rem", textAlign: "center" }}>
                        <button
                          onClick={() => setDeleteConfirmId(leave.id)}
                          style={{ padding: "0.4rem", background: "transparent", border: "1px solid #e2e8f0", borderRadius: "0.375rem", cursor: "pointer", color: "#94a3b8", transition: "all 0.15s" }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = "#dc2626"; e.currentTarget.style.borderColor = "#fca5a5"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
                          title="Hapus cuti"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1.25rem", borderTop: "1px solid #f1f5f9" }}>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>
                  Menampilkan {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredLeaves.length)} dari {filteredLeaves.length}
                </p>
                <div style={{ display: "flex", gap: "0.25rem" }}>
                  <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ padding: "0.35rem", background: currentPage === 1 ? "#f8fafc" : "#fff", border: "1px solid #e2e8f0", borderRadius: "0.375rem", cursor: currentPage === 1 ? "default" : "pointer", color: currentPage === 1 ? "#cbd5e1" : "#475569" }}>
                    <ChevronLeft size={16} />
                  </button>
                  <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{ padding: "0.35rem", background: currentPage === totalPages ? "#f8fafc" : "#fff", border: "1px solid #e2e8f0", borderRadius: "0.375rem", cursor: currentPage === totalPages ? "default" : "pointer", color: currentPage === totalPages ? "#cbd5e1" : "#475569" }}>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }} onClick={() => !isDeleting && setDeleteConfirmId(null)}>
          <div className="card" style={{ background: "#fff", borderRadius: "1rem", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)", padding: "2rem", maxWidth: "400px", width: "90%", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: "48px", height: "48px", borderRadius: "99px", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem auto" }}>
              <AlertCircle size={24} color="#dc2626" />
            </div>
            <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>Hapus Data Cuti?</h3>
            <p style={{ margin: "0 0 1.5rem 0", fontSize: "0.85rem", color: "#64748b" }}>
              Data cuti ini akan dihapus secara permanen dan karyawan akan kembali tersedia untuk penjadwalan.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
              <button
                onClick={() => setDeleteConfirmId(null)}
                disabled={isDeleting}
                style={{ padding: "0.55rem 1.25rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "0.5rem", fontSize: "0.85rem", fontWeight: 600, color: "#475569", cursor: "pointer" }}
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={isDeleting}
                style={{ padding: "0.55rem 1.25rem", background: "#dc2626", border: "none", borderRadius: "0.5rem", fontSize: "0.85rem", fontWeight: 600, color: "#fff", cursor: isDeleting ? "wait" : "pointer", opacity: isDeleting ? 0.7 : 1 }}
              >
                {isDeleting ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showFormModal && (
        <LeaveFormModal
          employees={employees}
          onClose={() => setShowFormModal(false)}
          onCreated={handleLeaveCreated}
        />
      )}
    </div>
  );
}
