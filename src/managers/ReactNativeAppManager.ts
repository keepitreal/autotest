import { exec } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as fs from "fs-extra";
import { logger } from "../utils/logger";
import { config } from "../utils/config";
import { idb } from "../utils/idb";
import {
  ReactNativeProject,
  ReactNativeBuildConfig,
} from "../types/reactnative";
import { BuildResult } from "../types/simulator";

const execAsync = promisify(exec);

export class ReactNativeAppManager {
  private rnLogger = logger.createChildLogger("ReactNativeAppManager");
  private rnConfig = config.getReactNativeConfig();

  constructor() {
    this.rnLogger.debug("React Native app manager initialized");
  }

  async buildAndRunApp(
    projectPath: string,
    simulatorUdid: string,
    buildConfig?: Partial<ReactNativeBuildConfig>
  ): Promise<BuildResult> {
    this.rnLogger.info("Building and running React Native app", {
      projectPath,
      simulatorUdid,
      buildConfig,
    });

    try {
      // Validate project
      const project = await this.validateProject(projectPath);

      // Set build configuration
      const config: ReactNativeBuildConfig = {
        scheme: buildConfig?.scheme || this.rnConfig.defaultScheme,
        configuration: buildConfig?.configuration || "Debug",
        simulator: simulatorUdid,
        verbose: buildConfig?.verbose || false,
        resetCache: buildConfig?.resetCache || false,
      };

      const startTime = Date.now();

      // Navigate to project directory and build
      const buildCommand = this.generateBuildCommand(project, config);
      this.rnLogger.info(`Executing build command: ${buildCommand}`);

      const { stdout, stderr } = await execAsync(buildCommand, {
        cwd: projectPath,
        timeout: this.rnConfig.buildTimeout,
        encoding: "utf8",
      });

      const duration = Date.now() - startTime;

      // Extract warnings from output
      const warnings = this.extractWarnings(stdout + stderr);

      // Check if build was successful
      if (stderr && stderr.includes("BUILD FAILED")) {
        throw new Error(`Build failed: ${stderr}`);
      }

      this.rnLogger.info(
        `React Native app built successfully in ${duration}ms`
      );

      return {
        success: true,
        duration,
        warnings,
        buildPath: path.join(projectPath, "ios", "build"),
      };
    } catch (error) {
      this.rnLogger.error("Failed to build React Native app", error);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown build error",
        warnings: [],
        duration: Date.now(),
      };
    }
  }

  async installApp(appPath: string, simulatorUdid: string): Promise<void> {
    this.rnLogger.info("Installing app on simulator", {
      appPath,
      simulatorUdid,
    });

    try {
      await idb.installApp(simulatorUdid, appPath);
      this.rnLogger.info("App installed successfully");
    } catch (error) {
      this.rnLogger.error("Failed to install app", error);
      throw error;
    }
  }

  async launchApp(bundleId: string, simulatorUdid: string): Promise<void> {
    this.rnLogger.info("Launching app on simulator", {
      bundleId,
      simulatorUdid,
    });

    try {
      await idb.launchApp(simulatorUdid, bundleId);
      this.rnLogger.info("App launched successfully");
    } catch (error) {
      this.rnLogger.error("Failed to launch app", error);
      throw error;
    }
  }

  async terminateApp(bundleId: string, simulatorUdid: string): Promise<void> {
    this.rnLogger.info("Terminating app on simulator", {
      bundleId,
      simulatorUdid,
    });

    try {
      await idb.terminateApp(simulatorUdid, bundleId);
      this.rnLogger.info("App terminated successfully");
    } catch (error) {
      this.rnLogger.error("Failed to terminate app", error);
      throw error;
    }
  }

  async reloadApp(bundleId: string, simulatorUdid: string): Promise<void> {
    this.rnLogger.info("Reloading React Native app", {
      bundleId,
      simulatorUdid,
    });

    try {
      // Terminate and relaunch the app
      await this.terminateApp(bundleId, simulatorUdid);
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
      await this.launchApp(bundleId, simulatorUdid);

      this.rnLogger.info("App reloaded successfully");
    } catch (error) {
      this.rnLogger.error("Failed to reload app", error);
      throw error;
    }
  }

  async openDevMenu(simulatorUdid: string): Promise<void> {
    this.rnLogger.info("Opening React Native dev menu");

    try {
      // Send Cmd+D to open dev menu
      const command = `xcrun simctl keyboardinput ${simulatorUdid} 'cmd-d'`;
      await execAsync(command);

      this.rnLogger.info("Dev menu opened");
    } catch (error) {
      this.rnLogger.error("Failed to open dev menu", error);
      throw error;
    }
  }

  async enableFastRefresh(): Promise<void> {
    this.rnLogger.info(
      "Fast Refresh is enabled by default in React Native 0.61+"
    );

    // Fast Refresh is automatically enabled in modern React Native projects
    // This is mainly for informational purposes
  }

  private async validateProject(
    projectPath: string
  ): Promise<ReactNativeProject> {
    const packageJsonPath = path.join(projectPath, "package.json");

    if (!(await fs.pathExists(packageJsonPath))) {
      throw new Error(
        `No package.json found at ${packageJsonPath}. This doesn't appear to be a React Native project.`
      );
    }

    const packageJson = await fs.readJson(packageJsonPath);

    if (
      !packageJson.dependencies?.["react-native"] &&
      !packageJson.devDependencies?.["react-native"]
    ) {
      throw new Error(
        "This doesn't appear to be a React Native project (react-native dependency not found)"
      );
    }

    const iosPath = path.join(projectPath, "ios");
    if (!(await fs.pathExists(iosPath))) {
      throw new Error(
        "iOS project directory not found. Make sure this is a React Native project with iOS support."
      );
    }

    // Extract project info
    const projectName = packageJson.name || path.basename(projectPath);
    const bundleId = await this.extractBundleId(projectPath);

    return {
      path: projectPath,
      name: projectName,
      packageJson,
      iosPath,
      androidPath: path.join(projectPath, "android"),
      schemes: ["Debug", "Release"], // Default schemes
      bundleId,
    };
  }

  private async extractBundleId(projectPath: string): Promise<string> {
    try {
      // Try to find bundle ID from iOS project
      const iosPath = path.join(projectPath, "ios");
      const files = await fs.readdir(iosPath);
      const xcodeproj = files.find((file) => file.endsWith(".xcodeproj"));

      if (xcodeproj) {
        const projectName = xcodeproj.replace(".xcodeproj", "");
        // Default bundle ID pattern for React Native projects
        return `org.reactjs.native.example.${projectName}`;
      }

      return "com.unknown.reactnativeapp";
    } catch (error) {
      this.rnLogger.warning("Could not extract bundle ID, using default");
      return "com.unknown.reactnativeapp";
    }
  }

  private generateBuildCommand(
    _project: ReactNativeProject,
    config: ReactNativeBuildConfig
  ): string {
    const commands = [
      "npx react-native run-ios",
      `--simulator="${config.simulator}"`,
      `--configuration="${config.configuration}"`,
    ];

    if (config.scheme && config.scheme !== "Debug") {
      commands.push(`--scheme="${config.scheme}"`);
    }

    if (config.resetCache) {
      commands.push("--reset-cache");
    }

    if (config.verbose) {
      commands.push("--verbose");
    }

    return commands.join(" ");
  }

  private extractWarnings(output: string): string[] {
    const warnings: string[] = [];
    const lines = output.split("\n");

    for (const line of lines) {
      if (line.includes("warning:") || line.includes("Warning:")) {
        warnings.push(line.trim());
      }
    }

    return warnings;
  }
}
