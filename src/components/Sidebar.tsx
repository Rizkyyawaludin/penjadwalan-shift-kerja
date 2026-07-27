"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Users, 
  Calendar, 
  FileText, 
  Settings, 
  Clock, 
  ShieldCheck,
  LogOut
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Kelola Karyawan",
      href: "/dashboard/karyawan",
      icon: Users,
      active: pathname?.startsWith("/dashboard/karyawan"),
      badge: null,
    },
    {
      label: "Jadwal Shift",
      href: "/dashboard/jadwal",
      icon: Calendar,
      active: pathname?.startsWith("/dashboard/jadwal"),
      badge: null,
    },
    {
      label: "Laporan & Rekap",
      href: "/dashboard/laporan",
      icon: FileText,
      active: pathname?.startsWith("/dashboard/laporan"),
      badge: "Coming Soon",
    },
    {
      label: "Pengaturan",
      href: "/dashboard/pengaturan",
      icon: Settings,
      active: pathname?.startsWith("/dashboard/pengaturan"),
      badge: null,
    },
  ];

  return (
    <aside className="sidebar-nav glass-sidebar">
      {/* Brand Logo Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", paddingBottom: "1.5rem", borderBottom: "1px solid var(--border-light)", marginBottom: "1.5rem" }}>
        <div style={{
          width: "38px",
          height: "38px",
          borderRadius: "0.5rem",
          background: "#0f172a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
        }}>
          <Clock size={20} />
        </div>
        <div className="logo-text">
          <h1 style={{ fontSize: "1.05rem", fontWeight: 700, letterSpacing: "-0.02em", color: "#0f172a", lineHeight: 1.2 }}>
            ShiftMaster
          </h1>
          <span style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600, letterSpacing: "0.03em", textTransform: "uppercase" }}>
            Pro Admin
          </span>
        </div>
      </div>

      {/* Navigation Label */}
      <div className="nav-label" style={{ fontSize: "0.7rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem", paddingLeft: "0.5rem" }}>
        Menu Utama
      </div>

      {/* Navigation Links */}
      <nav style={{ flex: 1 }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${item.active ? "active" : ""}`}
              style={{ textDecoration: "none" }}
            >
              <Icon size={18} style={{ opacity: item.active ? 1 : 0.7 }} />
              <span style={{ flex: 1, fontSize: "0.875rem" }}>{item.label}</span>
              {item.badge && (
                <span className="badge badge-coming-soon">{item.badge}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile Footer */}
      <div style={{
        paddingTop: "1.25rem",
        borderTop: "1px solid var(--border-light)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.75rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
          <div style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "#f1f5f9",
            border: "1px solid #cbd5e1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#334155",
            fontWeight: 600,
            fontSize: "0.85rem"
          }}>
            AU
          </div>
          <div className="logo-text" style={{ minWidth: 0 }}>
            <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              Admin Utama
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "#059669", fontSize: "0.75rem", fontWeight: 500 }}>
              <ShieldCheck size={12} />
              <span>Superadmin</span>
            </div>
          </div>
        </div>
        <button 
          className="btn-icon" 
          title="Keluar dari sesi"
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
