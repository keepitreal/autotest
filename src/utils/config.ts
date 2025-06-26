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
    defaultBundleId: string;
  };
  idb: {
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  };
  artifacts: {
    screenshotPath: string;
    videoPath: string;
  };
  headless: {
    enabled: boolean;
    mode: "virtual-display" | "cli-only" | "idb-companion";
    display: {
      id: string;
      resolution: string;
      colorDepth: number;
    };
    companion: {
      port: number;
      enableTLS: boolean;
    };
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
      prompts: true,
    },
  },
  simulator: {
    defaultDevice: process.env.RN_DEFAULT_DEVICE || "iPhone 15 Pro",
    defaultIOSVersion: process.env.RN_DEFAULT_IOS_VERSION || "17.0",
    timeout: parseInt(process.env.RN_SIMULATOR_TIMEOUT || "30000", 10),
    autoBootOnCreate: process.env.RN_AUTO_BOOT !== "false",
  },
  reactNative: {
    defaultBundleId: process.env.RN_BUNDLE_ID || "",
  },
  idb: {
    timeout: parseInt(process.env.IDB_TIMEOUT || "30000", 10),
    retryAttempts: parseInt(process.env.IDB_RETRY_ATTEMPTS || "3", 10),
    retryDelay: parseInt(process.env.IDB_RETRY_DELAY || "1000", 10),
  },
  artifacts: {
    screenshotPath: process.env.SCREENSHOT_PATH || "",
    videoPath: process.env.VIDEO_PATH || "",
  },
  headless: {
    enabled: process.env.HEADLESS_MODE === "true",
    mode: (process.env.HEADLESS_MODE_TYPE as any) || "cli-only",
    display: {
      id: process.env.HEADLESS_DISPLAY_ID || ":99",
      resolution: process.env.HEADLESS_RESOLUTION || "1024x768",
      colorDepth: parseInt(process.env.HEADLESS_COLOR_DEPTH || "24", 10),
    },
    companion: {
      port: parseInt(process.env.IDB_COMPANION_PORT || "10880", 10),
      enableTLS: process.env.IDB_COMPANION_TLS === "true",
    },
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
      artifacts: { ...base.artifacts, ...overrides.artifacts },
      headless: { ...base.headless, ...overrides.headless },
      logging: { ...base.logging, ...overrides.logging },
    };
  }

  private validateConfig() {
    // Validate simulator timeout
    if (this.config.simulator.timeout < 5000) {
      throw new Error("Simulator timeout must be at least 5 seconds");
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

  getHeadlessConfig() {
    return this.config.headless;
  }

  getArtifactsConfig() {
    return this.config.artifacts;
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
