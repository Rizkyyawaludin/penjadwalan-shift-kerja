const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const FIRST_NAMES = [
  "Rizki", "Anisa", "Budi", "Citra", "Dedi", "Eka", "Fajar", "Gita", "Hadi", "Indah",
  "Joko", "Kartika", "Lukman", "Maya", "Naufal", "Olivia", "Pratama", "Qori", "Rina", "Surya",
  "Tari", "Utami", "Vina", "Wahyu", "Yudi", "Zahra", "Aditya", "Bayu", "Clarissa", "Dimas"
];

const LAST_NAMES = [
  "Santoso", "Pratama", "Wijaya", "Kusuma", "Saputra", "Lestari", "Hidayat", "Nugroho", "Wulandari", "Setiawan",
  "Purnama", "Siregar", "Nasution", "Halim", "Susanto", "Hartono", "Mulyadi", "Gunawan", "Ramadhan", "Handayani"
];

function generateRealisticName(id, index) {
  const first = FIRST_NAMES[(index + id.charCodeAt(id.length - 1)) % FIRST_NAMES.length];
  const last = LAST_NAMES[(index + id.charCodeAt(id.length - 2)) % LAST_NAMES.length];
  return `Ns. ${first} ${last} (${id})`;
}

function generateCuid() {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `c${timestamp}${randomPart}`;
}

async function run() {
  const LIMIT_PER_DEPT = 26; // 26 x 4 departemen = 104 perawat

  // Baca dataset Kaggle
  const csvPath = path.join(__dirname, 'data', 'kaggle_staff_scheduling.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('File CSV tidak ditemukan di data/kaggle_staff_scheduling.csv');
    process.exit(1);
  }

  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = fileContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const dataLines = lines.slice(1); // Lewati header

  // Pilih 26 per departemen
  const deptCounts = {};
  const selectedLines = [];

  for (const line of dataLines) {
    const cols = line.split(',');
    if (cols.length < 6) continue;
    const dept = cols[1];
    if (!deptCounts[dept]) deptCounts[dept] = 0;
    if (deptCounts[dept] < LIMIT_PER_DEPT) {
      selectedLines.push(line);
      deptCounts[dept]++;
    }
  }

  console.log('Distribusi data yang akan diimpor:', deptCounts);
  console.log(`Total: ${selectedLines.length} perawat`);

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Hapus semua shift & karyawan lama
  await client.query('DELETE FROM "Shift"');
  await client.query('DELETE FROM "Employee"');
  console.log('Database lama berhasil dihapus.');

  // Import dari CSV
  let importedCount = 0;
  const now = new Date().toISOString();

  for (let i = 0; i < selectedLines.length; i++) {
    const cols = selectedLines[i].split(',');
    const staffId = cols[0];
    const department = cols[1];
    const shiftDuration = parseInt(cols[2], 10) || 8;
    const workdaysPerMonth = parseInt(cols[3], 10) || 20;
    const satisfactionScore = parseFloat(cols[4]) || 3.5;
    const experienceYears = parseInt(cols[5], 10) || 5;

    const name = generateRealisticName(staffId, i);
    const email = `${staffId.toLowerCase()}@shiftmaster.pro`;
    // Semua staf dari dataset Kaggle adalah Perawat
    const role = experienceYears >= 10 ? 'Senior Perawat' : 'Perawat';
    const id = generateCuid();

    await client.query(
      `INSERT INTO "Employee" (id, name, email, role, department, "shiftDuration", "workdaysPerMonth", "satisfactionScore", "experienceYears", "kaggleStaffId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT ("kaggleStaffId") DO UPDATE SET
         name = EXCLUDED.name, role = EXCLUDED.role, department = EXCLUDED.department,
         "shiftDuration" = EXCLUDED."shiftDuration", "workdaysPerMonth" = EXCLUDED."workdaysPerMonth",
         "satisfactionScore" = EXCLUDED."satisfactionScore", "experienceYears" = EXCLUDED."experienceYears",
         "updatedAt" = EXCLUDED."updatedAt"`,
      [id, name, email, role, department, shiftDuration, workdaysPerMonth, satisfactionScore, experienceYears, staffId, now, now]
    );

    importedCount++;
  }

  console.log(`\nBerhasil mereset database ke ${importedCount} perawat dari dataset Kaggle (${LIMIT_PER_DEPT} per departemen).`);
  await client.end();
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
