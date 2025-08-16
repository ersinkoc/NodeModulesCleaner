export interface NodeModulesInfo {
  path: string;
  size: number;
  sizeFormatted: string;
  packageCount: number;
  lastModified: Date;
  packages: PackageInfo[];
  projectName?: string;
  projectPath: string;
}

export interface PackageInfo {
  name: string;
  version: string;
  size: number;
  dependencies: number;
  path: string;
}

export interface ScanOptions {
  maxDepth?: number;
  excludePaths?: string[];
  includeHidden?: boolean;
  parallel?: boolean;
  showProgress?: boolean;
}

export interface AnalyzeOptions extends ScanOptions {
  sizeThreshold?: number;
  ageThreshold?: number;
  findDuplicates?: boolean;
}

export interface CleanOptions {
  dryRun?: boolean;
  backup?: boolean;
  force?: boolean;
  interactive?: boolean;
}

export interface DuplicatePackage {
  name: string;
  versions: string[];
  locations: string[];
  totalSize: number;
  potentialSavings: number;
}

export interface DuplicateReport {
  totalDuplicates: number;
  potentialSavings: number;
  packages: DuplicatePackage[];
}

export interface Statistics {
  totalSize: number;
  totalPackages: number;
  totalNodeModules: number;
  averageSize: number;
  largestNodeModules: NodeModulesInfo[];
  oldestNodeModules: NodeModulesInfo[];
}

export interface ParsedArgs {
  command: string;
  args: string[];
  options: Record<string, any>;
  flags: Set<string>;
}

export interface CommandHandler {
  name: string;
  description: string;
  options?: OptionConfig[];
  execute: (args: ParsedArgs) => Promise<void>;
}

export interface OptionConfig {
  name: string;
  alias?: string;
  type: 'string' | 'number' | 'boolean';
  description: string;
  default?: any;
}

export interface RouteHandler {
  (req: any, res: any): void | Promise<void>;
}

export interface SSEClient {
  id: string;
  response: any;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string;
  }[];
}

export interface Column {
  key: string;
  header: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  formatter?: (value: any) => string;
}

export type ProgressCallback = (current: number, total: number, message?: string) => void;