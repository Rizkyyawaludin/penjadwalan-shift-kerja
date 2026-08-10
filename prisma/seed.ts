import { prisma } from "../src/lib/prisma";
import * as bcrypt from "bcryptjs";

async function main() {
  const existingAdmin = await prisma.admin.findFirst();

  if (existingAdmin) {
    console.log("Admin account already exists. Skipping seeder.");
    return;
  }

  const hashedPassword = await bcrypt.hash("admin123", 10);

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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
