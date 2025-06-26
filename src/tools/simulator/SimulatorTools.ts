import { RegisteredTool } from "../../server/ToolRegistry";
import { SimulatorManager } from "../../managers/SimulatorManager";
import { logger } from "../../utils/logger";
import { headlessManager } from "../../utils/headless";

const simulatorLogger = logger.createChildLogger("SimulatorTools");

export function createSimulatorTools(
  simulatorManager: SimulatorManager
): RegisteredTool[] {
  return [
    {
      name: "mcp_server_healthcheck",
      description: "Check if the MCP server is running and responsive",
      category: "simulator",
      inputSchema: {
        type: "object",
        properties: {},
      },
      handler: async (_args: any) => {
        simulatorLogger.info("Performing MCP server healthcheck");

        try {
          const startTime = Date.now();

          // Basic server health checks
          const serverInfo = {
            status: "healthy",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            memoryUsage: process.memoryUsage(),
            responseTime: Date.now() - startTime,
          };

          // Check if we can access simulator manager with timeout protection
          let simulatorStatus = "unknown";
          let simulatorWarning = "";
          try {
            const bootedSims = await simulatorManager.listBootedSimulators();
            simulatorStatus = `${bootedSims.length} simulators booted`;
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            simulatorStatus = `Error checking simulators`;

            // Provide helpful troubleshooting for common issues
            if (errorMessage.includes("timeout")) {
              simulatorWarning =
                "\n\n⚠️ **Simulator Check Timed Out**\n" +
                "This usually means xcrun/simctl is having issues. Try:\n" +
                "1. Run 'xcrun simctl list' in terminal to check if it works\n" +
                "2. Restart Xcode if it's open\n" +
                "3. Run 'sudo xcode-select --reset' if command line tools are broken";
            } else if (errorMessage.includes("command line tools")) {
              simulatorWarning =
                "\n\n⚠️ **Xcode Command Line Tools Issue**\n" +
                "Install Xcode command line tools with: xcode-select --install";
            }

            simulatorLogger.warning(
              "Healthcheck simulator access failed",
              error
            );
          }

          return {
            content: [
              {
                type: "text",
                text:
                  `✅ MCP Server Health Check - PASSED\n\n` +
                  `🚀 Server Status: ${serverInfo.status}\n` +
                  `📅 Timestamp: ${serverInfo.timestamp}\n` +
                  `⏱️ Uptime: ${Math.floor(serverInfo.uptime)} seconds\n` +
                  `⚡ Response Time: ${serverInfo.responseTime}ms\n` +
                  `📱 Simulators: ${simulatorStatus}\n` +
                  `💻 Platform: ${serverInfo.platform} (${serverInfo.arch})\n` +
                  `🟢 Node.js: ${serverInfo.nodeVersion}\n` +
                  `🧠 Memory: ${Math.round(
                    serverInfo.memoryUsage.heapUsed / 1024 / 1024
                  )}MB used\n\n` +
                  `The MCP server is running and responsive. You can now use other tools!` +
                  simulatorWarning,
              },
            ],
          };
        } catch (error) {
          simulatorLogger.error("MCP server healthcheck failed", error);
          return {
            content: [
              {
                type: "text",
                text:
                  `❌ MCP Server Health Check - FAILED\n\n` +
                  `Error: ${
                    error instanceof Error ? error.message : "Unknown error"
                  }\n\n` +
                  `The server is running but encountered an issue during healthcheck.`,
              },
            ],
            isError: true,
          };
        }
      },
    },
    {
      name: "create_rn_simulator_session",
      description: "Create a new React Native simulator session",
      category: "simulator",
      inputSchema: {
        type: "object",
        properties: {
          deviceType: {
            type: "string",
            enum: [
              "iPhone 15",
              "iPhone 15 Pro",
              "iPhone 15 Plus",
              "iPhone 15 Pro Max",
              "iPad Air",
              "iPad Pro",
            ],
            description: "Type of iOS device to simulate",
          },
          iosVersion: {
            type: "string",
            description: "iOS version (optional, will use latest available)",
          },
          projectPath: {
            type: "string",
            description: "Path to React Native project (optional)",
          },
          bundleId: {
            type: "string",
            description:
              "Bundle ID of the app to launch (optional, uses configured default)",
          },
          autoBoot: {
            type: "boolean",
            description:
              "Whether to automatically boot the simulator (default: true)",
          },
        },
        required: ["deviceType"],
      },
      handler: async (args: any) => {
        simulatorLogger.info("Creating RN simulator session", args);

        try {
          const sessionId = await simulatorManager.createSimulatorSession({
            deviceType: args.deviceType,
            iosVersion: args.iosVersion,
            projectPath: args.projectPath,
            bundleId: args.bundleId,
          });

          const session = simulatorManager.getSimulatorSession(sessionId);

          // Determine if we should auto-boot: explicit parameter overrides config default
          const shouldAutoBoot =
            args.autoBoot !== undefined ? args.autoBoot : true;

          // If auto-boot is requested and simulator is not already active, boot it
          if (shouldAutoBoot && session?.state !== "active") {
            simulatorLogger.info(`Auto-booting simulator: ${session?.udid}`);
            await simulatorManager.bootSimulatorByUDID(session!.udid);
            // Update session state
            session!.state = "active";
          }

          const modeInfo = headlessManager.isHeadlessEnabled()
            ? `🤖 Running in headless mode (${headlessManager.getHeadlessMode()}) - simulators will boot without GUI`
            : `🖥️ Running in GUI mode - simulator windows will be visible`;

          const bootInfo = shouldAutoBoot
            ? session?.state === "active"
              ? "✅ Simulator booted and ready!"
              : "⚠️ Session created but boot may have failed"
            : "ℹ️ Simulator session created but not booted (autoBoot=false)";

          return {
            content: [
              {
                type: "text",
                text:
                  `✅ Created React Native simulator session successfully!\n\n` +
                  `Session ID: ${sessionId}\n` +
                  `Device: ${session?.name}\n` +
                  `UDID: ${session?.udid}\n` +
                  `State: ${session?.state}\n` +
                  `Created: ${session?.createdAt}\n\n` +
                  `${bootInfo}\n\n` +
                  `${modeInfo}\n\n` +
                  `${
                    shouldAutoBoot
                      ? "The simulator should now be open and ready for use. You can install apps, run React Native projects, or perform UI automation."
                      : "Use 'boot_simulator' with the UDID above to start the simulator when ready."
                  }`,
              },
            ],
          };
        } catch (error) {
          simulatorLogger.error("Failed to create simulator session", error);
          return {
            content: [
              {
                type: "text",
                text: `❌ Failed to create simulator session: ${
                  error instanceof Error ? error.message : "Unknown error"
                }`,
              },
            ],
            isError: true,
          };
        }
      },
    },

    {
      name: "boot_simulator",
      description: "Boot an iOS simulator by UDID",
      category: "simulator",
      inputSchema: {
        type: "object",
        properties: {
          udid: {
            type: "string",
            description: "UDID of the simulator to boot",
          },
        },
        required: ["udid"],
      },
      handler: async (args: any) => {
        simulatorLogger.info("Booting simulator", args);

        try {
          await simulatorManager.bootSimulatorByUDID(args.udid);

          const modeInfo = headlessManager.isHeadlessEnabled()
            ? `🤖 Booted in headless mode (${headlessManager.getHeadlessMode()}) - no GUI will appear`
            : `🖥️ Booted with GUI - Simulator app window should be visible`;

          return {
            content: [
              {
                type: "text",
                text:
                  `✅ Successfully booted simulator: ${args.udid}\n\n` +
                  `${modeInfo}\n\n` +
                  `The simulator is now running and ready for use. You can install apps, run React Native projects, or perform UI automation.`,
              },
            ],
          };
        } catch (error) {
          simulatorLogger.error("Failed to boot simulator", error);
          return {
            content: [
              {
                type: "text",
                text: `❌ Failed to boot simulator: ${
                  error instanceof Error ? error.message : "Unknown error"
                }`,
              },
            ],
            isError: true,
          };
        }
      },
    },

    {
      name: "list_available_simulators",
      description: "List all available iOS simulators",
      category: "simulator",
      inputSchema: {
        type: "object",
        properties: {},
      },
      handler: async (_args: any) => {
        simulatorLogger.info("Listing available simulators");

        try {
          const simulators = await simulatorManager.listAvailableSimulators();

          const simulatorList = simulators
            .map(
              (sim) =>
                `• ${sim.name} (${sim.version})\n  UDID: ${sim.udid}\n  State: ${sim.state}\n`
            )
            .join("\n");

          // Add headless mode indication
          const headlessInfo = headlessManager.isHeadlessEnabled()
            ? `\n🤖 **Headless Mode**: ENABLED (${headlessManager.getHeadlessMode()})\n   - Simulators will boot without GUI when started\n   - All interactions will be through IDB/CLI only\n`
            : `\n🖥️ **GUI Mode**: Simulators will open with visual interface\n`;

          return {
            content: [
              {
                type: "text",
                text:
                  `📱 Available iOS Simulators (${simulators.length} found):\n${headlessInfo}\n${simulatorList}\n` +
                  `Use the UDID to boot a specific simulator or create a session.`,
              },
            ],
          };
        } catch (error) {
          simulatorLogger.error("Failed to list simulators", error);
          return {
            content: [
              {
                type: "text",
                text: `❌ Failed to list simulators: ${
                  error instanceof Error ? error.message : "Unknown error"
                }`,
              },
            ],
            isError: true,
          };
        }
      },
    },

    {
      name: "list_booted_simulators",
      description: "List currently running iOS simulators",
      category: "simulator",
      inputSchema: {
        type: "object",
        properties: {},
      },
      handler: async (_args: any) => {
        simulatorLogger.info("Listing booted simulators");

        try {
          const simulators = await simulatorManager.listBootedSimulators();

          if (simulators.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: `📱 No simulators are currently running.\n\nUse 'boot_simulator' to start a simulator first.`,
                },
              ],
            };
          }

          const simulatorList = simulators
            .map(
              (sim) =>
                `• ${sim.name} (${sim.version})\n  UDID: ${sim.udid}\n  State: ${sim.state}\n`
            )
            .join("\n");

          return {
            content: [
              {
                type: "text",
                text: `🟢 Running iOS Simulators (${simulators.length} found):\n\n${simulatorList}`,
              },
            ],
          };
        } catch (error) {
          simulatorLogger.error("Failed to list booted simulators", error);
          return {
            content: [
              {
                type: "text",
                text: `❌ Failed to list booted simulators: ${
                  error instanceof Error ? error.message : "Unknown error"
                }`,
              },
            ],
            isError: true,
          };
        }
      },
    },

    {
      name: "shutdown_simulator",
      description: "Shutdown an iOS simulator by UDID",
      category: "simulator",
      inputSchema: {
        type: "object",
        properties: {
          udid: {
            type: "string",
            description: "UDID of the simulator to shutdown",
          },
        },
        required: ["udid"],
      },
      handler: async (args: any) => {
        simulatorLogger.info("Shutting down simulator", args);

        try {
          await simulatorManager.shutdownSimulatorByUDID(args.udid);

          return {
            content: [
              {
                type: "text",
                text: `✅ Successfully shut down simulator: ${args.udid}\n\nThe simulator has been stopped and is no longer running.`,
              },
            ],
          };
        } catch (error) {
          simulatorLogger.error("Failed to shutdown simulator", error);
          return {
            content: [
              {
                type: "text",
                text: `❌ Failed to shutdown simulator: ${
                  error instanceof Error ? error.message : "Unknown error"
                }`,
              },
            ],
            isError: true,
          };
        }
      },
    },

    {
      name: "focus_simulator",
      description: "Bring simulator window to front",
      category: "simulator",
      inputSchema: {
        type: "object",
        properties: {
          udid: {
            type: "string",
            description:
              "UDID of the simulator to focus (optional, will focus current simulator)",
          },
        },
      },
      handler: async (args: any) => {
        simulatorLogger.info("Focusing simulator", args);

        try {
          await simulatorManager.focusSimulator(args.udid);

          return {
            content: [
              {
                type: "text",
                text: `✅ Simulator window brought to front.\n\nThe Simulator app is now the active window on your screen.`,
              },
            ],
          };
        } catch (error) {
          simulatorLogger.error("Failed to focus simulator", error);
          return {
            content: [
              {
                type: "text",
                text: `❌ Failed to focus simulator: ${
                  error instanceof Error ? error.message : "Unknown error"
                }`,
              },
            ],
            isError: true,
          };
        }
      },
    },
  ];
}
