import { MCPPromptDefinition, MCPPromptResult } from "../types/mcp";
import { logger } from "../utils/logger";
import { SimulatorManager } from "../managers/SimulatorManager";

const promptLogger = logger.createChildLogger("SimulatorPrompts");

export interface SimulatorPromptHandler {
  (args: Record<string, string>): Promise<MCPPromptResult>;
}

export interface RegisteredPrompt extends MCPPromptDefinition {
  handler: SimulatorPromptHandler;
}

export function createSimulatorPrompts(
  simulatorManager: SimulatorManager
): RegisteredPrompt[] {
  return [
    {
      name: "start_simulator_test",
      description: "Best practices workflow for starting simulator testing",
      arguments: [
        {
          name: "app_name",
          description: "Name of the app you want to test (optional)",
          required: false,
        },
        {
          name: "device_type",
          description: "Preferred device type (e.g., iPhone 15 Pro)",
          required: false,
        },
      ],
      handler: async (args) => {
        promptLogger.info("Generating start_simulator_test prompt", args);

        const deviceType = args.device_type || "iPhone 15 Pro";
        const appName = args.app_name || "your app";

        return {
          description: "Guided workflow for starting simulator testing",
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `I want to start testing ${appName} on an iOS simulator.`,
              },
            },
            {
              role: "assistant",
              content: {
                type: "text",
                text:
                  `I'll help you start testing ${appName} on an iOS simulator. Let me guide you through the best practices:\n\n` +
                  `1. First, I'll check if any simulators are already running\n` +
                  `2. Then, I'll either use an existing simulator or create a new one\n` +
                  `3. Finally, I'll help you launch ${appName}\n\n` +
                  `**Important**: For navigation, I'll use accessibility tools instead of screenshots since they provide accurate, parseable information about UI elements.\n\n` +
                  `Let's start by checking for running simulators...`,
              },
            },
            {
              role: "user",
              content: {
                type: "text",
                text: `Please check for running simulators, then proceed with testing ${appName} on ${deviceType}. Use get_accessibility_elements to understand the UI layout instead of relying on screenshots.`,
              },
            },
          ],
        };
      },
    },
    {
      name: "test_ui_flow",
      description: "Guided workflow for testing a UI flow in your app",
      arguments: [
        {
          name: "flow_description",
          description: "Description of the UI flow to test",
          required: true,
        },
      ],
      handler: async (args) => {
        promptLogger.info("Generating test_ui_flow prompt", args);

        return {
          description: "Guided workflow for UI testing",
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `I want to test the following UI flow: ${args.flow_description}`,
              },
            },
            {
              role: "assistant",
              content: {
                type: "text",
                text:
                  `I'll help you test that UI flow. Here's my approach:\n\n` +
                  `1. **Pre-check**: First, I'll verify we have a simulator running\n` +
                  `2. **UI Discovery**: I'll use accessibility tools to understand the current screen\n` +
                  `3. **Navigation**: I'll help you navigate through the flow using element coordinates\n` +
                  `4. **Validation**: I'll verify each step using accessibility information\n\n` +
                  `**Key Tools I'll Use**:\n` +
                  `- \`get_accessibility_elements\` - to see all UI elements on screen\n` +
                  `- \`inspect_element\` - to get details about specific elements\n` +
                  `- \`tap_coordinates\` - to interact with elements\n` +
                  `- \`input_text\` - to enter text in fields\n\n` +
                  `Screenshots will only be used for documentation, not navigation.\n\n` +
                  `Let me start by checking the simulator status...`,
              },
            },
            {
              role: "user",
              content: {
                type: "text",
                text: `Check for running simulators, ensure the app is running, then use get_accessibility_elements to understand the current screen layout. Navigate through: ${args.flow_description}`,
              },
            },
          ],
        };
      },
    },
    {
      name: "debug_simulator_issue",
      description: "Troubleshooting guide for common simulator issues",
      arguments: [
        {
          name: "issue_description",
          description: "Description of the issue you're facing",
          required: true,
        },
      ],
      handler: async (args) => {
        promptLogger.info("Generating debug_simulator_issue prompt", args);

        return {
          description: "Simulator troubleshooting guide",
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `I'm having this issue with the simulator: ${args.issue_description}`,
              },
            },
            {
              role: "assistant",
              content: {
                type: "text",
                text:
                  `I'll help you troubleshoot that simulator issue. Let me run through a systematic check:\n\n` +
                  `1. **Health Check**: First, I'll verify the MCP server is working\n` +
                  `2. **Simulator Status**: Check what simulators are available and running\n` +
                  `3. **UI Analysis**: Use accessibility tools to understand the current state\n` +
                  `4. **Diagnostics**: Gather relevant information\n` +
                  `5. **Solution**: Apply fixes based on what we find\n\n` +
                  `I'll primarily use accessibility tools to understand what's happening on screen, as they provide more reliable information than visual analysis.\n\n` +
                  `Starting with a health check...`,
              },
            },
            {
              role: "user",
              content: {
                type: "text",
                text: `Run health check, list available and running simulators, then use get_accessibility_elements to understand the current UI state. Help diagnose: ${args.issue_description}`,
              },
            },
          ],
        };
      },
    },
    {
      name: "setup_test_environment",
      description: "Complete setup guide for simulator testing environment",
      handler: async () => {
        promptLogger.info("Generating setup_test_environment prompt");

        // Check current simulator status
        let simulatorHint = "";
        try {
          const booted = await simulatorManager.listBootedSimulators();
          if (booted.length > 0) {
            simulatorHint = `\n\nI can see you already have ${booted.length} simulator(s) running. We can use one of those!`;
          }
        } catch (error) {
          // Ignore errors here, just for hint
        }

        return {
          description: "Complete environment setup guide",
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: "I need help setting up my simulator testing environment.",
              },
            },
            {
              role: "assistant",
              content: {
                type: "text",
                text:
                  `I'll guide you through setting up a complete simulator testing environment. Here's what we'll do:\n\n` +
                  `**Pre-flight Checks:**\n` +
                  `1. Verify MCP server health\n` +
                  `2. Check for existing simulators\n` +
                  `3. Ensure screenshot/video paths are configured\n\n` +
                  `**Simulator Setup:**\n` +
                  `4. Create or select appropriate simulator\n` +
                  `5. Boot the simulator\n` +
                  `6. Install your app (if needed)\n\n` +
                  `**Testing Preparation:**\n` +
                  `7. Verify accessibility tools are working\n` +
                  `8. Test UI element detection\n` +
                  `9. Confirm navigation capabilities${simulatorHint}\n\n` +
                  `**Important**: We'll use accessibility-based navigation tools:\n` +
                  `- \`get_accessibility_elements\` for UI discovery\n` +
                  `- \`inspect_element\` for element details\n` +
                  `- Screenshots are only for documentation\n\n` +
                  `Let's begin with the health check...`,
              },
            },
            {
              role: "user",
              content: {
                type: "text",
                text:
                  "Run health check, list available simulators, check for running simulators, " +
                  "then either use an existing one or create a new iPhone 15 Pro simulator. " +
                  "Once ready, test get_accessibility_elements to ensure UI navigation is working.",
              },
            },
          ],
        };
      },
    },
    {
      name: "navigate_with_accessibility",
      description: "Guide for navigating apps using accessibility tools",
      arguments: [
        {
          name: "target_screen",
          description: "The screen or feature you want to navigate to",
          required: true,
        },
      ],
      handler: async (args) => {
        promptLogger.info(
          "Generating navigate_with_accessibility prompt",
          args
        );

        return {
          description: "Accessibility-based navigation guide",
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `I need to navigate to: ${args.target_screen}`,
              },
            },
            {
              role: "assistant",
              content: {
                type: "text",
                text:
                  `I'll help you navigate to ${args.target_screen} using accessibility tools. Here's the approach:\n\n` +
                  `**Step 1: Understand Current Screen**\n` +
                  `- Use \`get_accessibility_elements\` to see all UI elements\n` +
                  `- Look for buttons, labels, and interactive elements\n\n` +
                  `**Step 2: Find Navigation Elements**\n` +
                  `- Search for elements with labels matching "${args.target_screen}"\n` +
                  `- Check for navigation bars, tab bars, or menu buttons\n` +
                  `- Use \`inspect_element\` for detailed information\n\n` +
                  `**Step 3: Interact with Elements**\n` +
                  `- Use \`tap_coordinates\` with the x,y from accessibility data\n` +
                  `- For text fields, use \`input_text\` after tapping\n` +
                  `- Use \`scroll_gesture\` if elements are off-screen\n\n` +
                  `**Why Accessibility Tools?**\n` +
                  `- Provides exact element coordinates and labels\n` +
                  `- Works reliably without visual parsing\n` +
                  `- Gives you actionable data for automation\n\n` +
                  `Let's start by examining the current screen...`,
              },
            },
            {
              role: "user",
              content: {
                type: "text",
                text: `Use get_accessibility_elements to understand the current screen, then navigate to: ${args.target_screen}. Look for matching labels or related UI elements.`,
              },
            },
          ],
        };
      },
    },
  ];
}
