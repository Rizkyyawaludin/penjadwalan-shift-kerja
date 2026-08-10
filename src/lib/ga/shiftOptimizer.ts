// src/lib/ga/shiftOptimizer.ts - Genetic Algorithm Engine for Shift Scheduling

export interface LeavePeriod {
  startDate: Date;
  endDate: Date;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  department?: string | null;
  shiftDuration?: number | null;
  workdaysPerMonth?: number | null;
  experienceYears?: number | null;
  satisfactionScore?: number | null;
  leaves?: LeavePeriod[];
}

export interface ShiftSlot {
  id: string; // unique identifier for the slot in the generation period
  date: string; // YYYY-MM-DD
  title: string; // "Shift Pagi", "Shift Sore", "Shift Malam"
  startTime: Date;
  endTime: Date;
  requiredCount: number; // jumlah staf yang dibutuhkan pada slot ini (default 2)
}

export interface AssignedShift {
  shiftSlot: ShiftSlot;
  employeeId: string;
}

export interface GAViolationBreakdown {
  doubleShift: number;
  maxWorkdaysExceeded: number;
  experienceMismatch: number;
  workloadImbalance: number;
  leaveViolation: number;
}

export interface GAOptimizationResult {
  bestSchedule: AssignedShift[];
  fitnessScore: number;
  generationsRun: number;
  executionTimeMs: number;
  violations: GAViolationBreakdown;
  department: string;
  staffCount: number;
}

// Representasi Kromosom: Array dari array ID staf (setiap elemen merepresentasikan staf di 1 shift slot)
type Chromosome = string[][];

export class ShiftGeneticOptimizer {
  private staff: StaffMember[];
  private slots: ShiftSlot[];
  private populationSize: number = 80;
  private maxGenerations: number = 200;
  private mutationRate: number = 0.08;
  private tournamentSize: number = 3;

  private staffMap: Map<string, StaffMember>;
  private totalDaysInPeriod: number = 0;
  private maxShiftsBy40HourRule: number = 0;
  private totalRequiredShifts: number = 0;

  // Precomputed leave lookup: staffId -> Set of "YYYY-MM-DD" strings when on leave
  private staffLeaveDates: Map<string, Set<string>> = new Map();
  // Precomputed: number of available (non-leave) days per staff in the schedule period
  private staffAvailableDays: Map<string, number> = new Map();
  // Precomputed: total available staff-days across all staff (for workload distribution)
  private totalAvailableStaffDays: number = 0;

  constructor(staff: StaffMember[], slots: ShiftSlot[]) {
    this.staff = staff;
    this.slots = [...slots].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    this.staffMap = new Map(staff.map(s => [s.id, s]));
  }

  /**
   * Precompute leave dates for each staff member.
   * Converts LeavePeriod ranges into a Set of date strings for O(1) lookup.
   */
  private precomputeLeaveData(): void {
    const allDates = new Set(this.slots.map(s => s.date));
    this.totalAvailableStaffDays = 0; // Reset sebelum menghitung ulang

    for (const emp of this.staff) {
      const leaveDateSet = new Set<string>();

      if (emp.leaves && emp.leaves.length > 0) {
        for (const leave of emp.leaves) {
          const start = new Date(leave.startDate);
          const end = new Date(leave.endDate);
          // Iterate each day of the leave period
          const cursor = new Date(start);
          while (cursor <= end) {
            const dateStr = cursor.toISOString().split('T')[0];
            leaveDateSet.add(dateStr);
            cursor.setDate(cursor.getDate() + 1);
          }
        }
      }

      this.staffLeaveDates.set(emp.id, leaveDateSet);
      // Count how many schedule days this staff is available
      let available = 0;
      for (const date of allDates) {
        if (!leaveDateSet.has(date)) available++;
      }
      this.staffAvailableDays.set(emp.id, available);
      this.totalAvailableStaffDays += available;
    }
  }

  /** Check if a staff member is on leave on a specific date */
  private isStaffOnLeave(staffId: string, date: string): boolean {
    const dates = this.staffLeaveDates.get(staffId);
    return dates ? dates.has(date) : false;
  }

