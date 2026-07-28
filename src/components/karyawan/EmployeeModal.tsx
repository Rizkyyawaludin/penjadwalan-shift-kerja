"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Save, AlertCircle, Loader2 } from "lucide-react";
import { createEmployee, updateEmployee, EmployeeFormData } from "@/actions/karyawan";

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employeeToEdit?: { id: string; name: string; email: string; role: string } | null;
}

export default function EmployeeModal({
  isOpen,
  onClose,
  onSuccess,
  employeeToEdit,
}: EmployeeModalProps) {
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState<EmployeeFormData>({
    name: "",
    email: "",
    role: "STAFF",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (employeeToEdit) {
      setFormData({
        name: employeeToEdit.name,
        email: employeeToEdit.email,
        role: employeeToEdit.role,
      });
    } else {
      setFormData({
        name: "",
        email: "",
        role: "STAFF",
      });
    }
    setError(null);
  }, [employeeToEdit, isOpen]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let res;
      if (employeeToEdit) {
        res = await updateEmployee(employeeToEdit.id, formData);
      } else {
        res = await createEmployee(formData);
      }

      if (!res.success) {
        setError(res.error || "Terjadi kesalahan sistem.");
      } else {
        onSuccess();
        onClose();
      }
    } catch (err) {
      setError("Gagal menghubungi server database.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: "1.1rem", color: "#0f172a", fontWeight: 700 }}>
              {employeeToEdit ? "Edit Data Karyawan" : "Tambah Karyawan Baru"}
            </h2>
            <p style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.2rem" }}>
              {employeeToEdit
                ? "Perbarui informasi nama, email, atau jabatan shift karyawan."
                : "Masukkan identitas karyawan untuk diatur jadwal shift kerjanya."}
            </p>
          </div>
          <button className="btn-icon" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body & Form */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{
                padding: "0.75rem 1rem",
                borderRadius: "0.5rem",
                background: "var(--danger-bg)",
                border: "1px solid #fecaca",
                color: "var(--danger)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.85rem",
                marginBottom: "1.25rem"
              }}>
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Nama Lengkap Karyawan</label>
              <input
                type="text"
                required
                placeholder="Contoh: Budi Santoso"
                className="custom-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Alamat Email</label>
              <input
                type="email"
                required
                placeholder="Contoh: budi.s@perusahaan.com"
                className="custom-input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Jabatan / Peran (Role)</label>
              <select
                className="custom-select"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="STAFF">STAFF (Karyawan Operasional)</option>
                <option value="MANAGER">MANAGER (Koordinator Shift)</option>
              </select>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ minWidth: "120px" }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>{employeeToEdit ? "Simpan Perubahan" : "Simpan Data"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
