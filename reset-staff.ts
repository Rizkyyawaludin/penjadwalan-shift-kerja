import { prisma } from './src/lib/prisma';

async function run() {
  // Hapus semua shift & karyawan lama
  await prisma.shift.deleteMany();
  await prisma.employee.deleteMany();

  const depts = ["General Medicine", "ICU", "ER", "Pediatrics"];
  const newStaff = [];

  for (const dept of depts) {
    for (let i = 1; i <= 26; i++) {
      newStaff.push({
        name: `Karyawan ${dept} ${i}`,
        email: `karyawan${i}.${dept.toLowerCase().replace(" ", "")}@rs.com`,
        role: "STAFF",
        department: dept,
        workdaysPerMonth: 22,
        experienceYears: Math.floor(Math.random() * 10) + 1,
        satisfactionScore: 100,
      });
    }
  }

  await prisma.employee.createMany({ data: newStaff });
  console.log("Berhasil mereset database ke 104 karyawan (26 staf per departemen).");
}
run();
