import { v4 as uuidv4 } from "uuid";
// Temporarily comment out simctl until we resolve API issues
// import simctl from "node-simctl";
import { logger } from "../utils/logger";
import { config } from "../utils/config";
import { idb } from "../utils/idb";
import { headlessManager } from "../utils/headless";
import {
  simulateMatchingFace,
  simulateNonMatchingFace,
  simulateMatchingTouchId,
  simulateNonMatchingTouchId,
} from "../tools/simulator/FaceId";
import {
  SimulatorInfo,
  SimulatorSession,
  RNSimulatorConfig,
} from "../types/simulator";

export class SimulatorManager {
  private simulatorLogger = logger.createChildLogger("SimulatorManager");
  private simulatorConfig = config.getSimulatorConfig();
  private activeSessions = new Map<string, SimulatorSession>();

  constructor() {
    this.simulatorLogger.debug("Simulator manager initialized");
  }

  async createSimulatorSession(config: RNSimulatorConfig): Promise<string> {
    this.simulatorLogger.info("Creating new simulator session", { config });

    try {
      // Find available simulators
      const availableSimulators = await this.listAvailableSimulators();

      // Find matching simulator
      const targetSimulator = availableSimulators.find(
        (sim) =>
          sim.name.includes(config.deviceType) &&
          (config.iosVersion ? sim.version.includes(config.iosVersion) : true)
      );

      if (!targetSimulator) {
        throw new Error(
          `No simulator found matching device type: ${config.deviceType}`
        );
      }

      // Create session
      const sessionId = uuidv4();
      const session: SimulatorSession = {
        id: sessionId,
        udid: targetSimulator.udid,
        name: targetSimulator.name,
        state: "inactive",
        createdAt: new Date(),
        projectPath: config.projectPath,
      };

      this.activeSessions.set(sessionId, session);
      this.simulatorLogger.info(
        `Created simulator session: ${sessionId} for ${targetSimulator.name}`
      );

      return sessionId;
    } catch (error) {
      this.simulatorLogger.error("Failed to create simulator session", error);
      throw error;
    }
  }

  async terminateSimulatorSession(sessionId: string): Promise<void> {
    this.simulatorLogger.info(`Terminating simulator session: ${sessionId}`);

    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    try {
      // Shutdown simulator if it's running
      const simulatorInfo = await this.getSimulatorInfo(session.udid);
      if (simulatorInfo && simulatorInfo.state === "Booted") {
        await this.shutdownSimulatorByUDID(session.udid);
      }

      // Disconnect from IDB
      await idb.disconnectFromTarget(session.udid);

      // Remove session
      session.state = "terminated";
      this.activeSessions.delete(sessionId);

      this.simulatorLogger.info(`Terminated simulator session: ${sessionId}`);
    } catch (error) {
      this.simulatorLogger.error(
        `Failed to terminate session: ${sessionId}`,
        error
      );
      throw error;
    }
  }

