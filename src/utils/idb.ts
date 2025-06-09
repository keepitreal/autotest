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
    const fullCommand = `idb ${args.join(" ")}`;

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
      "--udid",
      udid,
      "install",
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
      "--udid",
      udid,
      "launch",
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
      "--udid",
      udid,
      "terminate",
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
      "--udid",
      udid,
      "ui",
      "tap",
      x.toString(),
      y.toString(),
    ]);

    if (!result.success) {
      throw new Error(
        `Failed to tap at ${x}, ${y} on ${udid}: ${result.stderr}`
      );
    }
  }

  async swipe(
    udid: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): Promise<void> {
    const result = await this.executeCommand([
      "--udid",
      udid,
      "ui",
      "swipe",
      x1.toString(),
      y1.toString(),
      x2.toString(),
      y2.toString(),
    ]);

    if (!result.success) {
      throw new Error(
        `Failed to swipe from ${x1}, ${y1} to ${x2}, ${y2} on ${udid}: ${result.stderr}`
      );
    }
  }

  async screenshot(udid: string, outputPath?: string): Promise<string> {
    const args = ["--udid", udid, "screenshot"];
    if (outputPath) {
      args.push(outputPath);
    }

    const result = await this.executeCommand(args);

    if (!result.success) {
      throw new Error(`Failed to take screenshot on ${udid}: ${result.stderr}`);
    }

    return outputPath || result.stdout;
  }

  async recordVideo(
    udid: string,
    outputPath: string,
    duration?: number
  ): Promise<ChildProcess> {
    const args = ["--udid", udid, "record-video", outputPath];
    if (duration) {
      args.push("--duration", duration.toString());
    }

    return this.spawnCommand(args);
  }

  async describeElements(udid: string): Promise<string> {
    const result = await this.executeCommand([
      "--udid",
      udid,
      "ui",
      "describe-all",
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
      "--udid",
      udid,
      "ui",
      "describe-point",
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
