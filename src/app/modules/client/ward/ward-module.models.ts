export type WardModuleKey =
  | 'admissions'
  | 'nursing-care'
  | 'mar'
  | 'drips-iv'
  | 'vitals'
  | 'io-chart'
  | 'orders-services'
  | 'shift-handover'
  | 'inventory'
  | 'reports';

export interface WardModuleKpi {
  label: string;
  value: number | string;
  icon: string;
  tone: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'amber' | 'teal';
}

export interface WardModuleTab {
  key: string;
  label: string;
}

export interface WardModuleColumn {
  key: string;
  label: string;
  type?: 'text' | 'badge' | 'link';
}

export interface WardModuleRow {
  id: string;
  cells: Record<string, string>;
  badgeTone?: Record<string, string>;
  linkRoute?: string;
}

export interface WardModuleReportCard {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
}

export interface WardModuleHierarchyNode {
  id: string;
  label: string;
  level: number;
  icon: string;
}

export interface WardModulePageConfig {
  key: WardModuleKey;
  title: string;
  subtitle: string;
  primaryActionLabel?: string;
  searchPlaceholder: string;
  layout: 'table' | 'reports' | 'hierarchy';
  kpis: WardModuleKpi[];
  tabs: WardModuleTab[];
  columns: WardModuleColumn[];
}
