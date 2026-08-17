"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { createLeave } from "@/actions/cuti";
import type { EmployeeOption, LeaveData } from "./LeaveClientView";

const LEAVE_TYPES = [
  "Cuti Melahirkan",
  "Cuti Sakit",
  "Izin Pribadi",
  "Cuti Tahunan",
  "Cuti Khusus",
];

interface LeaveFormModalProps {
  employees: EmployeeOption[];
  onClose: () => void;
  onCreated: (leave: LeaveData) => void;
}

export default function LeaveFormModal({ employees, onClose, onCreated }: LeaveFormModalProps) {
  const [employeeId, setEmployeeId] = useState("");
  const [type, setType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!employeeId || !type || !startDate || !endDate) {
      setError("Semua field wajib harus diisi.");
      return;
    }

    setIsSubmitting(true);

    const result = await createLeave({
      employeeId,
      type,
      startDate,
      endDate,
      notes: notes || undefined,
    });

    if (result.success) {
      if (result.message) {
        alert(result.message);
      }
      const emp = employees.find((e) => e.id === employeeId);
      onCreated({
        id: `temp_${Date.now()}`,
        type,
        startDate,
        endDate,
        notes: notes || null,
        employeeId,
        employee: {
          id: employeeId,
          name: emp?.name || "—",
          role: "—",
          department: emp?.department || null,
        },
        createdAt: new Date().toISOString(),
      });
    } else {
      setError(result.error || "Gagal menyimpan data cuti.");
      setIsSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.6rem 0.75rem",
    border: "1px solid #e2e8f0",
    borderRadius: "0.5rem",
    fontSize: "0.85rem",
    color: "#0f172a",
    background: "#fff",
    outline: "none",
    transition: "border-color 0.15s",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "#475569",
    marginBottom: "0.35rem",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ background: "#fff", borderRadius: "1rem", padding: "0", maxWidth: "480px", width: "90%", overflow: "hidden", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
          <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>Tambah Cuti Baru</h3>
          <button
            onClick={onClose}
            style={{ padding: "0.35rem", background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8", borderRadius: "0.375rem", transition: "color 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#0f172a")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {error && (
            <div style={{ padding: "0.65rem 0.85rem", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "0.5rem", color: "#b91c1c", fontSize: "0.8rem", fontWeight: 500 }}>
              {error}
            </div>
          )}

          {/* Employee Select */}
          <div>
            <label style={labelStyle}>Karyawan *</label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}
              required
            >
              <option value="">— Pilih Karyawan —</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} {emp.department ? `(${emp.department})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Leave Type */}
          <div>
            <label style={labelStyle}>Jenis Cuti *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}
              required
            >
              <option value="">— Pilih Jenis Cuti —</option>
              {LEAVE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={labelStyle}>Tanggal Mulai *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Tanggal Selesai *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
                style={inputStyle}
                required
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Catatan (Opsional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Keterangan tambahan..."
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", paddingTop: "0.5rem" }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: "0.55rem 1.25rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "0.5rem", fontSize: "0.85rem", fontWeight: 600, color: "#475569", cursor: "pointer" }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: "0.55rem 1.5rem",
                background: "#0f172a",
                border: "none",
                borderRadius: "0.5rem",
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "#fff",
                cursor: isSubmitting ? "wait" : "pointer",
                opacity: isSubmitting ? 0.7 : 1,
                transition: "background 0.2s",
              }}
            >
              {isSubmitting ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
