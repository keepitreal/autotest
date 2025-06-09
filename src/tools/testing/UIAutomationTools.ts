import { RegisteredTool } from "../../server/ToolRegistry";
import { idb } from "../../utils/idb";
import { logger } from "../../utils/logger";
import { SimulatorManager } from "../../managers/SimulatorManager";

const uiLogger = logger.createChildLogger("UIAutomationTools");

export function createUIAutomationTools(
  simulatorManager: SimulatorManager
): RegisteredTool[] {
  return [
    {
      name: "take_screenshot",
      description: "Take a screenshot of the current simulator screen",
      category: "ui-automation",
      inputSchema: {
        type: "object",
        properties: {
          udid: {
            type: "string",
            description:
              "UDID of the simulator (optional, will use current simulator)",
          },
          outputPath: {
            type: "string",
            description:
              "Path to save screenshot (optional, will generate filename)",
          },
        },
      },
      handler: async (args: any) => {
        uiLogger.info("Taking screenshot", args);

        try {
          // Get simulator UDID
          let udid = args.udid;
          if (!udid) {
            const currentSim = await simulatorManager.getCurrentSimulator();
            if (!currentSim) {
              throw new Error(
                "No simulator is currently running. Please boot a simulator first."
              );
            }
            udid = currentSim.udid;
          }

          // Generate filename if not provided
          const outputPath = args.outputPath || `screenshot-${Date.now()}.png`;

          // Take screenshot using IDB
          const screenshotPath = await idb.screenshot(udid, outputPath);

          return {
            content: [
              {
                type: "text",
                text:
                  `📸 Screenshot captured successfully!\n\n` +
                  `Simulator: ${udid}\n` +
                  `Saved to: ${screenshotPath}\n\n` +
                  `The screenshot shows the current state of the simulator screen.`,
              },
            ],
          };
        } catch (error) {
          uiLogger.error("Failed to take screenshot", error);
          return {
            content: [
              {
                type: "text",
                text: `❌ Failed to take screenshot: ${
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
      name: "tap_coordinates",
      description: "Tap at specific screen coordinates",
      category: "ui-automation",
      inputSchema: {
        type: "object",
        properties: {
          x: {
            type: "number",
            description: "X coordinate to tap",
          },
          y: {
            type: "number",
            description: "Y coordinate to tap",
          },
          udid: {
            type: "string",
            description:
              "UDID of the simulator (optional, will use current simulator)",
          },
        },
        required: ["x", "y"],
      },
      handler: async (args: any) => {
        uiLogger.info("Tapping coordinates", args);

        try {
          // Get simulator UDID
          let udid = args.udid;
          if (!udid) {
            const currentSim = await simulatorManager.getCurrentSimulator();
            if (!currentSim) {
              throw new Error(
                "No simulator is currently running. Please boot a simulator first."
              );
            }
            udid = currentSim.udid;
          }

          // Perform tap using IDB
          await idb.tap(udid, args.x, args.y);

          return {
            content: [
              {
                type: "text",
                text:
                  `👆 Tapped successfully at coordinates (${args.x}, ${args.y})\n\n` +
                  `The tap gesture has been sent to the simulator.`,
              },
            ],
          };
        } catch (error) {
          uiLogger.error("Failed to tap coordinates", error);
          return {
            content: [
              {
                type: "text",
                text: `❌ Failed to tap at coordinates: ${
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
      name: "swipe_gesture",
      description: "Perform a swipe gesture between two points",
      category: "ui-automation",
      inputSchema: {
        type: "object",
        properties: {
          fromX: {
            type: "number",
            description: "Starting X coordinate",
          },
          fromY: {
            type: "number",
            description: "Starting Y coordinate",
          },
          toX: {
            type: "number",
            description: "Ending X coordinate",
          },
          toY: {
            type: "number",
            description: "Ending Y coordinate",
          },
          udid: {
            type: "string",
            description:
              "UDID of the simulator (optional, will use current simulator)",
          },
        },
        required: ["fromX", "fromY", "toX", "toY"],
      },
      handler: async (args: any) => {
        uiLogger.info("Performing swipe gesture", args);

        try {
          // Get simulator UDID
          let udid = args.udid;
          if (!udid) {
            const currentSim = await simulatorManager.getCurrentSimulator();
            if (!currentSim) {
              throw new Error(
                "No simulator is currently running. Please boot a simulator first."
              );
            }
            udid = currentSim.udid;
          }

          // Perform swipe using IDB
          await idb.swipe(udid, args.fromX, args.fromY, args.toX, args.toY);

          return {
            content: [
              {
                type: "text",
                text:
                  `👆 Swipe gesture performed successfully!\n\n` +
                  `From: (${args.fromX}, ${args.fromY})\n` +
                  `To: (${args.toX}, ${args.toY})\n\n` +
                  `The swipe gesture has been sent to the simulator.`,
              },
            ],
          };
        } catch (error) {
          uiLogger.error("Failed to perform swipe gesture", error);
          return {
            content: [
              {
                type: "text",
                text: `❌ Failed to perform swipe gesture: ${
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
      name: "inspect_element",
      description: "Inspect UI element at specific coordinates",
      category: "ui-automation",
      inputSchema: {
        type: "object",
        properties: {
          x: {
            type: "number",
            description: "X coordinate to inspect",
          },
          y: {
            type: "number",
            description: "Y coordinate to inspect",
          },
          udid: {
            type: "string",
            description:
              "UDID of the simulator (optional, will use current simulator)",
          },
        },
        required: ["x", "y"],
      },
      handler: async (args: any) => {
        uiLogger.info("Inspecting element at coordinates", args);

        try {
          // Get simulator UDID
          let udid = args.udid;
          if (!udid) {
            const currentSim = await simulatorManager.getCurrentSimulator();
            if (!currentSim) {
              throw new Error(
                "No simulator is currently running. Please boot a simulator first."
              );
            }
            udid = currentSim.udid;
          }

          // Describe element at point using IDB
          const elementInfo = await idb.describePoint(udid, args.x, args.y);

          return {
            content: [
              {
                type: "text",
                text:
                  `🔍 Element inspection at (${args.x}, ${args.y}):\n\n` +
                  `${elementInfo}\n\n` +
                  `This shows the accessibility information for the UI element at the specified coordinates.`,
              },
            ],
          };
        } catch (error) {
          uiLogger.error("Failed to inspect element", error);
          return {
            content: [
              {
                type: "text",
                text: `❌ Failed to inspect element: ${
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
      name: "get_accessibility_elements",
      description: "Get all accessibility elements on the current screen",
      category: "ui-automation",
      inputSchema: {
        type: "object",
        properties: {
          udid: {
            type: "string",
            description:
              "UDID of the simulator (optional, will use current simulator)",
          },
        },
      },
      handler: async (args: any) => {
        uiLogger.info("Getting accessibility elements", args);

        try {
          // Get simulator UDID
          let udid = args.udid;
          if (!udid) {
            const currentSim = await simulatorManager.getCurrentSimulator();
            if (!currentSim) {
              throw new Error(
                "No simulator is currently running. Please boot a simulator first."
              );
            }
            udid = currentSim.udid;
          }

          // Get all accessibility elements using IDB
          const elementsInfo = await idb.describeElements(udid);

          return {
            content: [
              {
                type: "text",
                text:
                  `🔍 Accessibility Elements on Screen:\n\n` +
                  `${elementsInfo}\n\n` +
                  `This shows all interactive elements that are accessible for automation and testing.`,
              },
            ],
          };
        } catch (error) {
          uiLogger.error("Failed to get accessibility elements", error);
          return {
            content: [
              {
                type: "text",
                text: `❌ Failed to get accessibility elements: ${
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
      name: "record_video",
      description: "Start recording video of the simulator screen",
      category: "ui-automation",
      inputSchema: {
        type: "object",
        properties: {
          outputPath: {
            type: "string",
            description: "Path to save video file",
          },
          duration: {
            type: "number",
            description: "Recording duration in seconds (optional)",
          },
          udid: {
            type: "string",
            description:
              "UDID of the simulator (optional, will use current simulator)",
          },
        },
        required: ["outputPath"],
      },
      handler: async (args: any) => {
        uiLogger.info("Starting video recording", args);

        try {
          // Get simulator UDID
          let udid = args.udid;
          if (!udid) {
            const currentSim = await simulatorManager.getCurrentSimulator();
            if (!currentSim) {
              throw new Error(
                "No simulator is currently running. Please boot a simulator first."
              );
            }
            udid = currentSim.udid;
          }

          // Start video recording using IDB
          const recordingProcess = await idb.recordVideo(
            udid,
            args.outputPath,
            args.duration
          );

          return {
            content: [
              {
                type: "text",
                text:
                  `🎥 Video recording started!\n\n` +
                  `Recording to: ${args.outputPath}\n` +
                  `Duration: ${
                    args.duration ? `${args.duration} seconds` : "Until stopped"
                  }\n` +
                  `Process ID: ${recordingProcess.pid}\n\n` +
                  `The recording will capture all screen activity on the simulator.`,
              },
            ],
          };
        } catch (error) {
          uiLogger.error("Failed to start video recording", error);
          return {
            content: [
              {
                type: "text",
                text: `❌ Failed to start video recording: ${
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
