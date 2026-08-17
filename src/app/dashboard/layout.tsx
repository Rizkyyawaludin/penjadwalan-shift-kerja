import React from "react";
import Sidebar from "@/components/Sidebar";
import { cookies } from "next/headers";
import * as jose from "jose";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  let role = "ADMIN";
  if (token) {
    try {
      const decoded = jose.decodeJwt(token);
      if (decoded.role) {
        role = decoded.role as string;
      }
    } catch (e) {}
  }

  return (
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      <Sidebar userRole={role} />

      {/* Main Content Area */}
      <div className="main-content">
        {/* Dynamic Page Content */}
        <main className="content-body animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
