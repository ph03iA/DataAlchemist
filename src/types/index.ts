// Data Entity Interfaces
export interface Client {
  ClientID: string;
  ClientName: string;
  PriorityLevel: number; // 1-5
  RequestedTaskIDs: string; // comma-separated TaskIDs
  GroupTag: string;
  AttributesJSON: string; // JSON metadata
}

export interface Worker {
  WorkerID: string;
  WorkerName: string;
  Skills: string; // comma-separated tags
  AvailableSlots: string; // array of phase numbers [1,3,5]
  MaxLoadPerPhase: number;
  WorkerGroup: string;
  QualificationLevel: string;
}

export interface Task {
  TaskID: string;
  TaskName: string;
  Category: string;
  Duration: number; // number of phases (≥1)
  RequiredSkills: string; // comma-separated tags
  PreferredPhases: string; // list or range syntax [2,4,5] or "1-3"
  MaxConcurrent: number; // max parallel assignments
}

// Parsed/Normalized versions for internal use
export interface ParsedClient extends Omit<Client, 'RequestedTaskIDs' | 'AttributesJSON'> {
  RequestedTaskIDs: string[];
  AttributesJSON: Record<string, any>;
}

export interface ParsedWorker extends Omit<Worker, 'AvailableSlots' | 'Skills'> {
  Skills: string[];
  AvailableSlots: number[];
}

export interface ParsedTask extends Omit<Task, 'RequiredSkills' | 'PreferredPhases'> {
  RequiredSkills: string[];
  PreferredPhases: number[];
}

export interface DataRow {
  id: string;
  [key: string]: any;
}

export interface ValidationError {
  id: string;
  row: number;
  column: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  suggestion?: string;
  validationType?: 
    | 'missing_column'
    | 'duplicate_id' 
    | 'malformed_list'
    | 'out_of_range'
    | 'broken_json'
    | 'unknown_reference'
    | 'circular_corun'
    | 'conflicting_rules'
    | 'overloaded_worker'
    | 'phase_saturation'
    | 'skill_coverage'
    | 'max_concurrency';
}

export interface ValidationSummary {
  totalErrors: number;
  totalWarnings: number;
  totalInfo: number;
  passedValidations: string[];
  failedValidations: string[];
  validationsPassed: boolean;
  lastRun: Date;
  errors: ValidationError[];
}

export interface DataSheet {
  id: string;
  name: string;
  type: 'clients' | 'workers' | 'tasks';
  data: DataRow[];
  columns: string[];
  validationErrors: ValidationError[];
  validationSummary?: ValidationSummary;
  lastModified: Date;
}

// Business Rules
export interface RuleCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in_range';
  value: any;
}

export interface RuleAction {
  type: 'assign' | 'restrict' | 'prioritize' | 'limit';
  parameters: Record<string, any>;
}

export interface RuleConfig {
  conditions: RuleCondition[];
  actions: RuleAction[];
  priority: number;
}

export interface BusinessRule {
  id: string;
  name: string;
  description: string;
  naturalLanguage: string;
  ruleType: 'co_run' | 'slot_restriction' | 'load_limit' | 'phase_window' | 'pattern_match' | 'precedence_override' | 'custom';
  ruleConfig: RuleConfig;
  isActive: boolean;
  createdAt: Date;
  affectedEntities?: string[]; // IDs of affected entities
}

// Specific Rule Types
export interface CoRunRule extends BusinessRule {
  ruleType: 'co_run';
  tasks: string[]; // TaskIDs that must run together
}

export interface SlotRestrictionRule extends BusinessRule {
  ruleType: 'slot_restriction';
  targetGroup: string; // ClientGroup or WorkerGroup
  minCommonSlots: number;
}

export interface LoadLimitRule extends BusinessRule {
  ruleType: 'load_limit';
  workerGroup: string;
  maxSlotsPerPhase: number;
}

export interface PhaseWindowRule extends BusinessRule {
  ruleType: 'phase_window';
  taskID: string;
  allowedPhases: number[];
}

export interface Priority {
  id: string;
  name: string;
  weight: number;
  description: string;
  category: 'fulfillment' | 'fairness' | 'efficiency' | 'quality' | 'custom';
}

export interface PriorityProfile {
  id: string;
  name: string;
  description: string;
  priorities: Priority[];
  isPreset: boolean;
}

export interface ExportData {
  cleanedData: {
    clients: Client[];
    workers: Worker[];
    tasks: Task[];
  };
  rules: BusinessRule[];
  priorities: Priority[];
  priorityProfile?: PriorityProfile;
  metadata: {
    exportedAt: Date;
    totalRows: number;
    validationsPassed: boolean;
    validationSummary: ValidationSummary;
  };
}

export interface AIResponse {
  success: boolean;
  data?: any;
  error?: string;
  suggestions?: string[];
}

export interface SearchQuery {
  query: string;
  filters?: {
    type?: 'clients' | 'workers' | 'tasks';
    columns?: string[];
  };
}

export interface FileUploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

// AI Features
export interface DataModificationSuggestion {
  id: string;
  row: number;
  column: string;
  currentValue: any;
  suggestedValue: any;
  reason: string;
  confidence: number; // 0-1
  autoApplyable: boolean;
}

export interface RuleSuggestion {
  id: string;
  ruleType: BusinessRule['ruleType'];
  naturalLanguage: string;
  confidence: number;
  affectedEntities: string[];
  reasoning: string;
  autoGenerated: boolean;
} 