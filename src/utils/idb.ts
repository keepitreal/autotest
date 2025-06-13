import { exec, spawn, ChildProcess } from "child_process";
import { promisify } from "util";
import { logger } from "./logger";
import { config } from "./config";

const execAsync = promisify(exec);

export interface IDBCommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface IDBTarget {
  udid: string;
  name: string;
  model: string;
  os_version: string;
  architecture: string;
  state: string;
  type: string;
}

export class IDBWrapper {
  private idbLogger = logger.createChildLogger("IDB");
  private idbConfig = config.getIDBConfig();

  constructor() {
    this.checkIDBInstallation();
  }

  private async checkIDBInstallation(): Promise<void> {
    try {
      await this.executeCommand(["--help"]);
      this.idbLogger.info("IDB installation verified");
    } catch (error) {
      this.idbLogger.error(
        "IDB is not installed or not in PATH. Please install fb-idb first.",
        error
      );
      throw new Error("IDB is required but not found. Please install fb-idb.");
    }
  }

  async executeCommand(
    args: string[],
    timeout?: number
  ): Promise<IDBCommandResult> {
    const timeoutMs = timeout || this.idbConfig.timeout;

    // Properly escape arguments that contain spaces or special characters
    const escapedArgs = args.map((arg) => {
      // If the argument contains spaces, quotes, or other special characters, quote it
      if (/[\s"'`$\\(){}[\]|&;<>?*~]/.test(arg)) {
        // Escape any existing quotes and wrap in quotes
        return `"${arg.replace(/"/g, '\\"')}"`;
      }
      return arg;
    });

    const fullCommand = `idb ${escapedArgs.join(" ")}`;

    this.idbLogger.debug(`Executing IDB command: ${fullCommand}`);

    try {
      const { stdout, stderr } = await execAsync(fullCommand, {
        timeout: timeoutMs,
        encoding: "utf8",
      });

      this.idbLogger.debug(`IDB command succeeded: ${fullCommand}`);
      return {
        success: true,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0,
      };
    } catch (error: any) {
      this.idbLogger.error(`IDB command failed: ${fullCommand}`, error);
      return {
        success: false,
        stdout: error.stdout || "",
        stderr: error.stderr || error.message || "",
        exitCode: error.code || 1,
      };
    }
  }

  async executeCommandWithRetry(
    args: string[],
    timeout?: number
  ): Promise<IDBCommandResult> {
    let lastResult: IDBCommandResult | null = null;

    for (
      let attempt = 1;
      attempt <= this.idbConfig.retryAttempts + 1;
      attempt++
    ) {
      this.idbLogger.debug(
        `IDB command attempt ${attempt}/${this.idbConfig.retryAttempts + 1}`
      );

      lastResult = await this.executeCommand(args, timeout);

      if (lastResult.success) {
        return lastResult;
      }

      if (attempt <= this.idbConfig.retryAttempts) {
        this.idbLogger.warning(
          `IDB command failed, retrying in ${this.idbConfig.retryDelay}ms...`
        );
        await this.delay(this.idbConfig.retryDelay);
      }
    }

    return lastResult!;
  }

  async executeCommandWithSpawn(
    args: string[],
    timeout?: number
  ): Promise<IDBCommandResult> {
    const timeoutMs = timeout || this.idbConfig.timeout;

    this.idbLogger.debug(
      `Executing IDB command with spawn: idb ${args.join(" ")}`
    );

    return new Promise((resolve) => {
      const child = spawn("idb", args, {
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";
      let timeoutId: NodeJS.Timeout | null = null;

      // Set up timeout
      if (timeoutMs > 0) {
        timeoutId = setTimeout(() => {
          child.kill();
          resolve({
            success: false,
            stdout,
            stderr: stderr + "\nCommand timed out",
            exitCode: -1,
          });
        }, timeoutMs);
      }

      // Collect stdout
      if (child.stdout) {
        child.stdout.on("data", (data) => {
          stdout += data.toString();
        });
      }

      // Collect stderr
      if (child.stderr) {
        child.stderr.on("data", (data) => {
          stderr += data.toString();
        });
      }

      // Handle process exit
      child.on("exit", (code) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        const success = code === 0;
        const result: IDBCommandResult = {
          success,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code || 0,
        };

        if (success) {
          this.idbLogger.debug(`IDB command succeeded with spawn`);
        } else {
          this.idbLogger.error(`IDB command failed with spawn`, result);
        }

        resolve(result);
      });

      // Handle spawn errors
      child.on("error", (error) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        this.idbLogger.error(`IDB spawn error`, error);
        resolve({
          success: false,
          stdout,
          stderr: stderr + "\n" + error.message,
          exitCode: -1,
        });
      });
    });
  }

  async spawnCommand(
    args: string[],
    options?: {
      onStdout?: (data: string) => void;
      onStderr?: (data: string) => void;
      onExit?: (code: number | null) => void;
    }
  ): Promise<ChildProcess> {
    const fullCommand = `idb ${args.join(" ")}`;
    this.idbLogger.debug(`Spawning IDB command: ${fullCommand}`);

    const child = spawn("idb", args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    if (options?.onStdout) {
      child.stdout?.on("data", (data) => {
        options.onStdout!(data.toString());
      });
    }

    if (options?.onStderr) {
      child.stderr?.on("data", (data) => {
        options.onStderr!(data.toString());
      });
    }

    if (options?.onExit) {
      child.on("exit", (code) => {
        options.onExit!(code);
      });
    }

    return child;
  }

  async listTargets(): Promise<IDBTarget[]> {
    const result = await this.executeCommand(["list-targets", "--json"]);

    if (!result.success) {
      throw new Error(`Failed to list IDB targets: ${result.stderr}`);
    }

    try {
      const targets = JSON.parse(result.stdout);
      return targets;
    } catch (error) {
      this.idbLogger.error("Failed to parse targets JSON", error);
      throw new Error("Failed to parse IDB targets response");
    }
  }

  async connectToTarget(udid: string): Promise<void> {
    const result = await this.executeCommandWithRetry(["connect", udid]);

    if (!result.success) {
      throw new Error(`Failed to connect to target ${udid}: ${result.stderr}`);
    }
  }

  async disconnectFromTarget(udid: string): Promise<void> {
    const result = await this.executeCommand(["disconnect", udid]);

    if (!result.success) {
      this.idbLogger.warning(
        `Failed to disconnect from target ${udid}: ${result.stderr}`
      );
    }
  }

  async installApp(udid: string, appPath: string): Promise<void> {
    const result = await this.executeCommandWithRetry([
      "install",
      "--udid",
      udid,
      appPath,
    ]);

    if (!result.success) {
      throw new Error(
        `Failed to install app ${appPath} on ${udid}: ${result.stderr}`
      );
    }
  }

  async launchApp(udid: string, bundleId: string): Promise<void> {
    const result = await this.executeCommandWithRetry([
      "launch",
      "--udid",
      udid,
      bundleId,
    ]);

    if (!result.success) {
      throw new Error(
        `Failed to launch app ${bundleId} on ${udid}: ${result.stderr}`
      );
    }
  }

  async terminateApp(udid: string, bundleId: string): Promise<void> {
    const result = await this.executeCommand([
      "terminate",
      "--udid",
      udid,
      bundleId,
    ]);

    if (!result.success) {
      throw new Error(
        `Failed to terminate app ${bundleId} on ${udid}: ${result.stderr}`
      );
    }
  }

  async tap(udid: string, x: number, y: number): Promise<void> {
    const result = await this.executeCommand([
      "ui",
      "tap",
      "--udid",
      udid,
      x.toString(),
      y.toString(),
    ]);

    if (!result.success) {
      throw new Error(
        `Failed to tap at ${x}, ${y} on ${udid}: ${result.stderr}`
      );
    }
  }

  async inputText(udid: string, text: string): Promise<void> {
    // Use spawn instead of exec for text input to properly handle special characters
    const result = await this.executeCommandWithSpawn([
      "ui",
      "text",
      "--udid",
      udid,
      text,
    ]);

    if (!result.success) {
      throw new Error(
        `Failed to input text "${text}" on ${udid}: ${result.stderr}`
      );
    }
  }

  async pressKey(
    udid: string,
    keyCode: string,
    duration?: number
  ): Promise<void> {
    const args = ["ui", "key", "--udid", udid, keyCode];

    if (duration !== undefined) {
      args.push("--duration", duration.toString());
    }

    // Use spawn for key presses to handle special key combinations properly
    const result = await this.executeCommandWithSpawn(args);

    if (!result.success) {
      throw new Error(
        `Failed to press key "${keyCode}" on ${udid}: ${result.stderr}`
      );
    }
  }

  async pressEnter(udid: string): Promise<void> {
    // Common key codes for Enter: "enter", "return", or key code 13
    await this.pressKey(udid, "enter");
  }

  async pressBackspace(udid: string): Promise<void> {
    // Common key codes for Backspace: "backspace", "delete", or key code 8
    await this.pressKey(udid, "backspace");
  }

  async clearText(udid: string): Promise<void> {
    // Select all and delete - common pattern for clearing text fields
    // This might need adjustment based on actual key codes supported
    try {
      await this.pressKey(udid, "cmd+a"); // Select all
      await this.pressKey(udid, "backspace"); // Delete
    } catch (error) {
      this.idbLogger.warning("Failed to clear text using key commands", error);
      throw new Error(`Failed to clear text on ${udid}: ${error}`);
    }
  }

  async swipe(
    udid: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    duration?: number,
    delta?: number
  ): Promise<void> {
    const args = [
      "ui",
      "swipe",
      "--udid",
      udid,
      x1.toString(),
      y1.toString(),
      x2.toString(),
      y2.toString(),
    ];

    if (duration !== undefined) {
      args.push("--duration", duration.toString());
    }

    if (delta !== undefined) {
      args.push("--delta", delta.toString());
    }

    const result = await this.executeCommand(args);

    if (!result.success) {
      throw new Error(
        `Failed to swipe from ${x1}, ${y1} to ${x2}, ${y2} on ${udid}: ${result.stderr}`
      );
    }
  }

  async scroll(
    udid: string,
    x: number,
    y: number,
    direction: "up" | "down" | "left" | "right",
    distance: number = 200,
    duration: number = 0.5
  ): Promise<void> {
    let x1 = x,
      y1 = y,
      x2 = x,
      y2 = y;

    // Calculate end coordinates based on direction
    // Note: Scroll directions are opposite to swipe directions
    // To scroll "down" (see content below), we swipe "up"
    // To scroll "up" (see content above), we swipe "down"
    switch (direction) {
      case "up":
        // Scroll up = swipe down to reveal content above
        y2 = y + distance;
        break;
      case "down":
        // Scroll down = swipe up to reveal content below
        y2 = y - distance;
        break;
      case "left":
        // Scroll left = swipe right to reveal content to the left
        x2 = x + distance;
        break;
      case "right":
        // Scroll right = swipe left to reveal content to the right
        x2 = x - distance;
        break;
    }

    // Use appropriate delta for smooth scrolling (smaller delta = smoother)
    const delta = 5;

    await this.swipe(udid, x1, y1, x2, y2, duration, delta);
  }

  async screenshot(udid: string, outputPath?: string): Promise<string> {
    let finalOutputPath: string;

    if (outputPath) {
      finalOutputPath = outputPath;
    } else {
      // Generate path in user's temp directory
      const timestamp = Date.now();
      const userHome = process.env.HOME || process.env.USERPROFILE || "/tmp";
      const artifactsDir = `${userHome}/tmp/rn-simulator-testing`;

      // Ensure the directory exists
      try {
        await execAsync(`mkdir -p "${artifactsDir}"`);
      } catch (error) {
        this.idbLogger.warning(
          "Failed to create user temp artifacts directory",
          error
        );
      }

      finalOutputPath = `${artifactsDir}/screenshot-${timestamp}.png`;
    }

    this.idbLogger.debug(
      `Taking screenshot with xcrun simctl: ${udid} -> ${finalOutputPath}`
    );

    try {
      const { stderr } = await execAsync(
        `xcrun simctl io "${udid}" screenshot "${finalOutputPath}"`,
        { timeout: 10000 }
      );

      // Only treat stderr as an error if it contains actual error messages
      // "Detected file type 'PNG' from extension" is informational, not an error
      if (stderr && stderr.includes("error")) {
        throw new Error(`xcrun simctl screenshot failed: ${stderr}`);
      }

      this.idbLogger.debug("xcrun simctl screenshot successful");
      return finalOutputPath;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.idbLogger.error(`Screenshot failed: ${errorMessage}`);

      throw new Error(
        `Failed to take screenshot on ${udid}: ${errorMessage}. ` +
          `Make sure the simulator is booted and accessible.`
      );
    }
  }

  async recordVideo(
    udid: string,
    outputPath: string,
    duration?: number
  ): Promise<ChildProcess> {
    const args = ["video", "--udid", udid, outputPath];
    if (duration) {
      args.push("--duration", duration.toString());
    }

    return this.spawnCommand(args);
  }

  async describeElements(udid: string): Promise<string> {
    const result = await this.executeCommand([
      "ui",
      "describe-all",
      "--udid",
      udid,
    ]);

    if (!result.success) {
      throw new Error(
        `Failed to describe elements on ${udid}: ${result.stderr}`
      );
    }

    return result.stdout;
  }

  async describePoint(udid: string, x: number, y: number): Promise<string> {
    const result = await this.executeCommand([
      "ui",
      "describe-point",
      "--udid",
      udid,
      x.toString(),
      y.toString(),
    ]);

    if (!result.success) {
      throw new Error(
        `Failed to describe point ${x}, ${y} on ${udid}: ${result.stderr}`
      );
    }

    return result.stdout;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Global IDB wrapper instance
export const idb = new IDBWrapper();