  public optimize(department: string): GAOptimizationResult {
    const startTimeMs = Date.now();

    if (this.staff.length === 0 || this.slots.length === 0) {
      return {
        bestSchedule: [],
        fitnessScore: 0,
        generationsRun: 0,
        executionTimeMs: 0,
        violations: { doubleShift: 0, maxWorkdaysExceeded: 0, experienceMismatch: 0, workloadImbalance: 0, leaveViolation: 0 },
        department,
        staffCount: this.staff.length,
      };
    }

    // Precompute leave data for O(1) lookup during optimization
    this.precomputeLeaveData();

    // Precompute invariant constraints to speed up evaluateFitness (run 16,000+ times)
    this.totalDaysInPeriod = new Set(this.slots.map(s => s.date)).size;
    this.maxShiftsBy40HourRule = Math.max(1, Math.floor((Math.max(this.totalDaysInPeriod, 7) / 7) * 5));
    this.totalRequiredShifts = this.slots.reduce((sum, slot) => sum + slot.requiredCount, 0);

    // 1. Inisialisasi Populasi Awal
    let population: Chromosome[] = [];
    for (let i = 0; i < this.populationSize; i++) {
      population.push(this.generateRandomChromosome());
    }

    let bestChromosome: Chromosome = population[0];
    let bestFitnessResult = this.evaluateFitness(bestChromosome);

    // 2. Loop Evolusi Generasi
    for (let gen = 0; gen < this.maxGenerations; gen++) {
      const scoredPopulation = population.map((chrom) => ({
        chromosome: chrom,
        result: this.evaluateFitness(chrom),
      }));

      // Urutkan dari fitness tertinggi
      scoredPopulation.sort((a, b) => b.result.score - a.result.score);

      if (scoredPopulation[0].result.score > bestFitnessResult.score) {
        bestChromosome = scoredPopulation[0].chromosome;
        bestFitnessResult = scoredPopulation[0].result;
      }

      // Jika sudah mencapai skor sempurna tanpa pelanggaran berat, bisa early stop
      if (bestFitnessResult.score >= 9800 && bestFitnessResult.violations.doubleShift === 0 && bestFitnessResult.violations.maxWorkdaysExceeded === 0) {
        break;
      }

      // 3. Bentuk Populasi Baru (Elitism + Selection + Crossover + Mutation)
      const newPopulation: Chromosome[] = [];
      // Elitism: ambil 2 terbaik langsung ke generasi berikutnya
      newPopulation.push(scoredPopulation[0].chromosome);
      newPopulation.push(scoredPopulation[1].chromosome);

      while (newPopulation.length < this.populationSize) {
        const parentA = this.tournamentSelection(scoredPopulation);
        const parentB = this.tournamentSelection(scoredPopulation);
        let [childA, childB] = this.crossover(parentA, parentB);

        childA = this.mutate(childA);
        childB = this.mutate(childB);

        newPopulation.push(childA);
        if (newPopulation.length < this.populationSize) {
          newPopulation.push(childB);
        }
      }

      population = newPopulation;
    }

    const executionTimeMs = Date.now() - startTimeMs;

    // Konversi kromosom terbaik menjadi AssignedShift array
    const bestSchedule: AssignedShift[] = [];
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      const assignedIds = bestChromosome[i];
      for (const empId of assignedIds) {
        bestSchedule.push({
          shiftSlot: slot,
          employeeId: empId,
        });
      }
    }

