import { exec } from "child_process";
import { promisify } from "util";
import { logger } from "../utils/logger";
import { idb } from "../utils/idb";

const execAsync = promisify(exec);

export class ReactNativeAppManager {
  private rnLogger = logger.createChildLogger("ReactNativeAppManager");

  constructor() {
    this.rnLogger.debug("React Native app manager initialized");
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
}
