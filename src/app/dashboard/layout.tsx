import React from "react";
import Sidebar from "@/components/Sidebar";
import { Bell, Search } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="main-content">
        {/* Top Header Bar */}
        <header className="glass-header" style={{
          padding: "1rem 2.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 40
        }}>
          <div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#0f172a" }}>
              Portal Manajemen Kerja
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
              Pantau jadwal shift dan kelola data operasional tim secara cepat dan rapi.
            </p>
          </div>

          {/* Quick Actions & Notifications */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ position: "relative", width: "260px" }}>
              <input 
                type="text" 
                placeholder="Cari menu atau fitur..." 
                className="custom-input"
                style={{ paddingLeft: "2.5rem", paddingRight: "1rem", paddingTop: "0.5rem", paddingBottom: "0.5rem", fontSize: "0.85rem" }}
              />
              <Search size={16} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
            </div>

            <button 
              className="btn-icon" 
              style={{ position: "relative", padding: "0.55rem", borderRadius: "0.5rem", background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a", cursor: "pointer" }}
              title="Notifikasi"
            >
              <Bell size={18} />
              <span style={{
                position: "absolute",
                top: "6px",
                right: "6px",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#2563eb",
                boxShadow: "0 0 0 2px #ffffff"
              }} />
            </button>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="content-body animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
