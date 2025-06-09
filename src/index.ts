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

    // Keep the process alive
    process.on("SIGINT", async () => {
      logger.info("Received SIGINT, shutting down gracefully...");
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      logger.info("Received SIGTERM, shutting down gracefully...");
      process.exit(0);
    });

    // Start the actual MCP server with tools
    const { MCPServer } = await import("./server/MCPServer");
    const server = new MCPServer();
    await server.start();
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
