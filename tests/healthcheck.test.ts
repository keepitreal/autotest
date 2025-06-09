import { createSimulatorTools } from "../src/tools/simulator/SimulatorTools";
import { SimulatorManager } from "../src/managers/SimulatorManager";

describe("Healthcheck Tool", () => {
  let simulatorManager: SimulatorManager;
  let tools: any[];

  beforeEach(() => {
    simulatorManager = new SimulatorManager();
    tools = createSimulatorTools(simulatorManager);
  });

  test("should create simulator tools including healthcheck", () => {
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);

    const healthcheckTool = tools.find(
      (tool) => tool.name === "mcp_server_healthcheck"
    );
    expect(healthcheckTool).toBeDefined();
    expect(healthcheckTool.name).toBe("mcp_server_healthcheck");
    expect(healthcheckTool.description).toContain(
      "Check if the MCP server is running"
    );
    expect(healthcheckTool.category).toBe("simulator");
    expect(typeof healthcheckTool.handler).toBe("function");
  });

  test("should execute healthcheck tool successfully", async () => {
    const healthcheckTool = tools.find(
      (tool) => tool.name === "mcp_server_healthcheck"
    );
    expect(healthcheckTool).toBeDefined();

    const result = await healthcheckTool.handler({});

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content.length).toBeGreaterThan(0);

    const textContent = result.content[0];
    expect(textContent.type).toBe("text");
    expect(textContent.text).toContain("MCP Server Health Check");
    expect(textContent.text).toContain("PASSED");
  });

  test("should return server information in healthcheck", async () => {
    const healthcheckTool = tools.find(
      (tool) => tool.name === "mcp_server_healthcheck"
    );
    const result = await healthcheckTool.handler({});

    const textContent = result.content[0].text;

    // Check for key health information
    expect(textContent).toContain("Server Status: healthy");
    expect(textContent).toContain("Timestamp:");
    expect(textContent).toContain("Uptime:");
    expect(textContent).toContain("Response Time:");
    expect(textContent).toContain("Platform:");
    expect(textContent).toContain("Node.js:");
    expect(textContent).toContain("Memory:");
  });

  test("should include simulator status in healthcheck", async () => {
    const healthcheckTool = tools.find(
      (tool) => tool.name === "mcp_server_healthcheck"
    );
    const result = await healthcheckTool.handler({});

    const textContent = result.content[0].text;

    // Should contain simulator information
    expect(textContent).toContain("Simulators:");
  });
});
