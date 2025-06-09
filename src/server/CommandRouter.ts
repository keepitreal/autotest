import { MCPToolResult } from "../types/mcp";
import { logger } from "../utils/logger";
import { ToolRegistry } from "./ToolRegistry";

export class CommandRouter {
  private routerLogger = logger.createChildLogger("CommandRouter");
  private toolRegistry: ToolRegistry;

  constructor(toolRegistry: ToolRegistry) {
    this.toolRegistry = toolRegistry;
    this.routerLogger.debug("Command router initialized");
  }

  async executeCommand(toolName: string, args: any): Promise<MCPToolResult> {
    this.routerLogger.debug(`Routing command: ${toolName}`, { args });

    try {
      const tool = this.toolRegistry.getTool(toolName);
      if (!tool) {
        throw new Error(`Tool not found: ${toolName}`);
      }

      this.routerLogger.info(`Executing tool: ${toolName} (${tool.category})`);

      // Execute the tool handler
      const result = await tool.handler(args);

      // Convert result to MCPToolResult format
      const mcpResult: MCPToolResult = this.formatResult(result);

      this.routerLogger.debug(`Tool ${toolName} completed successfully`);
      return mcpResult;
    } catch (error) {
      this.routerLogger.error(`Tool execution failed: ${toolName}`, error);

      return {
        content: [
          {
            type: "text",
            text: `Error executing ${toolName}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
        isError: true,
      };
    }
  }

  private formatResult(result: any): MCPToolResult {
    // If result is already in the correct format, return it
    if (result && Array.isArray(result.content)) {
      return result as MCPToolResult;
    }

    // If result is a string, wrap it in text content
    if (typeof result === "string") {
      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    }

    // If result has a message property, use that
    if (result && typeof result.message === "string") {
      return {
        content: [
          {
            type: "text",
            text: result.message,
          },
        ],
      };
    }

    // If result is an object, stringify it
    if (typeof result === "object" && result !== null) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    // Fallback: convert to string
    return {
      content: [
        {
          type: "text",
          text: String(result),
        },
      ],
    };
  }

  getAvailableCommands(): string[] {
    return this.toolRegistry.getAllTools().map((tool) => tool.name);
  }

  getCommandsByCategory(category: string): string[] {
    return this.toolRegistry
      .getToolsByCategory(category)
      .map((tool) => tool.name);
  }

  hasCommand(toolName: string): boolean {
    return this.toolRegistry.hasTool(toolName);
  }
}
