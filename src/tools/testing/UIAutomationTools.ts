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
      name: "input_text",
      description: "Input text into the currently focused text field",
      category: "ui-automation",
      inputSchema: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "Text to input into the focused field",
          },
          udid: {
            type: "string",
            description:
              "UDID of the simulator (optional, will use current simulator)",
          },
        },
        required: ["text"],
      },
      handler: async (args: any) => {
        uiLogger.info("Inputting text", { textLength: args.text.length });

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

          // Input text using IDB
          await idb.inputText(udid, args.text);

          return {
            content: [
              {
                type: "text",
                text:
                  `⌨️ Text input successful!\n\n` +
                  `Entered: "${args.text}"\n` +
                  `Length: ${args.text.length} characters\n\n` +
                  `The text has been sent to the currently focused input field in the simulator.`,
              },
            ],
          };
        } catch (error) {
          uiLogger.error("Failed to input text", error);
          return {
            content: [
              {
                type: "text",
                text: `❌ Failed to input text: ${
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
      name: "press_key",
      description: "Press a specific key (useful for Enter, Backspace, etc.)",
      category: "ui-automation",
      inputSchema: {
        type: "object",
        properties: {
          key: {
            type: "string",
            description:
              "Key to press (e.g., 'enter', 'backspace', 'escape', key codes, etc.)",
          },
          duration: {
            type: "number",
            description: "How long to hold the key in seconds (optional)",
          },
          udid: {
            type: "string",
            description:
              "UDID of the simulator (optional, will use current simulator)",
          },
        },
        required: ["key"],
      },
      handler: async (args: any) => {
        uiLogger.info("Pressing key", { key: args.key });

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

          // Press key using IDB
          await idb.pressKey(udid, args.key, args.duration);

          return {
            content: [
              {
                type: "text",
                text:
                  `⌨️ Key press successful!\n\n` +
                  `Key: "${args.key}"\n` +
                  `Duration: ${args.duration || "default"} seconds\n\n` +
                  `The key press has been sent to the simulator.`,
              },
            ],
          };
        } catch (error) {
          uiLogger.error("Failed to press key", error);
          return {
            content: [
              {
                type: "text",
                text: `❌ Failed to press key: ${
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
      name: "clear_text_field",
      description: "Clear the currently focused text field",
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
        uiLogger.info("Clearing text field");

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

          // Clear text using IDB
          await idb.clearText(udid);

          return {
            content: [
              {
                type: "text",
                text:
                  `🗑️ Text field cleared successfully!\n\n` +
                  `The currently focused text field has been cleared.`,
              },
            ],
          };
        } catch (error) {
          uiLogger.error("Failed to clear text field", error);
          return {
            content: [
              {
                type: "text",
                text: `❌ Failed to clear text field: ${
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
          duration: {
            type: "number",
            description:
              "Swipe duration in seconds (optional, default is natural speed)",
          },
          delta: {
            type: "number",
            description:
              "Delta in pixels between touch points (optional, smaller = smoother)",
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

          // Perform swipe using IDB with optional duration and delta
          await idb.swipe(
            udid,
            args.fromX,
            args.fromY,
            args.toX,
            args.toY,
            args.duration,
            args.delta
          );

          return {
            content: [
              {
                type: "text",
                text:
                  `👆 Swipe gesture performed successfully!\n\n` +
                  `From: (${args.fromX}, ${args.fromY})\n` +
                  `To: (${args.toX}, ${args.toY})\n` +
                  `Duration: ${args.duration || "default"} seconds\n` +
                  `Delta: ${args.delta || "default"} pixels\n\n` +
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
      name: "scroll_gesture",
      description:
        "Perform a scroll gesture in a specific direction from a starting point",
      category: "ui-automation",
      inputSchema: {
        type: "object",
        properties: {
          x: {
            type: "number",
            description:
              "X coordinate to start scroll from (typically center of scrollable area)",
          },
          y: {
            type: "number",
            description:
              "Y coordinate to start scroll from (typically center of scrollable area)",
          },
          direction: {
            type: "string",
            enum: ["up", "down", "left", "right"],
            description: "Direction to scroll",
          },
          distance: {
            type: "number",
            description:
              "Distance to scroll in pixels (optional, default is 200)",
          },
          duration: {
            type: "number",
            description:
              "Scroll duration in seconds (optional, default is 0.5 for natural feel)",
          },
          udid: {
            type: "string",
            description:
              "UDID of the simulator (optional, will use current simulator)",
          },
        },
        required: ["x", "y", "direction"],
      },
      handler: async (args: any) => {
        uiLogger.info("Performing scroll gesture", args);

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

          // Perform scroll using IDB
          await idb.scroll(
            udid,
            args.x,
            args.y,
            args.direction,
            args.distance,
            args.duration
          );

          return {
            content: [
              {
                type: "text",
                text:
                  `📜 Scroll gesture performed successfully!\n\n` +
                  `Starting point: (${args.x}, ${args.y})\n` +
                  `Direction: ${args.direction}\n` +
                  `Distance: ${args.distance || 200} pixels\n` +
                  `Duration: ${args.duration || 0.5} seconds\n\n` +
                  `The scroll gesture has been sent to the simulator with optimized parameters for smooth scrolling.`,
              },
            ],
          };
        } catch (error) {
          uiLogger.error("Failed to perform scroll gesture", error);
          return {
            content: [
              {
                type: "text",
                text: `❌ Failed to perform scroll gesture: ${
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
