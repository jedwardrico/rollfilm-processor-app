export type ProcessId = 'C41' | 'BW' | 'E6' | 'ECN2' | 'RA4' | string;

export interface FilmStock {
  id: number;
  brand: string;
  name: string;
  iso?: number;
  process_id: ProcessId;
  process_name: string;
  notes?: string;
  active: number;
  created_at: string;
}

export interface Process {
  id: ProcessId;
  name: string;
  description?: string;
}

export type ChemicalRole = 'developer' | 'stop' | 'fixer' | 'bleach' | 'blix' | 'stabilizer' | 'wash' | 'other';

export interface Chemical {
  id: number;
  name: string;
  process_id: ProcessId;
  process_name: string;
  role: ChemicalRole;
  capacity_rolls?: number;
  rolls_processed: number;
  volume_ml?: number;
  date_mixed?: string;
  expiry_date?: string;
  notes?: string;
  active: number;
  created_at: string;
}

export type RollStatus = 'shot' | 'processing' | 'processed' | 'scanning' | 'scanned' | 'archived';
export type RollFormat = '135' | '120' | '127' | '220' | '4x5' | 'other';

export interface Roll {
  id: number;
  human_id: string;
  film_stock: string;
  format: RollFormat;
  process_id: ProcessId;
  process_name: string;
  exposures?: number;
  date_shot?: string;
  date_processed?: string;
  date_scanned?: string;
  status: RollStatus;
  film_stock_id?: number;
  chemical_id?: number;
  procedure_id?: number;
  push_pull: number;
  notes?: string;
  binder_location?: string;
  created_at: string;
}

export interface ProcedureStep {
  id: number;
  procedure_id: number;
  step_order: number;
  name: string;
  duration_seconds: number;
  temperature_c?: number;
  agitation_notes?: string;
  chemical_role?: string;
  chemical_id?: number;
  chemical_name?: string;
}

export interface Stats {
  totals: {
    total_rolls: number;
    scanned: number;
    awaiting_scan: number;
    awaiting_dev: number;
    total: number;
    active: number;
  };
  pipeline: { status: string; count: number }[];
  byProcess: { process_name: string; process_id: string; count: number }[];
  byMonth: { month: string; count: number }[];
  topFilmStocks: { film_stock: string; count: number }[];
  chemUtilization: {
    name: string;
    rolls_processed: number;
    capacity_rolls: number;
    process_name: string;
    pct_used: number;
  }[];
}

export interface Procedure {
  id: number;
  name: string;
  process_id: ProcessId;
  process_name: string;
  film_stock?: string;
  developer?: string;
  temperature_c?: number;
  push_pull: number;
  notes?: string;
  steps: ProcedureStep[];
  rolls_processed: number;
  created_at: string;
}
