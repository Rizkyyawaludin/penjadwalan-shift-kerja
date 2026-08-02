import React, { useEffect, useState } from "react";
import { X, Calendar, Clock, Loader2 } from "lucide-react";
import { getShiftsByEmployee } from "@/actions/jadwal";
import { EmployeeData } from "./EmployeeClientView";

interface EmployeeShiftsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: EmployeeData | null;
}

export default function EmployeeShiftsModal({ isOpen, onClose, employee }: EmployeeShiftsModalProps) {
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && employee) {
      const fetchShifts = async () => {
        setLoading(true);
        const res = await getShiftsByEmployee(employee.id);
        if (res.success && res.data) {
          setShifts(res.data);
        }
        setLoading(false);
      };
      fetchShifts();
    }
  }, [isOpen, employee]);

  if (!isOpen || !employee) return null;

  const formatDateTime = (dateVal: string | Date) => {
    const d = new Date(dateVal);
    return d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  };

  const formatTime = (dateVal: string | Date) => {
    const d = new Date(dateVal);
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", backdropFilter: "blur(4px)", zIndex: 100 }}>
      <div className="modal-content animate-scale-up" onClick={(e) => e.stopPropagation()} style={{ background: "#fff", width: "100%", maxWidth: "600px", borderRadius: "1rem", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "85vh" }}>
        
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc" }}>
          <div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
              Jadwal Shift Karyawan
            </h3>
            <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.85rem", color: "#64748b" }}>
              Menampilkan jadwal untuk <span style={{ fontWeight: 600, color: "#334155" }}>{employee.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="btn-icon" style={{ background: "#fff", border: "1px solid #cbd5e1" }}>
            <X size={18} color="#64748b" />
          </button>
        </div>

        <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "3rem 0", color: "#64748b" }}>
              <Loader2 size={32} className="animate-spin" style={{ marginBottom: "1rem", color: "#2563eb" }} />
              <p style={{ margin: 0, fontWeight: 500 }}>Memuat daftar jadwal...</p>
            </div>
          ) : shifts.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", background: "#f1f5f9", borderRadius: "0.75rem", border: "1px dashed #cbd5e1" }}>
              <Calendar size={32} color="#94a3b8" style={{ margin: "0 auto 1rem auto" }} />
              <p style={{ margin: 0, color: "#64748b", fontWeight: 500 }}>Karyawan ini belum memiliki jadwal shift yang ditugaskan.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {shifts.map((shift) => (
                <div key={shift.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "0.75rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{ padding: "0.5rem", background: "#e0f2fe", color: "#0284c7", borderRadius: "0.5rem" }}>
                      <Calendar size={18} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#0f172a" }}>
                        {formatDateTime(shift.startTime)}
                      </h4>
                      <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.8rem", color: "#64748b", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        <Clock size={12} /> {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ display: "inline-block", padding: "0.25rem 0.6rem", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "99px", fontSize: "0.75rem", fontWeight: 700, color: "#0f172a" }}>
                      {shift.title}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
