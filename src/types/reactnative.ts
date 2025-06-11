export interface ReactNativeProject {
  path: string;
  name: string;
  packageJson: any;
  iosPath: string;
  androidPath: string;
  schemes: string[];
  bundleId?: string;
}

export interface ReactNativeAppInfo {
  bundleId: string;
  displayName: string;
  version: string;
  build: string;
  isInstalled: boolean;
  isRunning: boolean;
  installPath?: string;
}

export interface DevMenuOption {
  title: string;
  action: string;
  enabled: boolean;
}

export interface DebugConfig {
  remoteJSDebugging: boolean;
  elementInspector: boolean;
  performanceMonitor: boolean;
  networkInspector: boolean;
}

export interface ReactDevToolsConfig {
  port: number;
  host: string;
  connected: boolean;
  componentFilter?: string;
}

export interface TestConfig {
  testRunner: "jest" | "detox";
  configFile?: string;
  testMatch?: string[];
  coverage?: boolean;
}

export interface LogFilter {
  level: "verbose" | "debug" | "info" | "warn" | "error";
  tag?: string;
  component?: string;
  timeRange?: {
    start: Date;
    end: Date;
  };
}
