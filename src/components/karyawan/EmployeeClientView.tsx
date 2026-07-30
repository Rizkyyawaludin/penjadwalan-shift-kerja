"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  ShieldCheck, 
  UserCheck, 
  Calendar,
  Inbox
} from "lucide-react";
import EmployeeModal from "./EmployeeModal";
import DeleteConfirmModal from "./DeleteConfirmModal";

export interface EmployeeData {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string | null;
  experienceYears?: number | null;
  satisfactionScore?: number | null;
  createdAt: Date | string;
  _count: {
    shifts: number;
  };
}

interface EmployeeClientViewProps {
  initialEmployees: EmployeeData[];
  stats: {
    total: number;
    departmentCounts: Record<string, number>;
  };
}

export default function EmployeeClientView({
  initialEmployees,
  stats,
}: EmployeeClientViewProps) {
  const [employees, setEmployees] = useState<EmployeeData[]>(initialEmployees);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // State untuk Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeData | null>(null);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<{ id: string; name: string } | null>(null);

  // Sync state ketika props berubah (setelah Server Action revalidatePath)
  useEffect(() => {
    setEmployees(initialEmployees);
  }, [initialEmployees]);

  // Filter & Search Logika
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchSearch = 
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchRole = roleFilter === "ALL" || emp.role === roleFilter;

      return matchSearch && matchRole;
    });
  }, [employees, searchQuery, roleFilter]);

  const handleOpenAdd = () => {
    setSelectedEmployee(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (emp: EmployeeData) => {
    setSelectedEmployee(emp);
    setIsFormModalOpen(true);
  };

  const handleOpenDelete = (emp: EmployeeData) => {
    setEmployeeToDelete({ id: emp.id, name: emp.name });
    setIsDeleteModalOpen(true);
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  };

  return (
    <div>
      {/* Top Page Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.025em" }}>
            Kelola Data Karyawan
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.25rem" }}>
            Daftar seluruh karyawan operasional dan manajerial dalam sistem penjadwalan shift kerja.
          </p>
        </div>

        <button 
          className="btn btn-primary" 
          onClick={handleOpenAdd}
        >
          <UserPlus size={16} />
          <span>Tambah Karyawan Baru</span>
        </button>
      </div>

      {/* Statistics Grid */}
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <div className="stat-card hover-lift">
          <div className="stat-info">
            <h3>Total Karyawan</h3>
            <div className="stat-value">{stats.total}</div>
          </div>
          <div className="stat-icon" style={{ background: "#f8fafc", color: "#0f172a", borderColor: "#e2e8f0" }}>
            <Users size={22} />
          </div>
        </div>

        {Object.entries(stats.departmentCounts || {}).map(([dept, count], idx) => {
          // Buat warna berbeda per departemen untuk estetika
          const colors = [
            { text: "#0369a1", bg: "#e0f2fe", border: "#bae6fd" },
            { text: "#7e22ce", bg: "#f3e8ff", border: "#e9d5ff" },
            { text: "#047857", bg: "#d1fae5", border: "#a7f3d0" },
            { text: "#b45309", bg: "#fef3c7", border: "#fde68a" },
          ];
          const color = colors[idx % colors.length];

          return (
            <div key={dept} className="stat-card hover-lift">
              <div className="stat-info">
                <h3>{dept}</h3>
                <div className="stat-value" style={{ color: color.text }}>{count}</div>
              </div>
              <div className="stat-icon" style={{ background: color.bg, color: color.text, borderColor: color.border }}>
                <UserCheck size={22} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Toolbar: Search & Filter */}
      <div className="glass-panel" style={{ padding: "1rem 1.25rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ position: "relative", flex: "1 1 300px", maxWidth: "420px" }}>
          <input
            type="text"
            placeholder="Cari berdasarkan nama atau email..."
            className="custom-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: "2.5rem" }}
          />
          <Search size={16} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#64748b", fontSize: "0.85rem", fontWeight: 500 }}>
            <Filter size={15} />
            <span>Filter Role:</span>
          </div>
          <select
            className="custom-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ width: "auto", minWidth: "150px" }}
          >
            <option value="ALL">Semua Role</option>
            <option value="MANAGER">MANAGER</option>
            <option value="STAFF">STAFF</option>
          </select>
        </div>
      </div>

      {/* Data Table Panel */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Informasi Karyawan</th>
              <th>Alamat Email</th>
              <th>Pengalaman Kerja</th>
              <th>Departemen / Unit</th>
              <th>Shift Assigned</th>
              <th style={{ textAlign: "right", paddingRight: "1.5rem" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "4rem 2rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.875rem", color: "#64748b" }}>
                    <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", border: "1px solid #e2e8f0" }}>
                      <Inbox size={28} />
                    </div>
                    <div>
                      <h4 style={{ color: "#0f172a", fontSize: "0.95rem", fontWeight: 600 }}>Tidak ada data karyawan ditemukan</h4>
                      <p style={{ fontSize: "0.85rem", marginTop: "0.25rem", maxWidth: "380px", color: "#64748b" }}>
                        {searchQuery || roleFilter !== "ALL"
                          ? "Coba sesuaikan kata kunci pencarian atau filter role Anda."
                          : "Belum ada data karyawan yang tersimpan di dalam database."}
                      </p>
                    </div>
                    {(!searchQuery && roleFilter === "ALL") && (
                      <button className="btn btn-secondary" onClick={handleOpenAdd} style={{ marginTop: "0.25rem" }}>
                        <UserPlus size={15} />
                        <span>Tambah Karyawan Sekarang</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredEmployees.map((emp) => (
                <tr key={emp.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "0.5rem",
                        background: emp.role === "MANAGER" ? "#f3e8ff" : "#e0f2fe",
                        color: emp.role === "MANAGER" ? "#7e22ce" : "#0369a1",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "0.9rem",
                        border: `1px solid ${emp.role === "MANAGER" ? "#e9d5ff" : "#bae6fd"}`
                      }}>
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: "#0f172a" }}>{emp.name}</div>
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>ID: {emp.id.slice(-6)}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: "#475569" }}>{emp.email}</td>
                  <td>
                    {emp.experienceYears !== null && emp.experienceYears !== undefined ? (
                      <span style={{ fontWeight: 500, color: "#475569" }}>
                        {emp.experienceYears} tahun
                      </span>
                    ) : (
                      <span style={{ color: "#94a3b8" }}>-</span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: "#0f172a" }}>{emp.department || "Umum"}</span>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#0f172a", fontWeight: 500 }}>
                      <Calendar size={15} style={{ color: "#64748b" }} />
                      <span>{emp._count.shifts} shift</span>
                    </div>
                  </td>
                  <td style={{ textAlign: "right", paddingRight: "1.25rem" }}>
                    <div style={{ display: "inline-flex", gap: "0.35rem" }}>
                      <button
                        className="btn-icon"
                        onClick={() => handleOpenEdit(emp)}
                        title="Edit Data Karyawan"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => handleOpenDelete(emp)}
                        title="Hapus Karyawan"
                        style={{ color: "#dc2626" }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <EmployeeModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={() => {
          // Modal will close and revalidatePath will automatically update props
        }}
        employeeToEdit={selectedEmployee}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onSuccess={() => {
          // Modal will close and revalidatePath will automatically update props
        }}
        employeeToDelete={employeeToDelete}
      />
    </div>
  );
}
