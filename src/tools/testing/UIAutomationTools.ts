import { RegisteredTool } from "../../server/ToolRegistry";
import { idb } from "../../utils/idb";
import { logger } from "../../utils/logger";
import { SimulatorManager } from "../../managers/SimulatorManager";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

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
          duration: {
            type: "number",
            description: "Tap duration in seconds (optional, for long press)",
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

          // Perform tap using IDB with optional duration
          await idb.tap(udid, args.x, args.y, args.duration);

          const tapType = args.duration
            ? `long press (${args.duration}s)`
            : "tap";
          return {
            content: [
              {
                type: "text",
                text:
                  `👆 ${tapType} performed successfully at coordinates (${args.x}, ${args.y})\n\n` +
                  `The gesture has been sent to the simulator.`,
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
            description:
              "Path to save video file (optional, will generate filename)",
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

          // Generate output path if not provided
          let outputPath = args.outputPath;
          if (!outputPath) {
            const timestamp = Date.now();
            const userHome =
              process.env.HOME || process.env.USERPROFILE || "/tmp";
            const artifactsDir = `${userHome}/tmp/rn-simulator-testing`;

            // Ensure the directory exists
            try {
              await execAsync(`mkdir -p "${artifactsDir}"`);
            } catch (error) {
              uiLogger.warning(
                "Failed to create user temp artifacts directory",
                error
              );
            }

            outputPath = `${artifactsDir}/recording-${timestamp}.mp4`;
          }

          // Start video recording using IDB
          const recordingProcess = await idb.recordVideo(
            udid,
            outputPath,
            args.duration
          );

          return {
            content: [
              {
                type: "text",
                text:
                  `🎥 Video recording started!\n\n` +
                  `Recording to: ${outputPath}\n` +
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

    {
      name: "long_press_coordinates",
      description: "Long press at specific screen coordinates",
      category: "ui-automation",
      inputSchema: {
        type: "object",
        properties: {
          x: {
            type: "number",
            description: "X coordinate to long press",
          },
          y: {
            type: "number",
            description: "Y coordinate to long press",
          },
          duration: {
            type: "number",
            description: "Long press duration in seconds (default: 2.0)",
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
        uiLogger.info("Long pressing coordinates", args);

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

          // Perform long press using IDB
          await idb.longPress(udid, args.x, args.y, args.duration);

          return {
            content: [
              {
                type: "text",
                text:
                  `👆 Long press performed successfully at coordinates (${args.x}, ${args.y})\n\n` +
                  `Duration: ${args.duration || 2.0} seconds\n\n` +
                  `The long press gesture has been sent to the simulator.`,
              },
            ],
          };
        } catch (error) {
          uiLogger.error("Failed to long press coordinates", error);
          return {
            content: [
              {
                type: "text",
                text: `❌ Failed to long press at coordinates: ${
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
      name: "press_hardware_button",
      description:
        "Press hardware buttons (Home, Lock, Side Button, Siri, Apple Pay)",
      category: "ui-automation",
      inputSchema: {
        type: "object",
        properties: {
          button: {
            type: "string",
            enum: ["APPLE_PAY", "HOME", "LOCK", "SIDE_BUTTON", "SIRI"],
            description: "Hardware button to press",
          },
          duration: {
            type: "number",
            description: "Press duration in seconds (optional, for long press)",
          },
          udid: {
            type: "string",
            description:
              "UDID of the simulator (optional, will use current simulator)",
          },
        },
        required: ["button"],
      },
      handler: async (args: any) => {
        uiLogger.info("Pressing hardware button", args);

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

          // Press hardware button using IDB
          await idb.pressHardwareButton(udid, args.button, args.duration);

          const pressType = args.duration
            ? `long press (${args.duration}s)`
            : "press";
          return {
            content: [
              {
                type: "text",
                text:
                  `📱 Hardware button ${pressType} successful!\n\n` +
                  `Button: ${args.button}\n` +
                  `Duration: ${args.duration || "default"} seconds\n\n` +
                  `The button press has been sent to the simulator.`,
              },
            ],
          };
        } catch (error) {
          uiLogger.error("Failed to press hardware button", error);
          return {
            content: [
              {
                type: "text",
                text: `❌ Failed to press hardware button: ${
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
      name: "press_key_sequence",
      description: "Press a sequence of keys in order",
      category: "ui-automation",
      inputSchema: {
        type: "object",
        properties: {
          keys: {
            type: "array",
            items: { type: "string" },
            description: "Array of key codes to press in sequence",
          },
          udid: {
            type: "string",
            description:
              "UDID of the simulator (optional, will use current simulator)",
          },
        },
        required: ["keys"],
      },
      handler: async (args: any) => {
        uiLogger.info("Pressing key sequence", args);

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

          // Press key sequence using IDB
          await idb.pressKeySequence(udid, args.keys);

          return {
            content: [
              {
                type: "text",
                text:
                  `⌨️ Key sequence pressed successfully!\n\n` +
                  `Keys: [${args.keys.join(", ")}]\n\n` +
                  `The key sequence has been sent to the simulator.`,
              },
            ],
          };
        } catch (error) {
          uiLogger.error("Failed to press key sequence", error);
          return {
            content: [
              {
                type: "text",
                text: `❌ Failed to press key sequence: ${
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
      name: "send_notification",
      description: "Send a push notification to an app",
      category: "testing",
      inputSchema: {
        type: "object",
        properties: {
          bundleId: {
            type: "string",
            description:
              "Bundle ID of the target app (e.g., com.example.myapp)",
          },
          title: {
            type: "string",
            description: "Notification title",
          },
          body: {
            type: "string",
            description: "Notification body text",
          },
          url: {
            type: "string",
            description:
              "Deep link URL (e.g., 'myapp://profile/123' or 'https://myapp.com/profile/123')",
          },
          badge: {
            type: "number",
            description: "Badge count (optional)",
          },
          sound: {
            type: "string",
            description: "Sound name (optional)",
          },
          category: {
            type: "string",
            description: "Notification category for action buttons (optional)",
          },
          userData: {
            type: "object",
            description: "Custom user data for app routing (optional)",
          },
          udid: {
            type: "string",
            description:
              "UDID of the simulator (optional, will use current simulator)",
          },
        },
        required: ["bundleId", "title", "body"],
      },
      handler: async (args: any) => {
        uiLogger.info("Sending notification", args);

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

          // Build notification payload
          const payload: any = {
            aps: {
              alert: {
                title: args.title,
                body: args.body,
              },
            },
          };

          // Add deep link URL if provided
          if (args.url) {
            payload.aps.url = args.url;
          }

          // Add badge if specified
          if (args.badge !== undefined) {
            payload.aps.badge = args.badge;
          }

          // Add sound if specified
          if (args.sound) {
            payload.aps.sound = args.sound;
          }

          // Add category for action buttons if specified
          if (args.category) {
            payload.aps.category = args.category;
          }

          // Add custom user data for app routing
          if (args.userData) {
            Object.assign(payload, args.userData);
          }

          // Send notification using IDB
          await idb.sendNotification(
            udid,
            args.bundleId,
            JSON.stringify(payload)
          );

          let responseText =
            `📱 Notification sent successfully!\n\n` +
            `App: ${args.bundleId}\n` +
            `Title: ${args.title}\n` +
            `Body: ${args.body}\n`;

          if (args.url) {
            responseText += `Deep Link: ${args.url}\n`;
          }

          responseText +=
            `Badge: ${args.badge || "none"}\n` +
            `Sound: ${args.sound || "default"}\n`;

          if (args.category) {
            responseText += `Category: ${args.category}\n`;
          }

          responseText += `\nThe notification has been delivered to the simulator.`;

          if (args.url) {
            responseText += ` Tapping the notification will open the deep link: ${args.url}`;
          }

          return {
            content: [
              {
                type: "text",
                text: responseText,
              },
            ],
          };
        } catch (error) {
          uiLogger.error("Failed to send notification", error);
          return {
            content: [
              {
                type: "text",
                text: `❌ Failed to send notification: ${
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
      name: "set_location",
      description: "Set the simulator's GPS location",
      category: "testing",
      inputSchema: {
        type: "object",
        properties: {
          latitude: {
            type: "number",
            description: "Latitude coordinate",
          },
          longitude: {
            type: "number",
            description: "Longitude coordinate",
          },
          udid: {
            type: "string",
            description:
              "UDID of the simulator (optional, will use current simulator)",
          },
        },
        required: ["latitude", "longitude"],
      },
      handler: async (args: any) => {
        uiLogger.info("Setting location", args);

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

          // Set location using IDB
          await idb.setLocation(udid, args.latitude, args.longitude);

          return {
            content: [
              {
                type: "text",
                text:
                  `📍 Location set successfully!\n\n` +
                  `Latitude: ${args.latitude}\n` +
                  `Longitude: ${args.longitude}\n\n` +
                  `The simulator's GPS location has been updated. Location-based features in apps will now use these coordinates.`,
              },
            ],
          };
        } catch (error) {
          uiLogger.error("Failed to set location", error);
          return {
            content: [
              {
                type: "text",
                text: `❌ Failed to set location: ${
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
