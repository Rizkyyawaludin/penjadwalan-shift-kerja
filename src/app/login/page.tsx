"use client";

import { useState } from "react";
import { login } from "@/actions/auth";
import { Lock } from "lucide-react";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const result = await login(formData);
    
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", backgroundColor: "var(--bg-main)" }}>
      <div className="glass-panel animate-fade-in" style={{ width: "100%", maxWidth: "420px", padding: "2.5rem" }}>
        
        {/* Header Section */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "2rem" }}>
          <div style={{ 
            width: "48px", 
            height: "48px", 
            borderRadius: "0.75rem", 
            background: "var(--accent-primary)", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            color: "#ffffff",
            marginBottom: "1rem",
            boxShadow: "var(--shadow-md)"
          }}>
            <Lock size={24} />
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-main)", margin: "0 0 0.5rem 0", letterSpacing: "-0.02em" }}>
            Login Admin
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", textAlign: "center", margin: 0, lineHeight: 1.5 }}>
            Masukkan kredensial Anda untuk mengakses dashboard manajemen shift.
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column" }}>
          
          {error && (
            <div style={{ 
              backgroundColor: "var(--danger-bg)", 
              color: "var(--danger)", 
              padding: "0.75rem 1rem", 
              borderRadius: "var(--radius-md)", 
              fontSize: "0.85rem",
              fontWeight: 500,
              marginBottom: "1.25rem",
              border: "1px solid #fecaca",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}>
              {error}
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email Address</label>
            <input 
              id="email" 
              name="email" 
              type="email" 
              placeholder="admin@admin.com" 
              className="custom-input hover-lift"
              required 
            />
          </div>
          
          <div className="form-group" style={{ marginBottom: "2rem" }}>
            <label htmlFor="password" className="form-label">Password</label>
            <input 
              id="password" 
              name="password" 
              type="password" 
              placeholder="••••••••" 
              className="custom-input hover-lift"
              required 
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-primary"
            style={{ width: "100%", padding: "0.75rem", fontSize: "0.95rem" }}
          >
            {loading ? "Memverifikasi..." : "Masuk ke Dashboard"}
          </button>
          
        </form>
      </div>
    </div>
  );
}
