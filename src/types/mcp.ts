export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPToolResult {
  content: Array<{
    type: "text" | "image";
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

export interface MCPServerConfig {
  name: string;
  version: string;
  description: string;
  capabilities: {
    tools?: boolean;
    resources?: boolean;
    prompts?: boolean;
  };
}

export interface MCPRequest {
  method: string;
  params?: any;
}

export interface MCPResponse {
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface LogLevel {
  level: "debug" | "info" | "warning" | "error";
  data: any;
  logger?: string;
}