  async listAvailableSimulators(): Promise<SimulatorInfo[]> {
    this.simulatorLogger.debug("Listing available simulators");

    try {
      // Temporary implementation using xcrun simctl directly
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);

      const { stdout } = await execAsync(
        "xcrun simctl list devices available --json",
        { timeout: 10000 } // 10 second timeout
      );
      const devices = JSON.parse(stdout);
      const simulators: SimulatorInfo[] = [];

      // Parse simctl output
      for (const [runtime, deviceList] of Object.entries(devices.devices)) {
        if (Array.isArray(deviceList)) {
          for (const device of deviceList as any[]) {
            if (runtime.includes("iOS")) {
              simulators.push({
                udid: device.udid,
                name: device.name,
                state: device.state,
                runtime: runtime,
                deviceTypeIdentifier: device.deviceTypeIdentifier || "",
                platform: "iOS",
                version: runtime.replace(/^.*iOS\s?/, "") || "Unknown",
              });
            }
          }
        }
      }

      this.simulatorLogger.debug(`Found ${simulators.length} simulators`);
      return simulators;
    } catch (error: any) {
      const errorMessage = error.message || "Unknown error";
      const isTimeout =
        errorMessage.includes("ETIMEDOUT") || errorMessage.includes("timeout");

      if (isTimeout) {
        this.simulatorLogger.error(
          "xcrun simctl command timed out - this usually means Xcode/simctl is having issues",
          error
        );
        throw new Error(
          "Failed to list simulators: Command timed out. Try running 'xcrun simctl list' manually to check if it's working."
        );
      }

      this.simulatorLogger.error("Failed to list simulators", error);
      throw new Error(
        `Failed to list simulators: ${errorMessage}. Make sure Xcode command line tools are installed.`
      );
    }
  }

  async listBootedSimulators(): Promise<SimulatorInfo[]> {
    const allSimulators = await this.listAvailableSimulators();
    const bootedSimulators = allSimulators.filter(
      (sim) => sim.state === "Booted"
    );

    // Auto-connect to any booted simulators that aren't connected to IDB yet
    for (const simulator of bootedSimulators) {
      try {
        await this.ensureIDBConnection(simulator.udid);
      } catch (error) {
        this.simulatorLogger.warning(
          `Failed to connect to simulator ${simulator.udid}`,
          error
        );
      }
    }

    return bootedSimulators;
  }

  async bootSimulatorByUDID(udid: string): Promise<void> {
    this.simulatorLogger.info(`Booting simulator: ${udid}`);

    try {
      const simulatorInfo = await this.getSimulatorInfo(udid);
      if (!simulatorInfo) {
        throw new Error(`Simulator not found: ${udid}`);
      }

      if (simulatorInfo.state === "Booted") {
        this.simulatorLogger.info(`Simulator ${udid} is already booted`);
        return;
      }

      // Boot the simulator using direct xcrun command
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);

      // Check if headless mode is enabled
      if (headlessManager.isHeadlessEnabled()) {
        this.simulatorLogger.info(
          `Booting simulator in headless mode: ${udid}`
        );

        // Set environment variables to prevent GUI and boot headlessly
        const env = {
          ...process.env,
          SIMULATOR_HEADLESS: "1",
          IOS_SIMULATOR_HEADLESS: "1",
        };

        await execAsync(`xcrun simctl boot ${udid}`, { env, timeout: 30000 });
      } else {
        this.simulatorLogger.info(`Booting simulator with GUI: ${udid}`);
        await execAsync(`xcrun simctl boot ${udid}`, { timeout: 30000 });
      }

      // Wait for boot to complete
      await this.waitForSimulatorState(
        udid,
        "Booted",
        this.simulatorConfig.timeout
      );

      // Connect to IDB
      await idb.connectToTarget(udid);

      this.simulatorLogger.info(`Successfully booted simulator: ${udid}`);
    } catch (error) {
      this.simulatorLogger.error(`Failed to boot simulator: ${udid}`, error);
      throw error;
    }
  }

  async shutdownSimulatorByUDID(udid: string): Promise<void> {
    this.simulatorLogger.info(`Shutting down simulator: ${udid}`);

    try {
      // Disconnect from IDB first
      await idb.disconnectFromTarget(udid);

      // Shutdown the simulator using direct xcrun command
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);

      await execAsync(`xcrun simctl shutdown ${udid}`, { timeout: 30000 });

      // Wait for shutdown to complete
      await this.waitForSimulatorState(
        udid,
        "Shutdown",
        this.simulatorConfig.timeout
      );

      this.simulatorLogger.info(`Successfully shut down simulator: ${udid}`);
    } catch (error) {
      this.simulatorLogger.error(
        `Failed to shutdown simulator: ${udid}`,
        error
      );
      throw error;
    }
  }

  async getCurrentSimulator(): Promise<SimulatorInfo | null> {
    const bootedSimulators = await this.listBootedSimulators();
    const currentSimulator =
      bootedSimulators.length > 0 ? bootedSimulators[0]! : null;

    // Ensure IDB connection for the current simulator
    if (currentSimulator) {
      await this.ensureIDBConnection(currentSimulator.udid);
    }

    return currentSimulator;
  }

  async getSimulatorInfo(udid: string): Promise<SimulatorInfo | null> {
    const simulators = await this.listAvailableSimulators();
    return simulators.find((sim) => sim.udid === udid) || null;
  }

  getSimulatorSession(sessionId: string): SimulatorSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  getAllSessions(): SimulatorSession[] {
    return Array.from(this.activeSessions.values());
  }

  async focusSimulator(udid?: string): Promise<void> {
    const targetUdid = udid || (await this.getCurrentSimulator())?.udid;
    if (!targetUdid) {
      throw new Error("No simulator to focus");
    }

    // Skip focus in headless mode since there's no GUI to focus
    if (headlessManager.isHeadlessEnabled()) {
      this.simulatorLogger.info(
        `Skipping simulator focus in headless mode: ${targetUdid}`
      );
      return;
    }

    this.simulatorLogger.info(`Focusing simulator: ${targetUdid}`);

    try {
      // Use AppleScript to bring simulator to front
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);

      await execAsync(
        `osascript -e 'tell application "Simulator" to activate'`,
        { timeout: 5000 }
      );
      this.simulatorLogger.info(`Focused simulator: ${targetUdid}`);
    } catch (error) {
      this.simulatorLogger.error(
        `Failed to focus simulator: ${targetUdid}`,
        error
      );
      throw error;
    }
  }

  // Face ID / Touch ID Simulation Methods
  async simulateMatchingFaceId(
    udid?: string
  ): Promise<{ success: boolean; message: string }> {
    const targetUdid = udid || (await this.getCurrentSimulator())?.udid;
    this.simulatorLogger.info(
      `Simulating matching Face ID for simulator: ${targetUdid}`
    );

    return simulateMatchingFace();
  }

  async simulateNonMatchingFaceId(
    udid?: string
  ): Promise<{ success: boolean; message: string }> {
    const targetUdid = udid || (await this.getCurrentSimulator())?.udid;
    this.simulatorLogger.info(
      `Simulating non-matching Face ID for simulator: ${targetUdid}`
    );

    return simulateNonMatchingFace();
  }

  async simulateMatchingTouchId(
    udid?: string
  ): Promise<{ success: boolean; message: string }> {
    const targetUdid = udid || (await this.getCurrentSimulator())?.udid;
    this.simulatorLogger.info(
      `Simulating matching Touch ID for simulator: ${targetUdid}`
    );

    return simulateMatchingTouchId();
  }

  async simulateNonMatchingTouchId(
    udid?: string
  ): Promise<{ success: boolean; message: string }> {
    const targetUdid = udid || (await this.getCurrentSimulator())?.udid;
    this.simulatorLogger.info(
      `Simulating non-matching Touch ID for simulator: ${targetUdid}`
    );

    return simulateNonMatchingTouchId();
  }

  private async ensureIDBConnection(udid: string): Promise<void> {
    try {
      // Always try to connect since IDB connection status can be unreliable
      // and connecting to an already-connected simulator is safe
      this.simulatorLogger.debug(
        `Ensuring IDB connection to simulator: ${udid}`
      );
      await idb.connectToTarget(udid);
      this.simulatorLogger.debug(
        `IDB connection ensured for simulator: ${udid}`
      );
    } catch (error) {
      this.simulatorLogger.warning(
        `Could not ensure IDB connection for ${udid}`,
        error
      );
      // Don't throw - this is a best-effort connection
    }
  }

  private async waitForSimulatorState(
    udid: string,
    expectedState: string,
    timeoutMs: number
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const info = await this.getSimulatorInfo(udid);
      if (info?.state === expectedState) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error(
      `Timeout waiting for simulator ${udid} to reach state: ${expectedState}`
    );
  }
}
