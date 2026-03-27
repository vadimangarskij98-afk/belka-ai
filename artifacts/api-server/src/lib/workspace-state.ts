import fs from "fs";
import os from "os";
import path from "path";

const WORKSPACE_ROOT = path.resolve(
  process.env.WORKSPACE_ROOT || path.join(os.homedir(), "belka-workspace"),
);

const currentWorkspaces = new Map<number, string>();

function getWorkspaceRoot(userId: number): string {
  return path.join(WORKSPACE_ROOT, `user-${userId}`);
}

function isWithin(basePath: string, targetPath: string): boolean {
  const relative = path.relative(basePath, targetPath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function getWorkspace(userId: number): string {
  return currentWorkspaces.get(userId) ?? getWorkspaceRoot(userId);
}

export function ensureWorkspace(userId: number): string {
  const workspace = getWorkspace(userId);
  fs.mkdirSync(workspace, { recursive: true });
  return workspace;
}

export function setWorkspace(userId: number, nextPath: string): string {
  const root = getWorkspaceRoot(userId);
  fs.mkdirSync(root, { recursive: true });

  const resolved = path.isAbsolute(nextPath)
    ? path.resolve(nextPath)
    : path.resolve(root, nextPath);

  if (!isWithin(root, resolved)) {
    throw new Error("path outside workspace root");
  }

  currentWorkspaces.set(userId, resolved);
  return resolved;
}

export function sanitizeWorkspacePath(userId: number, filePath: string): string | null {
  const workspace = getWorkspace(userId);
  const resolved = path.isAbsolute(filePath)
    ? path.resolve(filePath)
    : path.resolve(workspace, filePath);

  if (!isWithin(workspace, resolved)) {
    return null;
  }

  return resolved;
}

export function resolveWorkspaceCwd(userId: number, cwd?: string): string | null {
  const workspace = ensureWorkspace(userId);
  if (!cwd) {
    return workspace;
  }

  const resolved = path.isAbsolute(cwd)
    ? path.resolve(cwd)
    : path.resolve(workspace, cwd);

  if (!isWithin(workspace, resolved)) {
    return null;
  }

  return resolved;
}

export function getWorkspaceRootPath(userId: number): string {
  return getWorkspaceRoot(userId);
}
