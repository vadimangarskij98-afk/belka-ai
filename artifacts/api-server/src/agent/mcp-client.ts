import { logger } from "./error-monitor";

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export class MCPClient {
  private clients: Map<string, unknown> = new Map();

  async connect(name: string, _command: string, _args: string[] = []): Promise<void> {
    try {
      logger.info("MCP connect requested (stub)", { name });
      this.clients.set(name, { connected: false, name });
    } catch (error) {
      logger.error("MCP connect failed", { name, error: String(error) });
    }
  }

  async listTools(_serverName: string): Promise<MCPTool[]> {
    return [];
  }

  async callTool(serverName: string, toolName: string, args: Record<string, unknown>): Promise<unknown> {
    logger.info("MCP tool call (stub)", { serverName, toolName, args });
    return { status: "MCP not fully configured", serverName, toolName };
  }

  async initDefault(): Promise<void> {
    logger.info("MCP initDefault called — configure MCP servers via environment");
  }

  async agentCallTool(toolSpec: string): Promise<string> {
    const match = toolSpec.match(/^(\w+):(\w+)\((.+)\)$/);
    if (!match) return "Invalid tool spec format";

    const [, serverName, toolName, argsStr] = match;
    try {
      const args = JSON.parse(argsStr);
      const result = await this.callTool(serverName, toolName, args);
      return JSON.stringify(result);
    } catch (error) {
      return `Error: ${String(error)}`;
    }
  }
}
