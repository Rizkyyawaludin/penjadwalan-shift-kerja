import * as dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local' });

import { PrismaClient } from "../src/generated/prisma/client";
import * as bcrypt from "bcryptjs";

import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const existingAdmin = await prisma.admin.findFirst();

  const hashedPassword = await bcrypt.hash("admin123", 10);

  if (!existingAdmin) {
    const admin = await prisma.admin.create({
      data: {
        name: "Super Admin",
        email: "admin@admin.com",
        password: hashedPassword,
      },
    });

    console.log("Default admin created successfully!");
    console.log("Email: admin@admin.com");
    console.log("Password: admin123");
  } else {
    console.log("Admin account already exists. Skipping admin creation.");
  }

  const existingHeadNurse = await prisma.admin.findUnique({
    where: { email: "kepalaruangan@admin.com" },
  });

  if (!existingHeadNurse) {
    await prisma.admin.create({
      data: {
        name: "Kepala Ruangan",
        email: "kepalaruangan@admin.com",
        password: hashedPassword,
        role: "HEAD_NURSE",
      },
    });
    console.log("Head Nurse created successfully!");
    console.log("Email: kepalaruangan@admin.com");
    console.log("Password: admin123");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
