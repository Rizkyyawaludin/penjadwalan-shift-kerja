"use client";

import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Clock, User, Filter } from "lucide-react";

interface ShiftData {
  id: string;
  title: string;
  startTime: string | Date;
  endTime: string | Date;
  employee: {
    name: string;
    department: string;
    role: string;
  };
}

export default function InteractiveCalendar({ initialShifts }: { initialShifts: ShiftData[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDept, setSelectedDept] = useState("ALL");

  // Navigasi Bulan
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  // Filter Shifts
  const filteredShifts = useMemo(() => {
    return initialShifts.filter(shift =>
      selectedDept === "ALL" || shift.employee?.department === selectedDept
    );
  }, [initialShifts, selectedDept]);

  // Logika Grid Kalender
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null); // padding kosong sebelum tanggal 1
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
  }

  // Nama Hari
  const weekDays = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

  // Helper untuk mendapatkan shift pada tanggal tertentu
  const pad = (n: number) => n.toString().padStart(2, "0");
  const getShiftsForDate = (date: Date) => {
    // date adalah local time dari grid kalender
    const targetDateString = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

    return filteredShifts.filter(shift => {
      // Waktu shift di server selalu tersimpan dalam UTC sesuai tanggal yang digenerate
      const shiftDate = new Date(shift.startTime);
      const shiftDateStr = `${shiftDate.getUTCFullYear()}-${pad(shiftDate.getUTCMonth() + 1)}-${pad(shiftDate.getUTCDate())}`;

      return shiftDateStr === targetDateString;
    });
  };

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", border: "1px solid #e2e8f0" }}>

      {/* Header Kalender */}
      <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button onClick={prevMonth} className="btn-icon" style={{ background: "#ffffff", border: "1px solid #cbd5e1" }}>
            <ChevronLeft size={18} />
          </button>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#0f172a", margin: 0, minWidth: "160px", textAlign: "center" }}>
            {currentDate.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
          </h2>
          <button onClick={nextMonth} className="btn-icon" style={{ background: "#ffffff", border: "1px solid #cbd5e1" }}>
            <ChevronRight size={18} />
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Filter size={16} color="#64748b" />
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            style={{ padding: "0.4rem 0.75rem", borderRadius: "99px", border: "1px solid #cbd5e1", fontSize: "0.85rem", fontWeight: 600, color: "#0f172a", background: "#ffffff", outline: "none" }}
          >
            <option value="ALL">Semua Departemen</option>
            <option value="ER">ER (Emergency)</option>
            <option value="ICU">ICU</option>
            <option value="Pediatrics">Pediatrics</option>
            <option value="General Medicine">General Med</option>
          </select>
        </div>
      </div>

      {/* Grid Kalender */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "#e2e8f0", gap: "1px" }}>

        {/* Header Hari */}
        {weekDays.map(day => (
          <div key={day} style={{ background: "#ffffff", padding: "0.75rem", textAlign: "center", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
            {day}
          </div>
        ))}

        {/* Sel Tanggal */}
        {days.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} style={{ background: "#f8fafc", minHeight: "120px" }} />;
          }

          const dayShifts = getShiftsForDate(date);
          const isToday = new Date().toDateString() === date.toDateString();

          return (
            <div key={date.toISOString()} style={{ background: isToday ? "#f0fdf4" : "#ffffff", minHeight: "140px", padding: "0.5rem", display: "flex", flexDirection: "column", gap: "0.4rem", transition: "background 0.2s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{
                  width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%",
                  fontSize: "0.85rem", fontWeight: 700,
                  background: isToday ? "#15803d" : "transparent",
                  color: isToday ? "#ffffff" : "#0f172a"
                }}>
                  {date.getDate()}
                </span>
                {dayShifts.length > 0 && (
                  <span style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600, background: "#f1f5f9", padding: "0.15rem 0.4rem", borderRadius: "99px" }}>
                    {dayShifts.length} Shift
                  </span>
                )}
              </div>

              {/* Daftar Shift di Hari Ini (Grouped & Tidied) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", flex: 1, overflowY: "auto", paddingRight: "4px" }}>
                {(["Pagi", "Sore", "Malam"]).map(type => {
                  const shiftTitle = `Shift ${type}`;
                  const staffsForShift = dayShifts.filter(s => s.title.includes(type)).map(s => {
                    // Extract short name: "Dr. Rizki Santoso (S00000)" -> "Rizki"
                    return s.employee.name.replace(/\s*\(.*?\)/, "").replace(/^(Dr\.|Ns\.)\s*/, "").split(" ")[0];
                  });

                  if (staffsForShift.length === 0) return null;

                  let dotColor = "#cbd5e1";
                  let bg = "#f8fafc";
                  let textColor = "#334155";

                  if (type === "Pagi") {
                    dotColor = "#f59e0b"; bg = "#fffbeb"; textColor = "#92400e";
                  } else if (type === "Sore") {
                    dotColor = "#0ea5e9"; bg = "#f0f9ff"; textColor = "#0369a1";
                  } else if (type === "Malam") {
                    dotColor = "#6366f1"; bg = "#eef2ff"; textColor = "#3730a3";
                  }

                  return (
                    <div key={type} style={{
                      background: bg, borderLeft: `3px solid ${dotColor}`,
                      padding: "0.4rem 0.5rem", borderRadius: "0 0.3rem 0.3rem 0",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", marginBottom: "0.15rem" }}>
                        <span style={{ fontSize: "0.65rem", fontWeight: 800, color: dotColor, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          {type}
                        </span>
                        <span style={{ fontSize: "0.6rem", color: "#94a3b8", fontWeight: 600 }}>({staffsForShift.length})</span>
                      </div>
                      <div style={{ fontSize: "0.7rem", color: textColor, fontWeight: 500, lineHeight: 1.3 }}>
                        {staffsForShift.join(", ")}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
