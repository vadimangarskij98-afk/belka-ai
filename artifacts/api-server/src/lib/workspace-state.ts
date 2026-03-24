import path from "path";
import os from "os";

const DEFAULT_WORKSPACE = path.join(os.homedir(), "belka-workspace");
let currentWorkspace = DEFAULT_WORKSPACE;

export function getWorkspace(): string {
  return currentWorkspace;
}

export function setWorkspace(newPath: string): string {
  const resolved = path.resolve(newPath);
  currentWorkspace = resolved;
  return currentWorkspace;
}

export function sanitizeWorkspacePath(filePath: string): string | null {
  const workspace = getWorkspace();
  const resolved = path.resolve(workspace, filePath);
  const relative = path.relative(workspace, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  if (!resolved.startsWith(workspace + path.sep) && resolved !== workspace) return null;
  return resolved;
}
