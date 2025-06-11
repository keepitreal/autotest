export interface SimulatorInfo {
  udid: string;
  name: string;
  state: "Booted" | "Shutdown" | "Booting" | "Shutting Down";
  runtime: string;
  deviceTypeIdentifier: string;
  platform: string;
  version: string;
}

export interface SimulatorSession {
  id: string;
  udid: string;
  name: string;
  state: "active" | "inactive" | "terminated";
  createdAt: Date;
  projectPath?: string;
  bundleId?: string;
}

export interface RNSimulatorConfig {
  deviceType:
    | "iPhone 15"
    | "iPhone 15 Pro"
    | "iPhone 15 Plus"
    | "iPhone 15 Pro Max"
    | "iPad Air"
    | "iPad Pro";
  iosVersion?: string;
  projectPath?: string;
  scheme?: string;
  bundleId?: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface ElementInfo {
  type: string;
  label?: string;
  value?: string;
  frame: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  testID?: string;
  accessibilityIdentifier?: string;
  visible: boolean;
  enabled: boolean;
}

export interface BuildResult {
  success: boolean;
  buildPath?: string;
  error?: string;
  warnings: string[];
  duration: number;
  command?: string;
  workingDirectory?: string;
  bundleId?: string;
  projectInfo?: {
    name: string;
    path: string;
    iosPath: string;
    bundleId?: string;
  };
  instructions?: string;
}

export interface ComponentInfo {
  id: string;
  name: string;
  props: Record<string, any>;
  state?: Record<string, any>;
  children?: ComponentInfo[];
}

export interface ComponentTree {
  root: ComponentInfo;
  totalComponents: number;
}

export interface NetworkLog {
  timestamp: Date;
  method: string;
  url: string;
  status?: number;
  duration?: number;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
}

export interface PerformanceMetrics {
  fps: number;
  memoryUsage: {
    total: number;
    used: number;
    free: number;
  };
  cpuUsage: number;
  bundleSize?: number;
  jsHeapSize?: number;
  timestamp: Date;
}
