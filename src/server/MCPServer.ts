import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

import { logger } from "../utils/logger";
import { config } from "../utils/config";
// import { MCPToolResult } from "../types/mcp"; // Will be used when implementing tool execution
import { ToolRegistry, RegisteredTool } from "./ToolRegistry";
import { CommandRouter } from "./CommandRouter";
import { SimulatorManager } from "../managers/SimulatorManager";
import { ReactNativeAppManager } from "../managers/ReactNativeAppManager";

export class MCPServer {
  private server: Server;
  private mcpLogger = logger.createChildLogger("MCP-Server");
  private toolRegistry: ToolRegistry;
  private commandRouter: CommandRouter;
  private simulatorManager: SimulatorManager;
  private reactNativeManager: ReactNativeAppManager;
  private isRunning = false;

  constructor() {
    const mcpConfig = config.getMCPConfig();

    this.server = new Server(
      {
        name: mcpConfig.name,
        version: mcpConfig.version,
      },
      {
        capabilities: {
          tools: mcpConfig.capabilities.tools ? {} : undefined,
          resources: mcpConfig.capabilities.resources ? {} : undefined,
          prompts: mcpConfig.capabilities.prompts ? {} : undefined,
          logging: {}, // Enable logging notifications support
        },
      }
    );

    this.toolRegistry = new ToolRegistry();
    this.commandRouter = new CommandRouter(this.toolRegistry);
    this.simulatorManager = new SimulatorManager();
    this.reactNativeManager = new ReactNativeAppManager();

    this.setupLogging();
    this.setupRequestHandlers();
  }

  private setupLogging() {
    // Connect our logger to MCP notifications
    logger.setMCPLogCallback((level, message, data) => {
      if (config.getLoggingConfig().enableMCPLogging && this.isRunning) {
        try {
          this.server.notification({
            method: "notifications/log",
            params: {
              level,
              logger: "rn-ios-simulator-mcp",
              data: data
                ? `${message} | Data: ${JSON.stringify(data)}`
                : message,
            },
          });
        } catch (error) {
          // Fallback to console logging if MCP logging fails
          console.error(`MCP logging failed: ${error}`);
          console.log(`[${level}] ${message}`, data);
        }
      }
    });
  }

  private setupRequestHandlers() {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      this.mcpLogger.debug("Received list-tools request");

      try {
        const tools = this.toolRegistry.getAllTools();
        this.mcpLogger.info(`Returning ${tools.length} available tools`);

        return {
          tools: tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
          })),
        };
      } catch (error) {
        this.mcpLogger.error("Failed to list tools", error);
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to list tools: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    });

    // Handle tool execution
    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request: any) => {
        const { name, arguments: args } = request.params;

        this.mcpLogger.info(`Executing tool: ${name}`, { args });

        try {
          const tool = this.toolRegistry.getTool(name);
          if (!tool) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              `Unknown tool: ${name}`
            );
          }

          // Validate arguments against schema
          this.validateToolArguments(tool, args || {});

          // Execute the tool through the command router
          const result = await this.commandRouter.executeCommand(
            name,
            args || {}
          );

          this.mcpLogger.info(`Tool ${name} executed successfully`);

          return {
            content: result.content,
            isError: result.isError || false,
          };
        } catch (error) {
          this.mcpLogger.error(`Tool execution failed: ${name}`, error);

          if (error instanceof McpError) {
            throw error;
          }

          throw new McpError(
            ErrorCode.InternalError,
            `Tool execution failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }
    );
  }

  private validateToolArguments(tool: RegisteredTool, args: any): void {
    const schema = tool.inputSchema;

    // Check required properties
    if (schema.required) {
      for (const required of schema.required) {
        if (!(required in args)) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Missing required argument: ${required}`
          );
        }
      }
    }

    // Basic type validation
    for (const [key, value] of Object.entries(args)) {
      const propertySchema = schema.properties?.[key];
      if (propertySchema) {
        this.validatePropertyType(key, value, propertySchema);
      }
    }
  }

  private validatePropertyType(key: string, value: any, schema: any): void {
    if (schema.type === "string" && typeof value !== "string") {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Argument ${key} must be a string`
      );
    }

    if (schema.type === "number" && typeof value !== "number") {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Argument ${key} must be a number`
      );
    }

    if (schema.type === "boolean" && typeof value !== "boolean") {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Argument ${key} must be a boolean`
      );
    }

    if (schema.enum && !schema.enum.includes(value)) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Argument ${key} must be one of: ${schema.enum.join(", ")}`
      );
    }
  }

  async start(): Promise<void> {
    try {
      this.mcpLogger.info("Starting MCP server...");

      // Initialize all tools with managers
      await this.toolRegistry.initializeTools(
        this.simulatorManager,
        this.reactNativeManager
      );

      const transport = new StdioServerTransport();

      // Connect to transport first, before enabling MCP logging
      await this.server.connect(transport);

      // Only enable MCP logging after connection is established
      this.isRunning = true;

      this.mcpLogger.info("MCP server started successfully");
      this.mcpLogger.info("React Native iOS Simulator MCP Server is ready");
      this.mcpLogger.info("MCP server connected and ready for requests");
    } catch (error) {
      this.mcpLogger.error("Failed to start MCP server", error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.mcpLogger.info("Stopping MCP server...");
      this.isRunning = false;

      await this.server.close();
      this.mcpLogger.info("MCP server stopped");
    } catch (error) {
      this.mcpLogger.error("Error stopping MCP server", error);
      throw error;
    }
  }

  getToolRegistry(): ToolRegistry {
    return this.toolRegistry;
  }

  getCommandRouter(): CommandRouter {
    return this.commandRouter;
  }

  isServerRunning(): boolean {
    return this.isRunning;
  }
}
