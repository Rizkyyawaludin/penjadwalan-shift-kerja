// src/lib/ga/shiftOptimizerInteger.ts - Genetic Algorithm Engine using Integer (Binary) Encoding

import {
  StaffMember,
  ShiftSlot,
  AssignedShift,
  GAViolationBreakdown,
  GAOptimizationResult,
} from "./shiftOptimizer"; // Menggunakan interface dari file asli agar konsisten

// Representasi Kromosom: Integer Encoding (Binary Matrix)
// Bentuknya: array 2D dengan ukuran [Jumlah Staf] x [Jumlah Slot Shift]
// Nilai: 1 berarti ditugaskan, 0 berarti libur/tidak ditugaskan
type Chromosome = number[][];

export class ShiftGeneticOptimizerInteger {
  private staff: StaffMember[];
  private slots: ShiftSlot[];
  private populationSize: number = 80;
  private maxGenerations: number = 200;
  private mutationRate: number = 0.05; // Sedikit lebih kecil untuk Binary
  private tournamentSize: number = 3;

  private totalDaysInPeriod: number = 0;
  private maxShiftsBy40HourRule: number = 0;
  private totalRequiredShifts: number = 0;

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
        violations: { doubleShift: 0, maxWorkdaysExceeded: 0, experienceMismatch: 0, workloadImbalance: 0, leaveViolation: 0 },
        department,
        staffCount: this.staff.length,
      };
    }

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

      // Early stop kalau sudah ketemu yang bagus
      if (bestFitnessResult.score >= 9000 && 
          bestFitnessResult.violations.doubleShift === 0 && 
          bestFitnessResult.violations.maxWorkdaysExceeded === 0) {
        break;
      }

      // 3. Bentuk Populasi Baru (Elitism + Selection + Crossover + Mutation)
      const newPopulation: Chromosome[] = [];
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

    // Konversi kromosom (Binary/Integer) menjadi AssignedShift array
    const bestSchedule: AssignedShift[] = [];
    for (let i = 0; i < this.staff.length; i++) {
      for (let j = 0; j < this.slots.length; j++) {
        if (bestChromosome[i][j] === 1) { // 1 = Kerja
          bestSchedule.push({
            shiftSlot: this.slots[j],
            employeeId: this.staff[i].id,
          });
        }
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

  // Generate kromosom awal dengan array biner 0 dan 1
  private generateRandomChromosome(): Chromosome {
    const chromosome: Chromosome = [];
    // Probabilitas staf masuk pada suatu shift secara acak
    const p = Math.min(1, (this.totalRequiredShifts / (this.slots.length * this.staff.length)) * 1.5);
    
    for (let i = 0; i < this.staff.length; i++) {
      const staffSchedule: number[] = [];
      for (let j = 0; j < this.slots.length; j++) {
        staffSchedule.push(Math.random() < p ? 1 : 0);
      }
      chromosome.push(staffSchedule);
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

    const staffShiftCount: Record<number, number> = {};
    for (let i = 0; i < this.staff.length; i++) staffShiftCount[i] = 0;

    // --- CSP / FITNESS EVALUATION ---

    // 1. Cek Kebutuhan Shift (Ini yang membedakan dengan metode Value Encoding)
    // Sekarang menjadi Soft Constraint, kita harus menghitung apakah slot-nya kekurangan/kelebihan staf
    for (let j = 0; j < this.slots.length; j++) {
      let countInSlot = 0;
      for (let i = 0; i < this.staff.length; i++) {
        if (chromosome[i][j] === 1) {
          countInSlot++;
          staffShiftCount[i]++;
        }
      }

      const required = this.slots[j].requiredCount;
      if (countInSlot !== required) {
        // Penalti BESAR jika orang di shift kurang atau lebih dari yang diminta
        const diff = Math.abs(countInSlot - required);
        score -= diff * 3000; 
      }
    }

    // 2. Cek Double Shift & Waktu Istirahat untuk setiap staf
    for (let i = 0; i < this.staff.length; i++) {
      const assignedSlots: ShiftSlot[] = [];
      for (let j = 0; j < this.slots.length; j++) {
        if (chromosome[i][j] === 1) {
          assignedSlots.push(this.slots[j]);
        }
      }

      // Urutkan berdasarkan waktu mulai
      assignedSlots.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

      // Cek jarak istirahat antar shift minimal 8 jam
      for (let k = 1; k < assignedSlots.length; k++) {
        const gapMs = assignedSlots[k].startTime.getTime() - assignedSlots[k - 1].endTime.getTime();
        const gapHours = gapMs / (1000 * 60 * 60);
        
        if (assignedSlots[k].date === assignedSlots[k-1].date) {
           violations.doubleShift++;
           score -= 5000;
        } else if (gapHours < 8) {
           violations.doubleShift++; 
           score -= 5000;
        }
      }

      // Cek maksimal shift
      if (staffShiftCount[i] > this.maxShiftsBy40HourRule) {
        violations.maxWorkdaysExceeded++;
        score -= (staffShiftCount[i] - this.maxShiftsBy40HourRule) * 2000;
      }
    }

    // 3. Workload Fairness (Keadilan)
    const counts = Object.values(staffShiftCount);
    if (counts.length > 0) {
      const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
      const variance = counts.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / counts.length;

      if (variance > 2) {
        violations.workloadImbalance = Math.round(variance);
        score -= variance * 100;
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

  // Crossover membelah jadwal secara horizontal (berdasarkan staf)
  private crossover(parentA: Chromosome, parentB: Chromosome): [Chromosome, Chromosome] {
    const childA: Chromosome = [];
    const childB: Chromosome = [];
    
    // Potong di staf ke-X
    const splitPoint = Math.floor(Math.random() * this.staff.length);

    for (let i = 0; i < this.staff.length; i++) {
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

  // Mutasi dengan membalikkan bit (0 jadi 1, 1 jadi 0)
  private mutate(chromosome: Chromosome): Chromosome {
    const mutated: Chromosome = chromosome.map(arr => [...arr]);

    for (let i = 0; i < this.staff.length; i++) {
      for (let j = 0; j < this.slots.length; j++) {
        if (Math.random() < this.mutationRate) {
          // Bit flip mutation
          mutated[i][j] = mutated[i][j] === 1 ? 0 : 1;
        }
      }
    }

    return mutated;
  }
}
