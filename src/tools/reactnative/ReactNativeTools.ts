import { RegisteredTool } from "../../server/ToolRegistry";
import { ReactNativeAppManager } from "../../managers/ReactNativeAppManager";
import { SimulatorManager } from "../../managers/SimulatorManager";
import { logger } from "../../utils/logger";

const rnLogger = logger.createChildLogger("ReactNativeTools");

export function createReactNativeTools(
  reactNativeManager: ReactNativeAppManager,
  simulatorManager: SimulatorManager
): RegisteredTool[] {
  return [
    {
      name: "build_and_run_rn_app",
      description: "Build and run a React Native app on iOS simulator",
      category: "react-native",
      inputSchema: {
        type: "object",
        properties: {
          projectPath: {
            type: "string",
            description: "Path to the React Native project directory",
          },
          simulatorUdid: {
            type: "string",
            description:
              "UDID of the simulator (optional, will use current simulator)",
          },
          scheme: {
            type: "string",
            description: "Build scheme (Debug/Release)",
            enum: ["Debug", "Release"],
          },
          resetCache: {
            type: "boolean",
            description: "Reset Metro cache before building",
          },
          verbose: {
            type: "boolean",
            description: "Enable verbose build output",
          },
        },
        required: ["projectPath"],
      },
      handler: async (args: any) => {
        rnLogger.info("Building and running React Native app", args);

        try {
          // Get simulator UDID
          let udid = args.simulatorUdid;
          if (!udid) {
            const currentSim = await simulatorManager.getCurrentSimulator();
            if (!currentSim) {
              throw new Error(
                "No simulator is currently running. Please boot a simulator first."
              );
            }
            udid = currentSim.udid;
          }

          // Build and run the app
          const buildResult = await reactNativeManager.buildAndRunApp(
            args.projectPath,
            udid,
            {
              scheme: args.scheme,
              resetCache: args.resetCache,
              verbose: args.verbose,
            }
          );

          if (buildResult.success) {
            const warningsText =
              buildResult.warnings.length > 0
                ? `\n\n⚠️ Warnings (${
                    buildResult.warnings.length
                  }):\n${buildResult.warnings.slice(0, 5).join("\n")}`
                : "";

            return {
              content: [
                {
                  type: "text",
                  text:
                    `✅ React Native app built and launched successfully!\n\n` +
                    `Project: ${args.projectPath}\n` +
                    `Simulator: ${udid}\n` +
                    `Build Time: ${buildResult.duration}ms\n` +
                    `Build Path: ${buildResult.buildPath}${warningsText}\n\n` +
                    `The app is now running on the iOS simulator.`,
                },
              ],
            };
          } else {
            return {
              content: [
                {
                  type: "text",
                  text:
                    `❌ Failed to build React Native app:\n\n${buildResult.error}\n\n` +
                    `Please check your React Native project configuration and try again.`,
                },
              ],
              isError: true,
            };
          }
        } catch (error) {
          rnLogger.error("Failed to build and run React Native app", error);
          return {
            content: [
              {
                type: "text",
                text: `❌ Failed to build and run React Native app: ${
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
      name: "reload_rn_app",
      description: "Reload a React Native app on the simulator",
      category: "react-native",
      inputSchema: {
        type: "object",
        properties: {
          bundleId: {
            type: "string",
            description: "Bundle ID of the React Native app",
          },
          simulatorUdid: {
            type: "string",
            description:
              "UDID of the simulator (optional, will use current simulator)",
          },
        },
        required: ["bundleId"],
      },
      handler: async (args: any) => {
        rnLogger.info("Reloading React Native app", args);

        try {
          // Get simulator UDID
          let udid = args.simulatorUdid;
          if (!udid) {
            const currentSim = await simulatorManager.getCurrentSimulator();
            if (!currentSim) {
              throw new Error(
                "No simulator is currently running. Please boot a simulator first."
              );
            }
            udid = currentSim.udid;
          }

          // Reload the app
          await reactNativeManager.reloadApp(args.bundleId, udid);

          return {
            content: [
              {
                type: "text",
                text:
                  `✅ React Native app reloaded successfully!\n\n` +
                  `Bundle ID: ${args.bundleId}\n` +
                  `Simulator: ${udid}\n\n` +
                  `The app has been terminated and relaunched with fresh code.`,
              },
            ],
          };
        } catch (error) {
          rnLogger.error("Failed to reload React Native app", error);
          return {
            content: [
              {
                type: "text",
                text: `❌ Failed to reload React Native app: ${
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
      name: "open_rn_dev_menu",
      description: "Open the React Native developer menu",
      category: "react-native",
      inputSchema: {
        type: "object",
        properties: {
          simulatorUdid: {
            type: "string",
            description:
              "UDID of the simulator (optional, will use current simulator)",
          },
        },
      },
      handler: async (args: any) => {
        rnLogger.info("Opening React Native dev menu", args);

        try {
          // Get simulator UDID
          let udid = args.simulatorUdid;
          if (!udid) {
            const currentSim = await simulatorManager.getCurrentSimulator();
            if (!currentSim) {
              throw new Error(
                "No simulator is currently running. Please boot a simulator first."
              );
            }
            udid = currentSim.udid;
          }

          // Open dev menu
          await reactNativeManager.openDevMenu(udid);

          return {
            content: [
              {
                type: "text",
                text:
                  `🛠️ React Native developer menu opened!\n\n` +
                  `The dev menu should now be visible on the simulator. You can use it to:\n\n` +
                  `• Reload the app\n` +
                  `• Enable/disable Fast Refresh\n` +
                  `• Open React DevTools\n` +
                  `• Toggle Performance Monitor\n` +
                  `• Show Inspector\n\n` +
                  `You can also press Cmd+D to open the dev menu at any time.`,
              },
            ],
          };
        } catch (error) {
          rnLogger.error("Failed to open React Native dev menu", error);
          return {
            content: [
              {
                type: "text",
                text: `❌ Failed to open React Native dev menu: ${
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
      name: "enable_fast_refresh",
      description: "Enable Fast Refresh for React Native development",
      category: "react-native",
      inputSchema: {
        type: "object",
        properties: {},
      },
      handler: async (_args: any) => {
        rnLogger.info("Enabling Fast Refresh");

        try {
          await reactNativeManager.enableFastRefresh();

          return {
            content: [
              {
                type: "text",
                text:
                  `⚡ Fast Refresh is enabled!\n\n` +
                  `Fast Refresh is enabled by default in React Native 0.61+ projects. ` +
                  `Your code changes will automatically reload in the simulator when you save files.\n\n` +
                  `Benefits of Fast Refresh:\n` +
                  `• Preserves component state during reload\n` +
                  `• Faster than traditional Hot Reload\n` +
                  `• Better error handling\n` +
                  `• Works with React Hooks`,
              },
            ],
          };
        } catch (error) {
          rnLogger.error("Failed to enable Fast Refresh", error);
          return {
            content: [
              {
                type: "text",
                text: `❌ Failed to enable Fast Refresh: ${
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
      name: "install_rn_app",
      description: "Install a React Native app on the simulator",
      category: "react-native",
      inputSchema: {
        type: "object",
        properties: {
          appPath: {
            type: "string",
            description: "Path to the .app bundle to install",
          },
          simulatorUdid: {
            type: "string",
            description:
              "UDID of the simulator (optional, will use current simulator)",
          },
        },
        required: ["appPath"],
      },
      handler: async (args: any) => {
        rnLogger.info("Installing React Native app", args);

        try {
          // Get simulator UDID
          let udid = args.simulatorUdid;
          if (!udid) {
            const currentSim = await simulatorManager.getCurrentSimulator();
            if (!currentSim) {
              throw new Error(
                "No simulator is currently running. Please boot a simulator first."
              );
            }
            udid = currentSim.udid;
          }

          // Install the app
          await reactNativeManager.installApp(args.appPath, udid);

          return {
            content: [
              {
                type: "text",
                text:
                  `📱 React Native app installed successfully!\n\n` +
                  `App Path: ${args.appPath}\n` +
                  `Simulator: ${udid}\n\n` +
                  `The app is now available on the simulator's home screen.`,
              },
            ],
          };
        } catch (error) {
          rnLogger.error("Failed to install React Native app", error);
          return {
            content: [
              {
                type: "text",
                text: `❌ Failed to install React Native app: ${
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
      name: "launch_rn_app",
      description: "Launch a React Native app on the simulator",
      category: "react-native",
      inputSchema: {
        type: "object",
        properties: {
          bundleId: {
            type: "string",
            description: "Bundle ID of the React Native app to launch",
          },
          simulatorUdid: {
            type: "string",
            description:
              "UDID of the simulator (optional, will use current simulator)",
          },
        },
        required: ["bundleId"],
      },
      handler: async (args: any) => {
        rnLogger.info("Launching React Native app", args);

        try {
          // Get simulator UDID
          let udid = args.simulatorUdid;
          if (!udid) {
            const currentSim = await simulatorManager.getCurrentSimulator();
            if (!currentSim) {
              throw new Error(
                "No simulator is currently running. Please boot a simulator first."
              );
            }
            udid = currentSim.udid;
          }

          // Launch the app
          await reactNativeManager.launchApp(args.bundleId, udid);

          return {
            content: [
              {
                type: "text",
                text:
                  `🚀 React Native app launched successfully!\n\n` +
                  `Bundle ID: ${args.bundleId}\n` +
                  `Simulator: ${udid}\n\n` +
                  `The app is now running on the simulator.`,
              },
            ],
          };
        } catch (error) {
          rnLogger.error("Failed to launch React Native app", error);
          return {
            content: [
              {
                type: "text",
                text: `❌ Failed to launch React Native app: ${
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
