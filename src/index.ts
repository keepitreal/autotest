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
    });

    logger.info("MCP Server is ready and waiting for connections");

    // Start the actual MCP server with tools
    const { MCPServer } = await import("./server/MCPServer");
    const server = new MCPServer();

    // Set up cleanup handlers before starting
    process.on("SIGINT", async () => {
      logger.info("Received SIGINT, shutting down gracefully...");
      if (server.isServerRunning()) {
        await server.stop();
      }
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      logger.info("Received SIGTERM, shutting down gracefully...");
      if (server.isServerRunning()) {
        await server.stop();
      }
      process.exit(0);
    });

    await server.start();

    // Keep the process alive - the MCP server should handle stdio communication
    logger.info("MCP server is running and handling requests...");

    // Keep process alive indefinitely
    await new Promise(() => {}); // This will never resolve, keeping the process alive
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
