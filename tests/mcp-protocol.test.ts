import { MCPServer } from "../src/server/MCPServer";
import { SimulatorManager } from "../src/managers/SimulatorManager";
import { ReactNativeAppManager } from "../src/managers/ReactNativeAppManager";

// Mock the MCP SDK to test our logic without actual transport
jest.mock("@modelcontextprotocol/sdk/server/index.js", () => ({
  Server: jest.fn().mockImplementation(() => ({
    setRequestHandler: jest.fn(),
    connect: jest.fn(),
    close: jest.fn(),
    notification: jest.fn(),
  })),
}));

describe("MCP Protocol Simulation", () => {
  let server: MCPServer;

  beforeEach(async () => {
    server = new MCPServer();

    // Initialize the tools
    const toolRegistry = server.getToolRegistry();
    const simulatorManager = new SimulatorManager();
    const reactNativeManager = new ReactNativeAppManager();

    await toolRegistry.initializeTools(simulatorManager, reactNativeManager);
  });

  afterEach(async () => {
    if (server.isServerRunning()) {
      await server.stop();
    }
  });

  test("should list available tools", async () => {
    const toolRegistry = server.getToolRegistry();
    const tools = toolRegistry.getAllTools();

    expect(tools.length).toBeGreaterThan(0);

    // Verify healthcheck tool is available
    const healthcheckTool = tools.find(
      (tool) => tool.name === "mcp_server_healthcheck"
    );
    expect(healthcheckTool).toBeDefined();

    // Verify the tool has the correct MCP schema
    expect(healthcheckTool!.inputSchema).toEqual({
      type: "object",
      properties: {},
    });
  });

  test("should execute healthcheck tool through command router", async () => {
    const commandRouter = server.getCommandRouter();

    // Simulate MCP tool call
    const result = await commandRouter.executeCommand(
      "mcp_server_healthcheck",
      {}
    );

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content.length).toBeGreaterThan(0);

    const textContent = result.content[0];
    expect(textContent!.type).toBe("text");
    expect(textContent!.text).toContain("✅ MCP Server Health Check - PASSED");
  });

  test("should handle tool call with proper MCP response format", async () => {
    const commandRouter = server.getCommandRouter();

    const result = await commandRouter.executeCommand(
      "mcp_server_healthcheck",
      {}
    );

    // Verify MCP response format
    expect(result).toHaveProperty("content");
    expect(result.isError).toBeFalsy();

    // Verify content structure
    expect(result.content[0]).toHaveProperty("type", "text");
    expect(result.content[0]).toHaveProperty("text");
    expect(typeof result.content[0]!.text).toBe("string");
  });

  test("should handle invalid tool calls", async () => {
    const commandRouter = server.getCommandRouter();

    await expect(
      commandRouter.executeCommand("nonexistent_tool", {})
    ).rejects.toThrow();
  });

  test("should validate tool arguments", async () => {
    const commandRouter = server.getCommandRouter();

    // Test calling list_available_simulators (which takes no args)
    const result = await commandRouter.executeCommand(
      "list_available_simulators",
      {}
    );

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
  });
});
