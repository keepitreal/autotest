import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

import { logger } from "../utils/logger";
import { config } from "../utils/config";
import { headlessManager } from "../utils/headless";
// import { MCPToolResult } from "../types/mcp"; // Will be used when implementing tool execution
import { ToolRegistry, RegisteredTool } from "./ToolRegistry";
import { PromptRegistry } from "./PromptRegistry";
import { CommandRouter } from "./CommandRouter";
import { SimulatorManager } from "../managers/SimulatorManager";
import { ReactNativeAppManager } from "../managers/ReactNativeAppManager";

export class MCPServer {
  private server: Server;
  private mcpLogger = logger.createChildLogger("MCP-Server");
  private toolRegistry: ToolRegistry;
  private promptRegistry: PromptRegistry;
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
        },
      }
    );

    this.toolRegistry = new ToolRegistry();
    this.promptRegistry = new PromptRegistry();
    this.commandRouter = new CommandRouter(this.toolRegistry);
    this.simulatorManager = new SimulatorManager();
    this.reactNativeManager = new ReactNativeAppManager();

    this.setupLogging();
    this.setupRequestHandlers();
  }

  private setupLogging() {
    // Use console-only logging to avoid MCP logging capability issues
    // The logger will automatically use console output without MCP notifications
    this.mcpLogger.debug(
      "MCP logging setup complete - using console output only"
    );
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

    // Handle prompt listing
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      this.mcpLogger.debug("Received list-prompts request");

      try {
        const prompts = this.promptRegistry.getAllPrompts();
        this.mcpLogger.info(`Returning ${prompts.length} available prompts`);

        return { prompts };
      } catch (error) {
        this.mcpLogger.error("Failed to list prompts", error);
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to list prompts: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    });

    // Handle prompt retrieval
    this.server.setRequestHandler(
      GetPromptRequestSchema,
      async (request: any) => {
        const { name, arguments: args } = request.params;

        this.mcpLogger.info(`Retrieving prompt: ${name}`, { args });

        try {
          const prompt = this.promptRegistry.getPrompt(name);
          if (!prompt) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              `Unknown prompt: ${name}`
            );
          }

          // Execute the prompt handler to get the result
          const result = await prompt.handler(args || {});

          this.mcpLogger.info(`Prompt ${name} retrieved successfully`);

          // Return the result directly - it already contains messages and optional description
          return {
            description: result.description,
            messages: result.messages,
          };
        } catch (error) {
          this.mcpLogger.error(`Prompt retrieval failed: ${name}`, error);

          if (error instanceof McpError) {
            throw error;
          }

          throw new McpError(
            ErrorCode.InternalError,
            `Prompt retrieval failed: ${
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

      // Setup headless mode if enabled
      this.mcpLogger.info("🚀 Beginning headless mode setup...");
      const headlessResult = await headlessManager.setup();
      if (!headlessResult.success) {
        this.mcpLogger.error(
          "❌ Headless setup failed",
          headlessResult.message
        );
        throw new Error(`Headless setup failed: ${headlessResult.message}`);
      }

      this.mcpLogger.info(
        "✅ Headless setup completed:",
        headlessResult.message
      );

      // Apply headless environment variables if provided
      if (headlessResult.environment) {
        for (const [key, value] of Object.entries(headlessResult.environment)) {
          process.env[key] = value;
          this.mcpLogger.debug(`Set environment variable: ${key}=${value}`);
        }
      }

      // Initialize all tools with managers
      await this.toolRegistry.initializeTools(
        this.simulatorManager,
        this.reactNativeManager
      );

      // Initialize all prompts with managers
      await this.promptRegistry.initializePrompts(this.simulatorManager);

      const transport = new StdioServerTransport();

      // Connect to transport first, before enabling MCP logging
      await this.server.connect(transport);

      // Only enable MCP logging after connection is established
      this.isRunning = true;

      this.mcpLogger.info("MCP server started successfully");
      this.mcpLogger.info("React Native iOS Simulator MCP Server is ready");
      this.mcpLogger.info(
        `Mode: ${
          headlessManager.isHeadlessEnabled()
            ? `Headless (${headlessManager.getHeadlessMode()})`
            : "GUI"
        }`
      );
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

      // Clean up headless mode
      await headlessManager.cleanup();

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
