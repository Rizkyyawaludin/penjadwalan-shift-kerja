"use client";

import React, { useState } from "react";
import { AlertTriangle, Trash2, Loader2, X } from "lucide-react";
import { deleteEmployee } from "@/actions/karyawan";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employeeToDelete?: { id: string; name: string } | null;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onSuccess,
  employeeToDelete,
}: DeleteConfirmModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !employeeToDelete) return null;

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await deleteEmployee(employeeToDelete.id);
      if (!res.success) {
        setError(res.error || "Gagal menghapus data.");
      } else {
        onSuccess();
        onClose();
      }
    } catch (err) {
      setError("Terjadi kesalahan koneksi server.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: "420px" }} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header" style={{ borderBottom: "none", paddingBottom: "0.5rem", background: "#ffffff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "var(--danger)" }}>
            <div style={{
              padding: "0.5rem",
              borderRadius: "0.5rem",
              background: "var(--danger-bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid #fecaca"
            }}>
              <AlertTriangle size={22} />
            </div>
            <h2 style={{ fontSize: "1.05rem", color: "#0f172a", fontWeight: 700 }}>Konfirmasi Hapus Data</h2>
          </div>
          <button className="btn-icon" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ paddingTop: "0.5rem" }}>
          <p style={{ fontSize: "0.9rem", color: "#334155", lineHeight: 1.5 }}>
            Apakah Anda yakin ingin menghapus data karyawan atas nama{" "}
            <strong style={{ color: "#0f172a" }}>{employeeToDelete.name}</strong>?
          </p>
          <p style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.5rem" }}>
            Tindakan ini tidak dapat dibatalkan dan seluruh riwayat atau keterikatan jadwal shift karyawan ini akan ikut terhapus dari sistem.
          </p>

          {error && (
            <div style={{
              marginTop: "1rem",
              padding: "0.75rem",
              borderRadius: "0.5rem",
              background: "var(--danger-bg)",
              color: "var(--danger)",
              fontSize: "0.85rem",
              border: "1px solid #fecaca"
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ background: "#f8fafc" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Batal
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} />
                <span>Menghapus...</span>
              </>
            ) : (
              <>
                <Trash2 size={16} />
                <span>Ya, Hapus Data</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
