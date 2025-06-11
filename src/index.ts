#!/usr/bin/env node

import { logger } from "./utils/logger";
import { config } from "./utils/config";

// For now, create a basic entry point that we can build upon
// Once we have the MCP SDK working, we'll uncomment the actual server code

async function main() {
  try {
    logger.info("Starting React Native iOS Simulator MCP Server...");

    // Log configuration
    const serverConfig = config.get();
    logger.info("Server configuration loaded", {
      simulator: serverConfig.simulator,
      reactNative: serverConfig.reactNative,
      logging: serverConfig.logging,
      headless: serverConfig.headless,
    });

    // Explicitly log headless mode status
    logger.info(
      `🤖 Headless mode: ${
        serverConfig.headless.enabled ? "ENABLED" : "DISABLED"
      }`
    );
    if (serverConfig.headless.enabled) {
      logger.info(`🔧 Headless mode type: ${serverConfig.headless.mode}`);
      logger.info(`📝 Environment HEADLESS_MODE: ${process.env.HEADLESS_MODE}`);
      logger.info(
        `📝 Environment HEADLESS_MODE_TYPE: ${process.env.HEADLESS_MODE_TYPE}`
      );
    }

    logger.info("MCP Server is ready and waiting for connections");

    // Start the actual MCP server with tools
    const { MCPServer } = await import("./server/MCPServer");
    const server = new MCPServer();

    await server.start();

    // Keep the process alive - the MCP server should handle stdio communication
    logger.info("MCP server is running and handling requests...");

    // Keep the process alive to handle MCP requests with proper cleanup
    await new Promise<void>((resolve) => {
      process.on("SIGINT", async () => {
        logger.info("Received SIGINT, shutting down gracefully...");
        if (server.isServerRunning()) {
          await server.stop();
        }
        resolve();
      });

      process.on("SIGTERM", async () => {
        logger.info("Received SIGTERM, shutting down gracefully...");
        if (server.isServerRunning()) {
          await server.stop();
        }
        resolve();
      });
    });
  } catch (error) {
    logger.error("Failed to start MCP server", error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", { promise, reason });
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

if (require.main === module) {
  main();
}
