import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport, type StdioServerParameters } from "@modelcontextprotocol/sdk/client/stdio.js";
import { MCP_DEFAULT_CWD } from "../config";
import { logger } from "./logger";

export interface McpCatalogEntry {
  key: string;
  name: string;
  description: string;
  icon: string;
  command: string;
  args: string[];
  requiresApiKey?: boolean;
  apiKeyEnvName?: string;
  requiresWorkspacePath?: boolean;
}

export interface McpServerConfig {
  id: string;
  name: string;
  command: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
  icon?: string;
  description?: string;
  catalogKey?: string;
  requiresApiKey?: boolean;
  apiKeyEnvName?: string;
}

export interface McpToolSummary {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface McpServerSnapshot {
  id: string;
  name: string;
  command: string;
  args: string[];
  cwd?: string;
  icon?: string;
  description?: string;
  catalogKey?: string;
  connected: boolean;
  status: "disconnected" | "connecting" | "connected" | "error";
  requiresApiKey?: boolean;
  apiKeyEnvName?: string;
  tools: McpToolSummary[];
  lastError?: string;
  connectedAt?: string;
  pid?: number | null;
  stderrPreview?: string[];
}

type ManagedServer = McpServerConfig & {
  client?: Client;
  transport?: StdioClientTransport;
  tools: McpToolSummary[];
  status: McpServerSnapshot["status"];
  connectedAt?: string;
  lastError?: string;
  stderrLines: string[];
};

const NPX_COMMAND = process.platform === "win32" ? "npx.cmd" : "npx";
const SAFE_ENV_KEYS = [
  "PATH",
  "PATHEXT",
  "SystemRoot",
  "ComSpec",
  "HOME",
  "USERPROFILE",
  "TMP",
  "TEMP",
  "APPDATA",
  "LOCALAPPDATA",
  "ProgramData",
  "ProgramFiles",
  "ProgramFiles(x86)",
  "WINDIR",
];

const MCP_CATALOG: McpCatalogEntry[] = [
  {
    key: "sequential-thinking",
    name: "Sequential Thinking",
    description: "Пошаговое reasoning и структурированное разбиение сложных задач.",
    icon: "brain",
    command: NPX_COMMAND,
    args: ["-y", "@modelcontextprotocol/server-sequential-thinking"],
  },
  {
    key: "filesystem",
    name: "Filesystem",
    description: "Доступ к локальным файлам и папкам рабочей директории.",
    icon: "folder",
    command: NPX_COMMAND,
    args: ["-y", "@modelcontextprotocol/server-filesystem"],
    requiresWorkspacePath: true,
  },
  {
    key: "github",
    name: "GitHub",
    description: "Репозитории, issues и pull requests через MCP.",
    icon: "globe",
    command: NPX_COMMAND,
    args: ["-y", "@modelcontextprotocol/server-github"],
    requiresApiKey: true,
    apiKeyEnvName: "GITHUB_PERSONAL_ACCESS_TOKEN",
  },
  {
    key: "brave-search",
    name: "Brave Search",
    description: "Веб-поиск в реальном времени через Brave Search.",
    icon: "search",
    command: NPX_COMMAND,
    args: ["-y", "@modelcontextprotocol/server-brave-search"],
    requiresApiKey: true,
    apiKeyEnvName: "BRAVE_API_KEY",
  },
  {
    key: "playwright",
    name: "Playwright",
    description: "Автоматизация браузера, UI-проверки и действия по страницам.",
    icon: "code",
    command: NPX_COMMAND,
    args: ["-y", "@modelcontextprotocol/server-puppeteer"],
  },
];

function sanitizeEnv(env?: Record<string, string>): Record<string, string> | undefined {
  if (!env) return undefined;

  const normalizedEntries = Object.entries(env)
    .filter(([key, value]) => key.trim() && typeof value === "string" && value.trim());

  if (normalizedEntries.length === 0) return undefined;
  return Object.fromEntries(normalizedEntries);
}

function cloneCatalogEntry(entry: McpCatalogEntry): McpCatalogEntry {
  return {
    ...entry,
    args: [...entry.args],
  };
}

function toToolSummary(tool: {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}): McpToolSummary {
  return {
    name: tool.name,
    description: tool.description ?? "",
    inputSchema: tool.inputSchema ?? {},
  };
}

function serializeToolResult(result: {
  content?: Array<Record<string, unknown>>;
  structuredContent?: unknown;
  isError?: boolean;
  [key: string]: unknown;
}) {
  const textParts = (result.content ?? [])
    .filter((item) => item?.type === "text" && typeof item.text === "string")
    .map((item) => String(item.text));

  return {
    ok: !result.isError,
    isError: Boolean(result.isError),
    text: textParts.join("\n").trim(),
    content: result.content ?? [],
    structuredContent: result.structuredContent ?? null,
  };
}

export class McpRuntimeManager {
  private readonly serversByOwner = new Map<string, Map<string, ManagedServer>>();

  getCatalog(): McpCatalogEntry[] {
    return MCP_CATALOG.map(cloneCatalogEntry);
  }

  listServers(ownerId: string): McpServerSnapshot[] {
    return Array.from(this.getOwnerServers(ownerId).values()).map((server) => this.snapshot(server));
  }

  getServer(ownerId: string, id: string): McpServerSnapshot | undefined {
    const server = this.getOwnerServers(ownerId).get(id);
    return server ? this.snapshot(server) : undefined;
  }

