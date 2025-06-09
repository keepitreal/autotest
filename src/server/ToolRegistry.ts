import { MCPToolDefinition } from "../types/mcp";
import { logger } from "../utils/logger";

export interface ToolHandler {
  (args: any): Promise<any>;
}

export interface RegisteredTool extends MCPToolDefinition {
  handler: ToolHandler;
  category: string;
}

export class ToolRegistry {
  private tools = new Map<string, RegisteredTool>();
  private registryLogger = logger.createChildLogger("ToolRegistry");

  constructor() {
    this.registryLogger.debug("Tool registry initialized");
  }

  registerTool(tool: RegisteredTool): void {
    if (this.tools.has(tool.name)) {
      this.registryLogger.warning(
        `Tool ${tool.name} is already registered, overwriting`
      );
    }

    this.tools.set(tool.name, tool);
    this.registryLogger.debug(
      `Registered tool: ${tool.name} (${tool.category})`
    );
  }

  getTool(name: string): RegisteredTool | undefined {
    return this.tools.get(name);
  }

  getAllTools(): RegisteredTool[] {
    return Array.from(this.tools.values());
  }

  getToolsByCategory(category: string): RegisteredTool[] {
    return Array.from(this.tools.values()).filter(
      (tool) => tool.category === category
    );
  }

  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  unregisterTool(name: string): boolean {
    const success = this.tools.delete(name);
    if (success) {
      this.registryLogger.debug(`Unregistered tool: ${name}`);
    }
    return success;
  }

  getToolCount(): number {
    return this.tools.size;
  }

  getCategories(): string[] {
    const categories = new Set<string>();
    for (const tool of this.tools.values()) {
      categories.add(tool.category);
    }
    return Array.from(categories);
  }

  async initializeTools(
    simulatorManager: any,
    reactNativeManager?: any
  ): Promise<void> {
    this.registryLogger.info("Initializing MCP tools...");

    // Import and register tool modules
    const { createSimulatorTools } = await import(
      "../tools/simulator/SimulatorTools"
    );
    const { createUIAutomationTools } = await import(
      "../tools/testing/UIAutomationTools"
    );
    const { createReactNativeTools } = await import(
      "../tools/reactnative/ReactNativeTools"
    );

    // Register Simulator tools
    const simulatorTools = createSimulatorTools(simulatorManager);
    simulatorTools.forEach((tool) => this.registerTool(tool));

    // Register UI Automation tools
    const uiTools = createUIAutomationTools(simulatorManager);
    uiTools.forEach((tool) => this.registerTool(tool));

    // Register React Native tools if manager is provided
    if (reactNativeManager) {
      const rnTools = createReactNativeTools(
        reactNativeManager,
        simulatorManager
      );
      rnTools.forEach((tool) => this.registerTool(tool));
    }

    this.registryLogger.info(
      `Tool registry initialized with ${this.getToolCount()} tools`
    );
  }

  listTools(): void {
    this.registryLogger.info(`Available tools (${this.getToolCount()}):`);

    const categories = this.getCategories();
    for (const category of categories) {
      const toolsInCategory = this.getToolsByCategory(category);
      this.registryLogger.info(`  ${category}:`);
      for (const tool of toolsInCategory) {
        this.registryLogger.info(`    - ${tool.name}: ${tool.description}`);
      }
    }
  }
}
