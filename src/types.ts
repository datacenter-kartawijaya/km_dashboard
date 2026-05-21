export enum Shift {
  SIANG = "SIANG",
  MALAM = "MALAM",
  NONE = "NONE",
}

export enum Status {
  ACTIVE = "ACTIVE",
  OUT = "OUT",
}

export interface DayWork {
  date: string;
  bt: number; // Buku Tanah
  su: number; // Surat Ukur
  isPresent: boolean;
}

export interface SalaryConfig {
  priceBT: number;
  priceSU: number;
}

export interface OperatorRecord {
  id: string;
  name: string;
  jabatan: "OPERATOR" | "LEADER" | "SEKRETARIS" | "QC" | "MOBILISASI";
  shift: Shift;
  status: Status;
  group?: string; // Optional group/shift name
  workData: DayWork[];
  targetPerDay: number;
}

export interface Project {
  id: string;
  name: string; // e.g., "BPN Jombang"
  location: string;
  targetTotal: number;
  salaryConfig: SalaryConfig;
  sheetIds: string[]; // Support multiple Google Sheet IDs
  targetPerDayOperator?: number; // Standard daily target for operators, default 150
}

export interface DashboardStats {
  totalProduction: {
    bt: number;
    su: number;
    total: number;
  };
  completionRate: number;
  activePersonnel: number;
  projectBudget: number; // Total salaries to be paid
}