  async connect(ownerId: string, config: McpServerConfig): Promise<McpServerSnapshot> {
    const ownerServers = this.getOwnerServers(ownerId, true);
    const existing = ownerServers.get(config.id);
    if (existing) {
      await this.disconnect(ownerId, config.id);
    }

    const managed: ManagedServer = {
      ...config,
      tools: [],
      status: "connecting",
      stderrLines: [],
    };

    ownerServers.set(config.id, managed);

    const transport = new StdioClientTransport(this.buildTransportParams(config));
    const client = new Client(
      { name: "BELKA AI MCP Runtime", version: "1.0.0" },
      { capabilities: {} },
    );

    const stderr = transport.stderr;
    if (stderr) {
      stderr.on("data", (chunk) => {
        const text = String(chunk).trim();
        if (!text) return;
        managed.stderrLines.push(text);
        if (managed.stderrLines.length > 20) {
          managed.stderrLines.splice(0, managed.stderrLines.length - 20);
        }
      });
    }

    transport.onerror = (error) => {
      managed.status = "error";
      managed.lastError = error.message;
      logger.error({ err: error, serverId: config.id }, "MCP transport error");
    };

    transport.onclose = () => {
      if (managed.status === "connected") {
        managed.status = "disconnected";
      }
    };

    try {
      managed.transport = transport;
      managed.client = client;
      await client.connect(transport, { timeout: 20_000 });

      managed.connectedAt = new Date().toISOString();
      managed.status = "connected";
      managed.lastError = undefined;

      const tools = await this.refreshTools(ownerId, config.id);
      managed.tools = tools;

      logger.info({ serverId: config.id, name: config.name, tools: tools.length }, "MCP server connected");
      return this.snapshot(managed);
    } catch (error) {
      managed.status = "error";
      managed.lastError = error instanceof Error ? error.message : String(error);
      logger.error({ err: error, serverId: config.id, name: config.name }, "Failed to connect MCP server");
      await this.closeManagedServer(managed);
      return this.snapshot(managed);
    }
  }

  async disconnect(ownerId: string, id: string): Promise<McpServerSnapshot | undefined> {
    const server = this.getOwnerServers(ownerId).get(id);
    if (!server) return undefined;

    await this.closeManagedServer(server);
    server.status = "disconnected";
    server.lastError = undefined;
    server.tools = [];
    logger.info({ serverId: id }, "MCP server disconnected");
    return this.snapshot(server);
  }

  async refreshTools(ownerId: string, id: string): Promise<McpToolSummary[]> {
    const server = this.requireConnectedServer(ownerId, id);
    const result = await server.client!.listTools(undefined, { timeout: 15_000 });
    server.tools = (result.tools ?? []).map(toToolSummary);
    return server.tools;
  }

  async callTool(ownerId: string, id: string, toolName: string, args: Record<string, unknown>) {
    const server = this.requireConnectedServer(ownerId, id);
    const result = await server.client!.callTool(
      {
        name: toolName,
        arguments: args,
      },
      undefined,
      { timeout: 60_000 },
    );
    return serializeToolResult(result);
  }

  private requireConnectedServer(ownerId: string, id: string): ManagedServer {
    const server = this.getOwnerServers(ownerId).get(id);
    if (!server || server.status !== "connected" || !server.client || !server.transport) {
      throw new Error("MCP server is not connected");
    }
    return server;
  }

  private getOwnerServers(ownerId: string, create: boolean = false) {
    const normalizedOwnerId = String(ownerId);
    let ownerServers = this.serversByOwner.get(normalizedOwnerId);
    if (!ownerServers && create) {
      ownerServers = new Map<string, ManagedServer>();
      this.serversByOwner.set(normalizedOwnerId, ownerServers);
    }
    return ownerServers ?? new Map<string, ManagedServer>();
  }

  private buildTransportParams(config: McpServerConfig): StdioServerParameters {
    return {
      command: config.command,
      args: config.args,
      cwd: config.cwd || MCP_DEFAULT_CWD,
      env: this.buildProcessEnv(config.env),
      stderr: "pipe",
    };
  }

  private async closeManagedServer(server: ManagedServer) {
    await Promise.allSettled([
      server.client?.close(),
      server.transport?.close(),
    ]);
    server.client = undefined;
    server.transport = undefined;
  }

  private snapshot(server: ManagedServer): McpServerSnapshot {
    return {
      id: server.id,
      name: server.name,
      command: server.command,
      args: [...server.args],
      cwd: server.cwd,
      icon: server.icon,
      description: server.description,
      catalogKey: server.catalogKey,
      connected: server.status === "connected",
      status: server.status,
      requiresApiKey: server.requiresApiKey,
      apiKeyEnvName: server.apiKeyEnvName,
      tools: [...server.tools],
      lastError: server.lastError,
      connectedAt: server.connectedAt,
      pid: server.transport?.pid ?? null,
      stderrPreview: server.stderrLines.slice(-5),
    };
  }

  private buildProcessEnv(extraEnv?: Record<string, string>) {
    const baseEntries = SAFE_ENV_KEYS
      .map((key) => [key, process.env[key]] as const)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim().length > 0);

    return {
      ...Object.fromEntries(baseEntries),
      ...(sanitizeEnv(extraEnv) ?? {}),
    };
  }
}

export const mcpRuntime = new McpRuntimeManager();
