import { MCPServer } from "../src/server/MCPServer";
import { SimulatorManager } from "../src/managers/SimulatorManager";
import { ReactNativeAppManager } from "../src/managers/ReactNativeAppManager";

describe("MCP Server", () => {
  let server: MCPServer;

  beforeEach(() => {
    // Create a fresh server instance for each test
    server = new MCPServer();
  });

  afterEach(async () => {
    // Clean up server if it's running
    if (server.isServerRunning()) {
      await server.stop();
    }
  });

  describe("Server Initialization", () => {
    test("should create server instance", () => {
      expect(server).toBeInstanceOf(MCPServer);
      expect(server.isServerRunning()).toBe(false);
    });

    test("should have tool registry", () => {
      const toolRegistry = server.getToolRegistry();
      expect(toolRegistry).toBeDefined();
    });

    test("should have command router", () => {
      const commandRouter = server.getCommandRouter();
      expect(commandRouter).toBeDefined();
    });
  });

  describe("Tool Registry", () => {
    test("should initialize tools", async () => {
      const toolRegistry = server.getToolRegistry();

      // Mock managers
      const simulatorManager = new SimulatorManager();
      const reactNativeManager = new ReactNativeAppManager();

      await toolRegistry.initializeTools(simulatorManager, reactNativeManager);

      const toolCount = toolRegistry.getToolCount();
      expect(toolCount).toBeGreaterThan(0);

      // Check if we have our key tools
      expect(toolRegistry.hasTool("mcp_server_healthcheck")).toBe(true);
      expect(toolRegistry.hasTool("create_rn_simulator_session")).toBe(true);
      expect(toolRegistry.hasTool("list_available_simulators")).toBe(true);
    });

    test("should list all available tools", async () => {
      const toolRegistry = server.getToolRegistry();

      const simulatorManager = new SimulatorManager();
      const reactNativeManager = new ReactNativeAppManager();

      await toolRegistry.initializeTools(simulatorManager, reactNativeManager);

      const tools = toolRegistry.getAllTools();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);

      // Each tool should have required properties
      tools.forEach((tool) => {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(tool.handler).toBeDefined();
        expect(tool.category).toBeDefined();
      });
    });
  });
});
