// src/lib/ga/shiftOptimizer.ts - Genetic Algorithm Engine for Shift Scheduling

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  department?: string | null;
  shiftDuration?: number | null;
  workdaysPerMonth?: number | null;
  experienceYears?: number | null;
  satisfactionScore?: number | null;
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
  private populationSize: number = 80; // Ditingkatkan agar variasi lebih banyak
  private maxGenerations: number = 200; // Ditingkatkan drastis agar ada waktu untuk mengeliminasi bentrok pada jadwal 30 hari
  private mutationRate: number = 0.08;
  private tournamentSize: number = 3;

  private staffMap: Map<string, StaffMember>;
  private totalDaysInPeriod: number = 0;
  private maxShiftsBy40HourRule: number = 0;
  private totalRequiredShifts: number = 0;

  constructor(staff: StaffMember[], slots: ShiftSlot[]) {
    this.staff = staff;
    this.slots = [...slots].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    this.staffMap = new Map(staff.map(s => [s.id, s]));
  }

  public optimize(department: string): GAOptimizationResult {
    const startTimeMs = Date.now();

    if (this.staff.length === 0 || this.slots.length === 0) {
      return {
        bestSchedule: [],
        fitnessScore: 0,
        generationsRun: 0,
        executionTimeMs: 0,
        violations: { doubleShift: 0, maxWorkdaysExceeded: 0, experienceMismatch: 0, workloadImbalance: 0 },
        department,
        staffCount: this.staff.length,
      };
    }

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
    const minRequiredPerStaff = Math.ceil(this.totalRequiredShifts / Math.max(1, this.staff.length));
    const maxAllowedKaggle = emp.workdaysPerMonth || 22;
    const proportionalKaggle = Math.ceil((maxAllowedKaggle / 30) * Math.max(this.totalDaysInPeriod, 7)) + 1;
    return Math.max(this.maxShiftsBy40HourRule, minRequiredPerStaff, proportionalKaggle);
  }

  private generateRandomChromosome(): Chromosome {
    const chromosome: Chromosome = [];
    let staffPool = [...this.staff].sort(() => Math.random() - 0.5);
    
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
      
      for (let c = 0; c < slot.requiredCount; c++) {
        if (staffPool.length === 0) {
          staffPool = [...this.staff].sort(() => Math.random() - 0.5);
        }
        
        // Cari staf di pool yang belum masuk ke slot ini DAN belum kerja di HARI ini
        // SERTA memiliki gap istirahat minimal 8 jam dari shift sebelumnya/sesudahnya
        let idx = staffPool.findIndex(s => {
          if (assigned.includes(s.id) || dailyAssigned[slot.date].has(s.id)) return false;
          if (staffShiftCountMap[s.id] >= this.getMaxShiftsForStaff(s)) return false;
          
          for (const assignedSlot of empSlots[s.id]) {
            const gap1 = slot.startTime.getTime() - assignedSlot.endTime.getTime();
            const gap2 = assignedSlot.startTime.getTime() - slot.endTime.getTime();
            const gap = Math.max(gap1, gap2); 
            if (gap < 8 * 60 * 60 * 1000) return false; // Istirahat kurang dari 8 jam
          }
          return true;
        });
        
        // Fallback 1: abaikan rest time gap, tapi tetap beda hari & patuhi batas jam
        if (idx === -1) {
          idx = staffPool.findIndex(s => !assigned.includes(s.id) && !dailyAssigned[slot.date].has(s.id) && staffShiftCountMap[s.id] < this.getMaxShiftsForStaff(s));
        }
        // Fallback 2: terpaksa abaikan hari dan batas jam jika sangat kekurangan staf
        if (idx === -1) {
          idx = staffPool.findIndex(s => !assigned.includes(s.id) && !dailyAssigned[slot.date].has(s.id));
        }
        // Fallback terakhir
        if (idx === -1) {
          idx = 0;
        }
        
        const empId = staffPool[idx].id;
        assigned.push(empId);
        dailyAssigned[slot.date].add(empId); // Catat bahwa dia sudah kerja di hari ini
        empSlots[empId].push(slot); // Catat jam slot kerjanya
        staffShiftCountMap[empId]++; // Tambah hitungan shift (8 jam)
        
        staffPool.splice(idx, 1);
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
        const gapHours = (slots[i].startTime.getTime() - slots[i-1].endTime.getTime()) / (1000 * 60 * 60);
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
    const counts = Object.values(staffShiftCount);
    if (counts.length > 0) {
      const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
      const variance = counts.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / counts.length;

      if (variance > 1) { // Lebih sensitif terhadap ketidakadilan
        violations.workloadImbalance = Math.round(variance);
        score -= variance * 250; // Pinalti sangat besar agar shift merata
      }

      // Hard Constraint: Staf tidak boleh mendapat 0 shift (kecuali jumlah shift < jumlah staf)
      if (this.totalRequiredShifts >= this.staff.length) {
        const zeroShiftCount = counts.filter(c => c === 0).length;
        if (zeroShiftCount > 0) {
          score -= zeroShiftCount * 1000; // Pinalti raksasa jika ada yang dianggurkan
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

    return [childA, childB];
  }

  private mutate(chromosome: Chromosome): Chromosome {
    const mutated = chromosome.map((slotAssigned) => [...slotAssigned]);

    for (let i = 0; i < mutated.length; i++) {
      if (Math.random() < this.mutationRate) {
        const slot = this.slots[i];
        const currentAssigned = mutated[i];

        // Cari staf yang belum ditugaskan di slot ini
        const unassignedStaff = this.staff.filter((s) => !currentAssigned.includes(s.id));
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
