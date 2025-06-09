import { v4 as uuidv4 } from "uuid";
// Temporarily comment out simctl until we resolve API issues
// import simctl from "node-simctl";
import { logger } from "../utils/logger";
import { config } from "../utils/config";
import { idb } from "../utils/idb";
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

      // Auto-boot if configured
      if (this.simulatorConfig.autoBootOnCreate) {
        await this.bootSimulatorByUDID(targetSimulator.udid);
        session.state = "active";
      }

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
        "xcrun simctl list devices available --json"
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
    } catch (error) {
      this.simulatorLogger.error("Failed to list simulators", error);
      // Return mock data for development
      return [
        {
          udid: "mock-iphone-15-pro",
          name: "iPhone 15 Pro",
          state: "Shutdown",
          runtime: "iOS 17.0",
          deviceTypeIdentifier:
            "com.apple.CoreSimulator.SimDeviceType.iPhone-15-Pro",
          platform: "iOS",
          version: "17.0",
        },
      ];
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

      await execAsync(`xcrun simctl boot ${udid}`);

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

      await execAsync(`xcrun simctl shutdown ${udid}`);

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

    this.simulatorLogger.info(`Focusing simulator: ${targetUdid}`);

    try {
      // Use AppleScript to bring simulator to front
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);

      await execAsync(
        `osascript -e 'tell application "Simulator" to activate'`
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

  private async ensureIDBConnection(udid: string): Promise<void> {
    try {
      // Check if IDB is already connected by trying to list targets
      const targets = await idb.listTargets();
      const connectedTarget = targets.find(
        (target) =>
          target.udid === udid &&
          target.type === "simulator" &&
          !target.name.includes("No Companion Connected")
      );

      if (!connectedTarget) {
        this.simulatorLogger.debug(`Connecting IDB to simulator: ${udid}`);
        await idb.connectToTarget(udid);
        this.simulatorLogger.debug(
          `Successfully connected IDB to simulator: ${udid}`
        );
      }
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
