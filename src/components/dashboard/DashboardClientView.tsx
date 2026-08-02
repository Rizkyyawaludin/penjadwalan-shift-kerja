"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Users, Stethoscope, Activity, CalendarDays, Clock } from "lucide-react";

interface DashboardClientViewProps {
  shifts: any[];
  employees: any[];
}

export default function DashboardClientView({ shifts, employees }: DashboardClientViewProps) {
  // Use state for "selectedDate" so it doesn't cause hydration mismatch between server and client
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const actualTodayStr = new Date().toDateString();

  useEffect(() => {
    setSelectedDate(new Date());
  }, []);

  // Compute Stats
  const stats = useMemo(() => {
    let total = employees.length;
    let doctors = 0;
    let nurses = 0;

    employees.forEach(emp => {
      const role = emp.role || "";
      if (role.toLowerCase().includes("dokter")) doctors++;
      if (role.toLowerCase().includes("perawat")) nurses++;
    });

    return { total, doctors, nurses };
  }, [employees]);

  // Compute Shifts for Selected Date
  const todaysShifts = useMemo(() => {
    if (!selectedDate) return [];
    const selectedStr = selectedDate.toDateString();

    return shifts
      .filter(shift => {
        const startDateStr = new Date(shift.startTime).toDateString();
        const endDateStr = new Date(shift.endTime).toDateString();
        return startDateStr === selectedStr || endDateStr === selectedStr;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [shifts, selectedDate]);

  // Format shift times
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  };

  // Calendar logic for current month
  const calendarDays = useMemo(() => {
    if (!selectedDate) return [];
    
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    
    // Add empty padding for first week
    let startDayOfWeek = firstDay.getDay() - 1; // Monday as first day
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Sunday is 6
    
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add actual days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    
    return days;
  }, [selectedDate]);

  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  if (!selectedDate) return null; // Avoid hydration mismatch

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      
      {/* Top Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.25rem" }}>
        
        <div className="card" style={{ display: "flex", alignItems: "center", gap: "1.25rem", padding: "1.5rem" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569" }}>
            <Users size={24} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Karyawan</p>
            <h3 style={{ margin: "0.25rem 0 0 0", fontSize: "1.75rem", fontWeight: 800, color: "#0f172a" }}>{stats.total}</h3>
          </div>
        </div>

        <div className="card" style={{ display: "flex", alignItems: "center", gap: "1.25rem", padding: "1.5rem" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "#e0e7ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#4f46e5" }}>
            <Stethoscope size={24} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Dokter</p>
            <h3 style={{ margin: "0.25rem 0 0 0", fontSize: "1.75rem", fontWeight: 800, color: "#0f172a" }}>{stats.doctors}</h3>
          </div>
        </div>

        <div className="card" style={{ display: "flex", alignItems: "center", gap: "1.25rem", padding: "1.5rem" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981" }}>
            <Activity size={24} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Perawat</p>
            <h3 style={{ margin: "0.25rem 0 0 0", fontSize: "1.75rem", fontWeight: 800, color: "#0f172a" }}>{stats.nurses}</h3>
          </div>
        </div>

      </div>

      {/* Main Grid: Shifts and Calendar */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: "1.5rem", alignItems: "start" }}>
        
        {/* Today's Shifts List */}
        <div className="card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", paddingBottom: "1rem", borderBottom: "1px solid #f1f5f9" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Clock size={18} color="#2563eb" />
              Jadwal Shift: 
            </h3>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#64748b", background: "#f8fafc", padding: "0.3rem 0.75rem", borderRadius: "99px" }}>
              {selectedDate.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}
            </span>
          </div>

          {todaysShifts.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", background: "#f8fafc", borderRadius: "0.5rem", border: "1px dashed #cbd5e1" }}>
              <CalendarDays size={32} color="#94a3b8" style={{ margin: "0 auto 1rem auto", opacity: 0.5 }} />
              <p style={{ margin: 0, color: "#64748b", fontWeight: 500 }}>Tidak ada jadwal shift untuk tanggal ini.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {todaysShifts.map(shift => (
                <div key={shift.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem", background: "#f8fafc", borderRadius: "0.5rem", border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "99px", background: "#e0f2fe", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.9rem" }}>
                      {shift.employee.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#0f172a" }}>{shift.employee.name}</h4>
                      <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.8rem", color: "#64748b", fontWeight: 500 }}>{shift.employee.department} • {shift.employee.role}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ display: "inline-block", padding: "0.25rem 0.6rem", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "0.3rem", fontSize: "0.8rem", fontWeight: 700, color: "#0f172a" }}>
                      {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                    </span>
                    <p style={{ margin: "0.3rem 0 0 0", fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>{shift.title}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mini Calendar */}
        <div className="card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
              {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
            </h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", textAlign: "center", marginBottom: "0.5rem" }}>
            {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map(day => (
              <div key={day} style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", padding: "0.5rem 0" }}>
                {day}
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
            {calendarDays.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} style={{ padding: "0.5rem" }} />;
              }

              const isSelected = date.toDateString() === selectedDate.toDateString();
              const isActualToday = date.toDateString() === actualTodayStr;
              
              // Check if there are any shifts on this day
              const hasShifts = shifts.some(s => new Date(s.startTime).toDateString() === date.toDateString() || new Date(s.endTime).toDateString() === date.toDateString());

              return (
                <div 
                  key={index}
                  onClick={() => setSelectedDate(date)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    aspectRatio: "1/1",
                    borderRadius: "0.5rem",
                    background: isSelected ? "#2563eb" : "transparent",
                    color: isSelected ? "#fff" : isActualToday ? "#2563eb" : "#334155",
                    fontWeight: isSelected || isActualToday ? 800 : 500,
                    fontSize: "0.85rem",
                    position: "relative",
                    cursor: "pointer",
                    transition: "background 0.2s"
                  }}
                  onMouseEnter={(e) => { if(!isSelected) e.currentTarget.style.background = "#f1f5f9" }}
                  onMouseLeave={(e) => { if(!isSelected) e.currentTarget.style.background = "transparent" }}
                >
                  {date.getDate()}
                  
                  {/* Indicator Dot */}
                  {hasShifts && !isSelected && (
                    <div style={{ position: "absolute", bottom: "4px", width: "4px", height: "4px", borderRadius: "50%", background: "#38bdf8" }} />
                  )}
                  {hasShifts && isSelected && (
                    <div style={{ position: "absolute", bottom: "4px", width: "4px", height: "4px", borderRadius: "50%", background: "#bfdbfe" }} />
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.75rem", color: "#64748b", fontWeight: 500 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#2563eb" }} /> Hari ini
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#38bdf8" }} /> Ada Shift
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
