"use server";

import { prisma } from "@/lib/prisma";
import * as bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
const SECRET_KEY = process.env.JWT_SECRET || "default_super_secret_key_change_me_in_production";
const encodedKey = new TextEncoder().encode(SECRET_KEY);

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email dan password wajib diisi." };
  }

  if (email === "kepalaruangan@admin.com") {
    const existingHeadNurse = await prisma.admin.findUnique({
      where: { email },
    });
    if (!existingHeadNurse) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await prisma.admin.create({
        data: {
          name: "Kepala Ruangan",
          email: "kepalaruangan@admin.com",
          password: hashedPassword,
          role: "HEAD_NURSE",
        },
      });
      console.log("Auto-seeded Head Nurse during login!");
    }
  }

  try {
    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin) {
      return { error: "Kredensial tidak valid." };
    }

    const passwordMatch = await bcrypt.compare(password, admin.password);

    if (!passwordMatch) {
      return { error: "Kredensial tidak valid." };
    }

    // Buat JWT
    const token = await new SignJWT({ id: admin.id, email: admin.email, name: admin.name, role: admin.role })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(encodedKey);

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 hari
      path: "/",
    });

  } catch (error) {
    console.error("Login error:", error);
    return { error: "Terjadi kesalahan saat login." };
  }

  // Redirect to dashboard/home after setting cookie
  redirect("/");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("auth_token");
  redirect("/login");
}
