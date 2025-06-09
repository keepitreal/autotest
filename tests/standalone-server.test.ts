/**
 * Standalone server test that simulates what Cursor does
 * This bypasses Jest ES module issues by testing the core logic directly
 */

import { ToolRegistry } from "../src/server/ToolRegistry";
import { CommandRouter } from "../src/server/CommandRouter";
import { SimulatorManager } from "../src/managers/SimulatorManager";
import { ReactNativeAppManager } from "../src/managers/ReactNativeAppManager";

describe("Standalone Server Logic", () => {
  let toolRegistry: ToolRegistry;
  let commandRouter: CommandRouter;
  let simulatorManager: SimulatorManager;
  let reactNativeManager: ReactNativeAppManager;

  beforeEach(async () => {
    toolRegistry = new ToolRegistry();
    commandRouter = new CommandRouter(toolRegistry);
    simulatorManager = new SimulatorManager();
    reactNativeManager = new ReactNativeAppManager();

    // Initialize tools
    await toolRegistry.initializeTools(simulatorManager, reactNativeManager);
  });

  test("should simulate full MCP list-tools request", async () => {
    // Simulate what happens when Cursor calls list-tools
    const tools = toolRegistry.getAllTools();

    // This is the format the MCP protocol expects
    const mcpResponse = {
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };

    expect(mcpResponse.tools.length).toBeGreaterThan(0);

    // Verify healthcheck tool is in the response
    const healthcheckTool = mcpResponse.tools.find(
      (tool) => tool.name === "mcp_server_healthcheck"
    );

    expect(healthcheckTool).toBeDefined();
    expect(healthcheckTool!.name).toBe("mcp_server_healthcheck");
    expect(healthcheckTool!.description).toContain(
      "Check if the MCP server is running"
    );

    console.log("✅ MCP list-tools simulation successful");
    console.log(`📊 Found ${mcpResponse.tools.length} tools available`);
  });

  test("should simulate full MCP call-tool request for healthcheck", async () => {
    // Simulate what happens when Cursor calls the healthcheck tool
    const toolName = "mcp_server_healthcheck";
    const args = {};

    // Validate tool exists
    const tool = toolRegistry.getTool(toolName);
    expect(tool).toBeDefined();

    // Execute through command router (this is what MCPServer does)
    const result = await commandRouter.executeCommand(toolName, args);

    // Validate MCP response format
    const mcpResponse = {
      content: result.content,
      isError: result.isError || false,
    };

    expect(mcpResponse.content).toBeDefined();
    expect(Array.isArray(mcpResponse.content)).toBe(true);
    expect(mcpResponse.content.length).toBeGreaterThan(0);
    expect(mcpResponse.isError).toBe(false);

    const textContent = mcpResponse.content[0];
    expect(textContent!.type).toBe("text");
    expect(textContent!.text).toContain("✅ MCP Server Health Check - PASSED");

    console.log("✅ MCP call-tool simulation successful");
    console.log("📝 Response format is valid for MCP protocol");
    console.log("🎯 Healthcheck tool executed successfully");
  });

  test("should validate all tools have correct MCP schema", async () => {
    const tools = toolRegistry.getAllTools();

    for (const tool of tools) {
      // Each tool must have these properties for MCP compatibility
      expect(tool.name).toBeDefined();
      expect(typeof tool.name).toBe("string");
      expect(tool.description).toBeDefined();
      expect(typeof tool.description).toBe("string");
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe("object");
      expect(typeof tool.handler).toBe("function");
    }

    console.log(`✅ All ${tools.length} tools have valid MCP schemas`);
  });

  test("should execute multiple tools successfully", async () => {
    const toolsToTest = [
      "mcp_server_healthcheck",
      "list_available_simulators",
      "list_booted_simulators",
    ];

    for (const toolName of toolsToTest) {
      const result = await commandRouter.executeCommand(toolName, {});

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      console.log(`✅ Tool ${toolName} executed successfully`);
    }
  });
});
