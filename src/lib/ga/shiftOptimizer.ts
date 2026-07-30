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
  title: string; // "Shift Pagi", "Shift Siang", "Shift Malam"
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
  private populationSize: number = 60;
  private maxGenerations: number = 80;
  private mutationRate: number = 0.08;
  private tournamentSize: number = 3;

  constructor(staff: StaffMember[], slots: ShiftSlot[]) {
    this.staff = staff;
    this.slots = slots;
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

  private generateRandomChromosome(): Chromosome {
    const chromosome: Chromosome = [];
    let staffPool = [...this.staff].sort(() => Math.random() - 0.5);

    for (const slot of this.slots) {
      const assigned: string[] = [];
      
      for (let c = 0; c < slot.requiredCount; c++) {
        if (staffPool.length === 0) {
          staffPool = [...this.staff].sort(() => Math.random() - 0.5);
        }
        
        // Cari staf di pool yang belum masuk ke slot ini
        let idx = staffPool.findIndex(s => !assigned.includes(s.id));
        if (idx === -1) {
          idx = 0; // fallback darurat
        }
        
        assigned.push(staffPool[idx].id);
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
    for (const emp of this.staff) {
      staffShiftCount[emp.id] = 0;
      staffWorkDays[emp.id] = new Set();
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

        // Hard Constraint 1: Double Shift check
        if (dailyAssigned[slot.date].has(empId)) {
          violations.doubleShift++;
          score -= 600; // Pinalti sangat berat untuk double shift
        } else {
          dailyAssigned[slot.date].add(empId);
        }

        // Soft Constraint 1: Experience Matching untuk Shift Malam / ICU / ER
        const emp = this.staff.find((s) => s.id === empId);
        if (emp) {
          const exp = emp.experienceYears || 5;
          if (slot.title === "Shift Malam" || emp.department === "ICU" || emp.department === "ER") {
            if (exp >= 7) {
              score += 25; // Bonus jika staf senior menjaga shift berat
            } else if (exp < 3) {
              violations.experienceMismatch++;
              score -= 40; // Penalti ringan jika terlalu junior sendiri di shift malam
            }
          }
        }
      }
    }

    // Hard Constraint 2: Max Workdays Exceeded dari Dataset Kaggle
    const totalDaysInPeriod = new Set(this.slots.map((s) => s.date)).size;
    for (const emp of this.staff) {
      const daysWorked = staffWorkDays[emp.id]?.size || 0;
      const maxAllowed = emp.workdaysPerMonth || 20;
      
      // Proposional batas kerja jika periode penjadwalan kurang dari sebulan
      const proportionalMax = Math.ceil((maxAllowed / 30) * Math.max(totalDaysInPeriod, 7)) + 1;

      if (daysWorked > proportionalMax) {
        violations.maxWorkdaysExceeded++;
        score -= 350 * (daysWorked - proportionalMax);
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
      const totalRequiredShifts = this.slots.reduce((sum, slot) => sum + slot.requiredCount, 0);
      if (totalRequiredShifts >= this.staff.length) {
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
