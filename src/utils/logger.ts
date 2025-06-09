import chalk from "chalk";

export type LogLevel = "debug" | "info" | "warning" | "error";

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
}

export class Logger {
  private context: string;
  private enabledLevels: Set<LogLevel>;
  private mcpLogCallback?: (
    level: LogLevel,
    message: string,
    data?: any
  ) => void;

  constructor(context: string = "RN-iOS-MCP") {
    this.context = context;
    this.enabledLevels = new Set(["info", "warning", "error"]);

    // Enable debug in development
    if (process.env.NODE_ENV === "development" || process.env.DEBUG) {
      this.enabledLevels.add("debug");
    }
  }

  setMCPLogCallback(
    callback: (level: LogLevel, message: string, data?: any) => void
  ) {
    this.mcpLogCallback = callback;
  }

  setLogLevels(levels: LogLevel[]) {
    this.enabledLevels = new Set(levels);
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: string
  ): string {
    const timestamp = new Date().toISOString();
    const ctx = context || this.context;
    const levelStr = level.toUpperCase().padEnd(7);

    return `[${timestamp}] [${levelStr}] [${ctx}] ${message}`;
  }

  private getColoredLevel(level: LogLevel): string {
    switch (level) {
      case "debug":
        return chalk.gray(level.toUpperCase());
      case "info":
        return chalk.blue(level.toUpperCase());
      case "warning":
        return chalk.yellow(level.toUpperCase());
      case "error":
        return chalk.red(level.toUpperCase());
    }
  }

  private log(level: LogLevel, message: string, data?: any, context?: string) {
    if (!this.enabledLevels.has(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, context);
    const coloredLevel = this.getColoredLevel(level);
    const timestamp = chalk.gray(new Date().toISOString());
    const ctx = chalk.cyan(`[${context || this.context}]`);

    // Console output with colors
    console.error(`${timestamp} ${coloredLevel} ${ctx} ${message}`);
    if (data) {
      console.error(chalk.gray("Data:"), data);
    }

    // MCP protocol logging
    if (this.mcpLogCallback) {
      this.mcpLogCallback(level, formattedMessage, data);
    }
  }

  debug(message: string, data?: any, context?: string) {
    this.log("debug", message, data, context);
  }

  info(message: string, data?: any, context?: string) {
    this.log("info", message, data, context);
  }

  warning(message: string, data?: any, context?: string) {
    this.log("warning", message, data, context);
  }

  error(message: string, error?: Error | any, context?: string) {
    let data = error;
    if (error instanceof Error) {
      data = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }
    this.log("error", message, data, context);
  }

  createChildLogger(context: string): Logger {
    const child = new Logger(`${this.context}:${context}`);
    child.setLogLevels(Array.from(this.enabledLevels));
    if (this.mcpLogCallback) {
      child.setMCPLogCallback(this.mcpLogCallback);
    }
    return child;
  }
}

// Global logger instance
export const logger = new Logger();
