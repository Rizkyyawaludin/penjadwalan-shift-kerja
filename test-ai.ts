import { generateAutomaticSchedule } from "./src/actions/jadwal";

async function run() {
  const params = {
    startDate: "2026-08-01",
    daysCount: 7,
    department: "ALL",
    selectedShiftTypes: ["Shift Malam", "Shift Pagi", "Shift Sore"]
  };
  console.log("Running...");
  const res = await generateAutomaticSchedule(params);
  console.log("Result:", res);
}
run().catch(console.error);