    return {
      bestSchedule,
      fitnessScore: Math.round(bestFitnessResult.score),
      generationsRun: this.maxGenerations,
      executionTimeMs,
      violations: bestFitnessResult.violations,
      department,
      staffCount: this.staff.length,
    };
  }

  private getMaxShiftsForStaff(emp: StaffMember): number {
    const availableDays = this.staffAvailableDays.get(emp.id) || this.totalDaysInPeriod;

    // Hitung rata-rata shift yang dibutuhkan per hari-staf-tersedia
    // Ini memperhitungkan bahwa staf yang cuti mengurangi kapasitas total
    const avgShiftsPerStaffDay = this.totalRequiredShifts / Math.max(1, this.totalAvailableStaffDays);
    // Minimum shift yang harus ditanggung staf ini, proporsional dengan hari tersedianya
    const minRequiredForThisStaff = Math.ceil(avgShiftsPerStaffDay * availableDays) + 1; // +1 buffer

    const maxAllowedKaggle = emp.workdaysPerMonth || 22;
    // Skala batas Kaggle ke hari tersedia (bukan total periode)
    const proportionalKaggle = Math.ceil((maxAllowedKaggle / 30) * availableDays) + 1;

    // Skala aturan 40 jam ke hari tersedia staf ini
    const maxShifts40Hour = Math.max(1, Math.floor((Math.max(availableDays, 7) / 7) * 5));

    return Math.max(maxShifts40Hour, minRequiredForThisStaff, proportionalKaggle);
  }

  private generateRandomChromosome(): Chromosome {
    const chromosome: Chromosome = [];

    // Track siapa saja yang sudah ditugaskan pada suatu tanggal di kromosom ini
    const dailyAssigned: Record<string, Set<string>> = {};
    const empSlots: Record<string, ShiftSlot[]> = {};
    const staffShiftCountMap: Record<string, number> = {};
    for (const emp of this.staff) {
      empSlots[emp.id] = [];
      staffShiftCountMap[emp.id] = 0;
    }

    for (const slot of this.slots) {
      const assigned: string[] = [];
      if (!dailyAssigned[slot.date]) {
        dailyAssigned[slot.date] = new Set();
      }

      // Kumpulkan semua staf yang tersedia untuk slot ini:
      // - Tidak sedang cuti
      // - Belum ditugaskan di hari ini
      const availableForSlot = this.staff.filter(s =>
        !dailyAssigned[slot.date].has(s.id) &&
        !this.isStaffOnLeave(s.id, slot.date)
      );

      // Urutkan berdasarkan shift paling sedikit (prioritaskan yang kurang kerja)
      // Tambahkan sedikit randomisasi untuk variasi antar kromosom
      availableForSlot.sort((a, b) => {
        const diff = staffShiftCountMap[a.id] - staffShiftCountMap[b.id];
        if (diff !== 0) return diff; // Prioritaskan yang paling sedikit shift-nya
        return Math.random() - 0.5; // Random untuk variasi
      });

      // Pass 1: Prioritaskan yang punya Rest Gap 8 jam & Belum melebihi Max Shifts
      for (const emp of availableForSlot) {
        if (assigned.length >= slot.requiredCount) break;
        if (staffShiftCountMap[emp.id] >= this.getMaxShiftsForStaff(emp)) continue;

        let hasRestGap = true;
        for (const assignedSlot of empSlots[emp.id]) {
          const gap1 = slot.startTime.getTime() - assignedSlot.endTime.getTime();
          const gap2 = assignedSlot.startTime.getTime() - slot.endTime.getTime();
          const gap = Math.max(gap1, gap2);
          if (gap < 8 * 60 * 60 * 1000) {
            hasRestGap = false;
            break;
          }
        }

        if (hasRestGap) {
          assigned.push(emp.id);
          dailyAssigned[slot.date].add(emp.id);
          empSlots[emp.id].push(slot);
          staffShiftCountMap[emp.id]++;
        }
      }

      // Pass 2: Abaikan Max Shifts, tapi pertahankan Rest Gap
      if (assigned.length < slot.requiredCount) {
        for (const emp of availableForSlot) {
          if (assigned.length >= slot.requiredCount) break;
          if (assigned.includes(emp.id)) continue;

          let hasRestGap = true;
          for (const assignedSlot of empSlots[emp.id]) {
            const gap1 = slot.startTime.getTime() - assignedSlot.endTime.getTime();
            const gap2 = assignedSlot.startTime.getTime() - slot.endTime.getTime();
            const gap = Math.max(gap1, gap2);
            if (gap < 8 * 60 * 60 * 1000) {
              hasRestGap = false;
              break;
            }
          }

          if (hasRestGap) {
            assigned.push(emp.id);
            dailyAssigned[slot.date].add(emp.id);
            empSlots[emp.id].push(slot);
            staffShiftCountMap[emp.id]++;
          }
        }
      }

      // Pass 3: Abaikan Rest Gap, tapi masih belum kerja di hari yang sama (Max Shifts diabaikan)
      if (assigned.length < slot.requiredCount) {
        for (const emp of availableForSlot) {
          if (assigned.length >= slot.requiredCount) break;
          if (assigned.includes(emp.id)) continue;

          assigned.push(emp.id);
          dailyAssigned[slot.date].add(emp.id);
          empSlots[emp.id].push(slot);
          staffShiftCountMap[emp.id]++;
        }
      }

      // Pass 4: Terpaksa double shift di hari yang sama (tapi slot berbeda dan TIDAK CUTI)
      if (assigned.length < slot.requiredCount) {
        const availableAny = this.staff.filter(s => 
          !assigned.includes(s.id) && 
          !this.isStaffOnLeave(s.id, slot.date)
        );
        // Sort lagi biar yang paling dikit kerjanya dapet duluan
        availableAny.sort((a, b) => staffShiftCountMap[a.id] - staffShiftCountMap[b.id]);
        
        for (const emp of availableAny) {
          if (assigned.length >= slot.requiredCount) break;
          assigned.push(emp.id);
          dailyAssigned[slot.date].add(emp.id); // might already be there
          empSlots[emp.id].push(slot);
          staffShiftCountMap[emp.id]++;
        }
      }

      chromosome.push(assigned);
    }
    return chromosome;
  }

  private evaluateFitness(chromosome: Chromosome): { score: number; violations: GAViolationBreakdown } {
    let score = 10000;
    const violations: GAViolationBreakdown = {
      doubleShift: 0,
      maxWorkdaysExceeded: 0,
      experienceMismatch: 0,
      workloadImbalance: 0,
      leaveViolation: 0,
    };

    // Peta hitungan kerja staf
    const staffShiftCount: Record<string, number> = {};
    const staffWorkDays: Record<string, Set<string>> = {};
    const empSlotsMap: Record<string, ShiftSlot[]> = {};
    for (const emp of this.staff) {
      staffShiftCount[emp.id] = 0;
      staffWorkDays[emp.id] = new Set();
      empSlotsMap[emp.id] = [];
    }

    // Cek per hari untuk Double Shift (1 orang di 2 shift berbeda pada hari yang sama)
    const dailyAssigned: Record<string, Set<string>> = {};

    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      const assignedIds = chromosome[i];

      if (!dailyAssigned[slot.date]) {
        dailyAssigned[slot.date] = new Set();
      }

      for (const empId of assignedIds) {
        staffShiftCount[empId] = (staffShiftCount[empId] || 0) + 1;
        if (staffWorkDays[empId]) {
          staffWorkDays[empId].add(slot.date);
        }
        empSlotsMap[empId].push(slot); // Kumpulkan slot per staf

        // Hard Constraint 0: Leave Violation — staf ditugaskan saat cuti
        if (this.isStaffOnLeave(empId, slot.date)) {
          violations.leaveViolation++;
          score -= 8000; // Pinalti paling fatal — tidak boleh kerja saat cuti
        }

        // Hard Constraint 1: Double Shift check
        if (dailyAssigned[slot.date].has(empId)) {
          violations.doubleShift++;
          score -= 5000; // Pinalti sangat fatal untuk double shift
        } else {
          dailyAssigned[slot.date].add(empId);
        }

        // Soft Constraint 1: Experience Matching untuk Shift Malam / ICU / ER
        const emp = this.staffMap.get(empId);
        if (emp) {
          const exp = emp.experienceYears || 5;
          if (slot.title === "Shift Malam" || emp.department === "ICU" || emp.department === "ER") {
            if (exp < 3) {
              violations.experienceMismatch++;
              score -= 40; // Penalti ringan jika terlalu junior sendiri di shift malam
            }
          }
        }
      }
    }

    // Hard Constraint 1.5: Minimum Rest Time (8 hours) check
    for (const emp of this.staff) {
      const slots = empSlotsMap[emp.id];
      // Urutkan slot per perawat berdasarkan waktu mulai secara kronologis
      if (slots.length > 1) {
        slots.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
      }
      for (let i = 1; i < slots.length; i++) {
        const gapHours = (slots[i].startTime.getTime() - slots[i - 1].endTime.getTime()) / (1000 * 60 * 60);
        if (gapHours < 8) {
          violations.doubleShift++;
          score -= 5000;
        }
      }
    }

    // Hard Constraint 2: Max 40 Jam Kerja (5 Shift) & Max Workdays Exceeded dari Dataset Kaggle
    for (const emp of this.staff) {
      const totalShifts = staffShiftCount[emp.id] || 0;
      const strictLimit = this.getMaxShiftsForStaff(emp);

      if (totalShifts > strictLimit) {
        violations.maxWorkdaysExceeded++;
        score -= 2000 * (totalShifts - strictLimit);
      }
    }

    // Soft Constraint 2: Workload Fairness (Keadilan Distribusi Shift)
    // Hitung ekspektasi shift per staf proporsional ke hari tersedia
    const totalFilledShifts = Object.values(staffShiftCount).reduce((a, b) => a + b, 0);

    const staffEntries = this.staff.map(emp => {
      const availableDays = this.staffAvailableDays.get(emp.id) || this.totalDaysInPeriod;
      // Ekspektasi: shift yang seharusnya ditanggung staf ini secara proporsional
      const expectedShifts = this.totalAvailableStaffDays > 0
        ? (totalFilledShifts * availableDays) / this.totalAvailableStaffDays
        : 0;
      return {
        id: emp.id,
        shifts: staffShiftCount[emp.id] || 0,
        availableDays,
        expectedShifts,
      };
    });

    // Hitung deviasi dari ekspektasi
    if (staffEntries.length > 0) {
      let totalDeviation = 0;
      for (const entry of staffEntries) {
        if (entry.availableDays > 0) {
          const deviation = Math.abs(entry.shifts - entry.expectedShifts);
          totalDeviation += deviation * deviation; // Squared deviation
        }
      }
      const msd = totalDeviation / staffEntries.length; // Mean Squared Deviation

      if (msd > 1) {
        violations.workloadImbalance = Math.round(msd);
        score -= msd * 300; // Pinalti besar agar shift merata secara proporsional
      }

      // Hard Constraint: Staf tidak boleh mendapat 0 shift, KECUALI:
      // - Jumlah shift < jumlah staf, ATAU
      // - Staf tersebut cuti seluruh periode
      if (this.totalRequiredShifts >= this.staff.length) {
        for (const entry of staffEntries) {
          if (entry.shifts === 0 && entry.availableDays > 0) {
            score -= 1000; // Pinalti raksasa jika ada yang dianggurkan padahal tersedia
          }
        }
      }
    }

    return { score: Math.max(0, score), violations };
  }

  private tournamentSelection(scoredPopulation: { chromosome: Chromosome; result: { score: number } }[]): Chromosome {
    let best = scoredPopulation[Math.floor(Math.random() * scoredPopulation.length)];
    for (let i = 1; i < this.tournamentSize; i++) {
      const contender = scoredPopulation[Math.floor(Math.random() * scoredPopulation.length)];
      if (contender.result.score > best.result.score) {
        best = contender;
      }
    }
    return best.chromosome;
  }

  private crossover(parentA: Chromosome, parentB: Chromosome): [Chromosome, Chromosome] {
    const childA: Chromosome = [];
    const childB: Chromosome = [];
    const splitPoint = Math.floor(Math.random() * this.slots.length);

    for (let i = 0; i < this.slots.length; i++) {
      if (i < splitPoint) {
        childA.push([...parentA[i]]);
        childB.push([...parentB[i]]);
      } else {
        childA.push([...parentB[i]]);
        childB.push([...parentA[i]]);
      }
    }

    // Repair: ganti staf yang cuti di hasil crossover dengan staf yang tersedia
    this.repairLeaveViolations(childA);
    this.repairLeaveViolations(childB);

    return [childA, childB];
  }

  /**
   * Repair kromosom agar tidak ada staf yang cuti ditugaskan.
   * Mengganti assignment staf yang cuti dengan staf lain yang tersedia.
   */
  private repairLeaveViolations(chromosome: Chromosome): void {
    for (let i = 0; i < chromosome.length; i++) {
      const slot = this.slots[i];
      const assigned = chromosome[i];

      for (let j = 0; j < assigned.length; j++) {
        if (this.isStaffOnLeave(assigned[j], slot.date)) {
          // Cari pengganti yang tidak cuti dan belum di-assign di slot ini
          const replacement = this.staff.find(
            s => !assigned.includes(s.id) && !this.isStaffOnLeave(s.id, slot.date)
          );
          if (replacement) {
            assigned[j] = replacement.id;
          } else {
            // Tidak ada pengganti — hapus assignment ini daripada melanggar cuti
            assigned.splice(j, 1);
            j--; // Adjust index setelah splice
          }
        }
      }
    }
  }

  private mutate(chromosome: Chromosome): Chromosome {
    const mutated = chromosome.map((slotAssigned) => [...slotAssigned]);

    for (let i = 0; i < mutated.length; i++) {
      if (Math.random() < this.mutationRate) {
        const slot = this.slots[i];
        const currentAssigned = mutated[i];

        // Cari staf yang belum ditugaskan di slot ini DAN tidak sedang cuti
        const unassignedStaff = this.staff.filter(
          (s) => !currentAssigned.includes(s.id) && !this.isStaffOnLeave(s.id, slot.date)
        );
        if (unassignedStaff.length > 0 && currentAssigned.length > 0) {
          const replaceIdx = Math.floor(Math.random() * currentAssigned.length);
          const newStaffIdx = Math.floor(Math.random() * unassignedStaff.length);
          mutated[i][replaceIdx] = unassignedStaff[newStaffIdx].id;
        }
      }
    }

    return mutated;
  }
}
