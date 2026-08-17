"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Calendar,
  CalendarDays,
  CalendarOff,
  ListTodo,
  FileText,
  Settings,
  Clock,
  ShieldCheck,
  LogOut,
  CheckSquare
} from "lucide-react";
import { logout } from "@/actions/auth";

export default function Sidebar({ userRole }: { userRole?: string }) {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      active: pathname === "/dashboard",
      badge: null,
      show: true,
    },
    {
      label: "Approval Jadwal",
      href: "/dashboard/approval",
      icon: CheckSquare,
      active: pathname?.startsWith("/dashboard/approval"),
      badge: "Draft",
      show: userRole === "HEAD_NURSE",
    },
    {
      label: "Kelola Karyawan",
      href: "/dashboard/karyawan",
      icon: Users,
      active: pathname?.startsWith("/dashboard/karyawan"),
      badge: null,
      show: true,
    },
    {
      label: "Kelola Cuti",
      href: "/dashboard/cuti",
      icon: CalendarOff,
      active: pathname?.startsWith("/dashboard/cuti"),
      badge: null,
      show: userRole === "HEAD_NURSE",
    },
    {
      label: "Jadwal Shift (Tabel)",
      href: "/dashboard/jadwal",
      icon: ListTodo,
      active: pathname === "/dashboard/jadwal",
      badge: null,
      show: userRole === "ADMIN",
    },

    {
      label: "Laporan & Rekap",
      href: "/dashboard/laporan",
      icon: FileText,
      active: pathname?.startsWith("/dashboard/laporan"),
      badge: null,
      show: true,
    }
  ].filter(item => item.show);

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

      {/* User / Logout Section */}
      <div style={{ marginTop: "auto", borderTop: "1px solid var(--border-light)", paddingTop: "1rem" }}>
        <form action={logout}>
          <button
            type="submit"
            className="nav-link"
            style={{
              background: "transparent",
              border: "none",
              width: "100%",
              textAlign: "left",
              color: "var(--danger)",
              cursor: "pointer"
            }}
          >
            <LogOut size={18} />
            <span className="logo-text" style={{ flex: 1, fontSize: "0.875rem", fontWeight: 500 }}>Keluar</span>
          </button>
        </form>
      </div>

    </aside>
  );
}
