import { PrismaClient } from "./src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local' });

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Memperbarui data karyawan di database...");

  const employees = await prisma.employee.findMany();
  let updatedCount = 0;

  for (const emp of employees) {
    let newName = emp.name;
    
    // Hapus awalan "Dr. " atau "Ns. "
    if (newName.startsWith("Dr. ")) {
      newName = newName.substring(4);
    } else if (newName.startsWith("Ns. ")) {
      newName = newName.substring(4);
    }

    await prisma.employee.update({
      where: { id: emp.id },
      data: {
        name: newName,
        shiftDuration: 8,
        workdaysPerMonth: 22,
      },
    });
    
    updatedCount++;
  }

  console.log(`Berhasil memperbarui ${updatedCount} karyawan!`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
