export enum TaskMode {
  SCORING = 'scoring',
  COMPARISON = 'comparison',
}

export interface Dimension {
  id: string;
  name: string;
  description: string;
  min: number;
  max: number;
  step: number;
}

export interface FieldMapping {
  key: string;
  role: 'context' | 'target' | 'modelA' | 'modelB' | 'ignore';
  label: string;
}

export interface TaskRecord {
  id: string;
  data: Record<string, any>;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  mode: TaskMode;
  createdAt: number;
  fields: FieldMapping[];
  dimensions?: Dimension[]; // Only for Scoring mode
  records: TaskRecord[];
}

export interface EvaluationResult {
  taskId: string;
  recordId: string;
  scores?: Record<string, number>; // DimensionId -> Score
  comparisonSelection?: 'left' | 'right' | 'tie';
  comment?: string;
  updatedAt: number;
}

export type EvaluationMap = Record<string, EvaluationResult>; // Key: recordId