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


        {/* Dynamic Page Content */}
        <main className="content-body animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
