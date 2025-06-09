import { MCPServerConfig } from "../types/mcp";

export interface ServerConfiguration {
  mcp: MCPServerConfig;
  simulator: {
    defaultDevice: string;
    defaultIOSVersion: string;
    timeout: number;
    autoBootOnCreate: boolean;
  };
  reactNative: {
    defaultMetroPort: number;
    defaultScheme: string;
    buildTimeout: number;
    enableFastRefresh: boolean;
    enableHotReload: boolean;
  };
  idb: {
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  };
  logging: {
    level: "debug" | "info" | "warning" | "error";
    enableMCPLogging: boolean;
    logFile?: string;
  };
}

const defaultConfig: ServerConfiguration = {
  mcp: {
    name: "rn-ios-simulator-mcp",
    version: "1.0.0",
    description: "MCP server for React Native iOS simulator integration",
    capabilities: {
      tools: true,
      resources: false,
      prompts: false,
    },
  },
  simulator: {
    defaultDevice: process.env.RN_DEFAULT_DEVICE || "iPhone 15 Pro",
    defaultIOSVersion: process.env.RN_DEFAULT_IOS_VERSION || "17.0",
    timeout: parseInt(process.env.RN_SIMULATOR_TIMEOUT || "30000", 10),
    autoBootOnCreate: process.env.RN_AUTO_BOOT !== "false",
  },
  reactNative: {
    defaultMetroPort: parseInt(process.env.RN_METRO_PORT || "8081", 10),
    defaultScheme: process.env.RN_DEFAULT_SCHEME || "Debug",
    buildTimeout: parseInt(process.env.RN_BUILD_TIMEOUT || "300000", 10), // 5 minutes
    enableFastRefresh: process.env.RN_FAST_REFRESH !== "false",
    enableHotReload: process.env.RN_HOT_RELOAD !== "false",
  },
  idb: {
    timeout: parseInt(process.env.IDB_TIMEOUT || "30000", 10),
    retryAttempts: parseInt(process.env.IDB_RETRY_ATTEMPTS || "3", 10),
    retryDelay: parseInt(process.env.IDB_RETRY_DELAY || "1000", 10),
  },
  logging: {
    level: (process.env.LOG_LEVEL as any) || "info",
    enableMCPLogging: process.env.MCP_LOGGING !== "false",
    logFile: process.env.LOG_FILE,
  },
};

export class ConfigManager {
  private config: ServerConfiguration;

  constructor(overrides?: Partial<ServerConfiguration>) {
    this.config = this.mergeConfig(defaultConfig, overrides || {});
    this.validateConfig();
  }

  private mergeConfig(
    base: ServerConfiguration,
    overrides: Partial<ServerConfiguration>
  ): ServerConfiguration {
    return {
      mcp: { ...base.mcp, ...overrides.mcp },
      simulator: { ...base.simulator, ...overrides.simulator },
      reactNative: { ...base.reactNative, ...overrides.reactNative },
      idb: { ...base.idb, ...overrides.idb },
      logging: { ...base.logging, ...overrides.logging },
    };
  }

  private validateConfig() {
    // Validate simulator timeout
    if (this.config.simulator.timeout < 5000) {
      throw new Error("Simulator timeout must be at least 5 seconds");
    }

    // Validate Metro port
    if (
      this.config.reactNative.defaultMetroPort < 1024 ||
      this.config.reactNative.defaultMetroPort > 65535
    ) {
      throw new Error("Metro port must be between 1024 and 65535");
    }

    // Validate IDB settings
    if (this.config.idb.retryAttempts < 0) {
      throw new Error("IDB retry attempts must be non-negative");
    }

    // Validate log level
    const validLevels = ["debug", "info", "warning", "error"];
    if (!validLevels.includes(this.config.logging.level)) {
      throw new Error(
        `Invalid log level. Must be one of: ${validLevels.join(", ")}`
      );
    }
  }

  get(): ServerConfiguration {
    return this.config;
  }

  getMCPConfig(): MCPServerConfig {
    return this.config.mcp;
  }

  getSimulatorConfig() {
    return this.config.simulator;
  }

  getReactNativeConfig() {
    return this.config.reactNative;
  }

  getIDBConfig() {
    return this.config.idb;
  }

  getLoggingConfig() {
    return this.config.logging;
  }

  updateConfig(updates: Partial<ServerConfiguration>) {
    this.config = this.mergeConfig(this.config, updates);
    this.validateConfig();
  }
}

// Global config instance
export const config = new ConfigManager();
