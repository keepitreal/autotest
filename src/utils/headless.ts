import { exec, spawn, ChildProcess } from "child_process";
import { promisify } from "util";
import { logger } from "./logger";
import { config } from "./config";

const execAsync = promisify(exec);

export interface HeadlessSetupResult {
  success: boolean;
  message: string;
  environment?: Record<string, string>;
  cleanup?: () => Promise<void>;
}

export class HeadlessManager {
  private headlessLogger = logger.createChildLogger("Headless");
  private headlessConfig = config.getHeadlessConfig();
  private virtualDisplayProcess?: ChildProcess;
  private idbCompanionProcess?: ChildProcess;

  constructor() {
    this.headlessLogger.info(
      `🤖 HeadlessManager initialized - Mode: ${
        this.headlessConfig.enabled ? "ENABLED" : "DISABLED"
      }`
    );
    if (this.headlessConfig.enabled) {
      this.headlessLogger.info(`🔧 Mode type: ${this.headlessConfig.mode}`);
      this.headlessLogger.info(
        `🌍 Raw HEADLESS_MODE env: "${process.env.HEADLESS_MODE}"`
      );
      this.headlessLogger.info(
        `🔧 Raw HEADLESS_MODE_TYPE env: "${process.env.HEADLESS_MODE_TYPE}"`
      );
    }
  }

  async setup(): Promise<HeadlessSetupResult> {
    this.headlessLogger.info("🔄 HeadlessManager.setup() called");

    if (!this.headlessConfig.enabled) {
      this.headlessLogger.info("🚫 Headless mode disabled, using normal mode");
      return {
        success: true,
        message: "Headless mode is disabled, running in normal mode",
      };
    }

    this.headlessLogger.info(
      `🚀 Setting up headless mode: ${this.headlessConfig.mode}`
    );

    switch (this.headlessConfig.mode) {
      case "virtual-display":
        return this.setupVirtualDisplay();
      case "cli-only":
        return this.setupCLIOnly();
      case "idb-companion":
        return this.setupIDBCompanion();
      default:
        return {
          success: false,
          message: `Unknown headless mode: ${this.headlessConfig.mode}`,
        };
    }
  }

  private async setupVirtualDisplay(): Promise<HeadlessSetupResult> {
    try {
      // Check if Xvfb is available
      await execAsync("which Xvfb");
    } catch (error) {
      return {
        success: false,
        message:
          "Xvfb not found. Install it with: brew install xvfb (macOS) or apt-get install xvfb (Linux)",
      };
    }

    try {
      const displayId = this.headlessConfig.display.id;
      const resolution = this.headlessConfig.display.resolution;
      const colorDepth = this.headlessConfig.display.colorDepth;

      // Kill any existing virtual display
      try {
        await execAsync(`pkill -f "Xvfb ${displayId}"`);
        await this.delay(1000); // Wait for cleanup
      } catch (error) {
        // Ignore if no existing process
      }

      // Start virtual display
      const xvfbCommand = `Xvfb ${displayId} -screen 0 ${resolution}x${colorDepth}`;
      this.headlessLogger.info(`Starting virtual display: ${xvfbCommand}`);

      this.virtualDisplayProcess = spawn("Xvfb", [
        displayId,
        "-screen",
        "0",
        `${resolution}x${colorDepth}`,
      ]);

      // Wait a bit for Xvfb to start
      await this.delay(2000);

      // Verify the display is running
      try {
        await execAsync(`xdpyinfo -display ${displayId}`);
      } catch (error) {
        return {
          success: false,
          message: `Failed to verify virtual display ${displayId}`,
        };
      }

      this.headlessLogger.info(
        `Virtual display ${displayId} started successfully`
      );

      return {
        success: true,
        message: `Virtual display running on ${displayId}`,
        environment: {
          DISPLAY: displayId,
        },
        cleanup: this.cleanupVirtualDisplay.bind(this),
      };
    } catch (error) {
      this.headlessLogger.error("Failed to setup virtual display", error);
      return {
        success: false,
        message: `Virtual display setup failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }

  private async setupCLIOnly(): Promise<HeadlessSetupResult> {
    this.headlessLogger.info("🖥️ Setting up CLI-only mode (no GUI rendering)");

    // In CLI-only mode, we:
    // 1. Boot simulators using xcrun simctl (doesn't open Simulator.app)
    // 2. Use IDB for all interactions
    // 3. Set environment variables to prevent GUI

    this.headlessLogger.info("✅ CLI-only mode setup completed");
    return {
      success: true,
      message: "CLI-only mode configured (simulators will boot without GUI)",
      environment: {
        SIMULATOR_HEADLESS: "1",
        IOS_SIMULATOR_HEADLESS: "1",
      },
    };
  }

  private async setupIDBCompanion(): Promise<HeadlessSetupResult> {
    try {
      // Check if IDB companion is available
      await execAsync("idb companion --help");
    } catch (error) {
      return {
        success: false,
        message:
          "IDB companion not available. Ensure fb-idb is properly installed.",
      };
    }

    try {
      const port = this.headlessConfig.companion.port;
      const enableTLS = this.headlessConfig.companion.enableTLS;

      // Kill any existing companion
      try {
        await execAsync(`pkill -f "idb companion"`);
        await this.delay(1000);
      } catch (error) {
        // Ignore if no existing process
      }

      // Start IDB companion
      const companionArgs = ["companion", "--port", port.toString()];
      if (enableTLS) {
        companionArgs.push("--tls");
      }

      this.headlessLogger.info(
        `Starting IDB companion: idb ${companionArgs.join(" ")}`
      );

      this.idbCompanionProcess = spawn("idb", companionArgs);

      // Wait for companion to start
      await this.delay(3000);

      // Verify companion is running
      try {
        await execAsync(`curl -s http://localhost:${port}/status`);
      } catch (error) {
        return {
          success: false,
          message: `Failed to verify IDB companion on port ${port}`,
        };
      }

      this.headlessLogger.info(`IDB companion started on port ${port}`);

      return {
        success: true,
        message: `IDB companion running on port ${port}`,
        environment: {
          IDB_COMPANION_PORT: port.toString(),
          IDB_COMPANION_TLS: enableTLS.toString(),
        },
        cleanup: this.cleanupIDBCompanion.bind(this),
      };
    } catch (error) {
      this.headlessLogger.error("Failed to setup IDB companion", error);
      return {
        success: false,
        message: `IDB companion setup failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }

  private async cleanupVirtualDisplay(): Promise<void> {
    if (this.virtualDisplayProcess) {
      this.headlessLogger.info("Cleaning up virtual display");
      this.virtualDisplayProcess.kill();
      this.virtualDisplayProcess = undefined;
    }

    try {
      const displayId = this.headlessConfig.display.id;
      await execAsync(`pkill -f "Xvfb ${displayId}"`);
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  private async cleanupIDBCompanion(): Promise<void> {
    if (this.idbCompanionProcess) {
      this.headlessLogger.info("Cleaning up IDB companion");
      this.idbCompanionProcess.kill();
      this.idbCompanionProcess = undefined;
    }

    try {
      await execAsync(`pkill -f "idb companion"`);
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  async cleanup(): Promise<void> {
    this.headlessLogger.info("Cleaning up headless mode");

    await this.cleanupVirtualDisplay();
    await this.cleanupIDBCompanion();
  }

  isHeadlessEnabled(): boolean {
    return this.headlessConfig.enabled;
  }

  getHeadlessMode(): string {
    return this.headlessConfig.mode;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Global headless manager instance
export const headlessManager = new HeadlessManager();
