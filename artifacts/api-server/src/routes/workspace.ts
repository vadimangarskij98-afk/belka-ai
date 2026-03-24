import { Router, type Request, type Response } from "express";
import fs from "fs";
import path from "path";
import { getWorkspace, setWorkspace, sanitizeWorkspacePath } from "../lib/workspace-state";

const router = Router();
const deletedBackups = new Map<string, { content: string; deletedAt: number }>();

function ensureWorkspace() {
  const ws = getWorkspace();
  if (!fs.existsSync(ws)) {
    fs.mkdirSync(ws, { recursive: true });
  }
}

function getFilesRecursive(dir: string, base: string = "", depth: number = 0): any[] {
  if (depth > 5) return [];
  const results: any[] = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".gitignore") continue;
    if (entry.name === "node_modules" || entry.name === "__pycache__") continue;
    const relPath = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      results.push({ name: entry.name, path: relPath, type: "directory", children: getFilesRecursive(path.join(dir, entry.name), relPath, depth + 1) });
    } else {
      const stats = fs.statSync(path.join(dir, entry.name));
      results.push({ name: entry.name, path: relPath, type: "file", size: stats.size, modified: stats.mtimeMs });
    }
  }
  return results.sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

router.get("/workspace", (_req: Request, res: Response) => {
  ensureWorkspace();
  res.json({ path: getWorkspace(), exists: true });
});

router.post("/workspace/set", (req: Request, res: Response) => {
  const { path: newPath } = req.body;
  if (!newPath) { res.status(400).json({ error: "path required" }); return; }
  const ws = setWorkspace(newPath);
  ensureWorkspace();
  res.json({ path: ws, exists: true });
});

router.get("/workspace/files", (_req: Request, res: Response) => {
  ensureWorkspace();
  const files = getFilesRecursive(getWorkspace());
  res.json({ workspace: getWorkspace(), files });
});

router.get("/workspace/file/content", (req: Request, res: Response) => {
  const filePath = req.query.path as string;
  if (!filePath) { res.status(400).json({ error: "path query required" }); return; }
  const safe = sanitizeWorkspacePath(filePath);
  if (!safe) { res.status(403).json({ error: "path outside workspace" }); return; }
  if (!fs.existsSync(safe)) { res.status(404).json({ error: "file not found" }); return; }
  const content = fs.readFileSync(safe, "utf-8");
  const stats = fs.statSync(safe);
  res.json({ path: filePath, content, size: stats.size, modified: stats.mtimeMs });
});

router.post("/workspace/file", (req: Request, res: Response) => {
  const { path: filePath, content } = req.body;
  if (!filePath) { res.status(400).json({ error: "path required" }); return; }
  const safe = sanitizeWorkspacePath(filePath);
  if (!safe) { res.status(403).json({ error: "path outside workspace" }); return; }
  const dir = path.dirname(safe);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(safe, content || "", "utf-8");
  res.json({ success: true, path: filePath, action: "created" });
});

router.put("/workspace/file", (req: Request, res: Response) => {
  const { path: filePath, content } = req.body;
  if (!filePath) { res.status(400).json({ error: "path required" }); return; }
  const safe = sanitizeWorkspacePath(filePath);
  if (!safe) { res.status(403).json({ error: "path outside workspace" }); return; }
  if (fs.existsSync(safe)) {
    const old = fs.readFileSync(safe, "utf-8");
    deletedBackups.set(filePath, { content: old, deletedAt: Date.now() });
  }
  const dir = path.dirname(safe);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(safe, content || "", "utf-8");
  res.json({ success: true, path: filePath, action: "updated" });
});

router.delete("/workspace/file", (req: Request, res: Response) => {
  const filePath = req.query.path as string || req.body?.path;
  if (!filePath) { res.status(400).json({ error: "path required" }); return; }
  const safe = sanitizeWorkspacePath(filePath);
  if (!safe) { res.status(403).json({ error: "path outside workspace" }); return; }
  if (!fs.existsSync(safe)) { res.status(404).json({ error: "file not found" }); return; }
  const content = fs.readFileSync(safe, "utf-8");
  deletedBackups.set(filePath, { content, deletedAt: Date.now() });
  fs.unlinkSync(safe);
  res.json({ success: true, path: filePath, action: "deleted" });
});

router.post("/workspace/file/restore", (req: Request, res: Response) => {
  const { path: filePath } = req.body;
  if (!filePath) { res.status(400).json({ error: "path required" }); return; }
  const backup = deletedBackups.get(filePath);
  if (!backup) { res.status(404).json({ error: "no backup found" }); return; }
  const safe = sanitizeWorkspacePath(filePath);
  if (!safe) { res.status(403).json({ error: "path outside workspace" }); return; }
  const dir = path.dirname(safe);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(safe, backup.content, "utf-8");
  deletedBackups.delete(filePath);
  res.json({ success: true, path: filePath, action: "restored" });
});

router.post("/workspace/directory", (req: Request, res: Response) => {
  const { path: dirPath } = req.body;
  if (!dirPath) { res.status(400).json({ error: "path required" }); return; }
  const safe = sanitizeWorkspacePath(dirPath);
  if (!safe) { res.status(403).json({ error: "path outside workspace" }); return; }
  fs.mkdirSync(safe, { recursive: true });
  res.json({ success: true, path: dirPath, action: "created" });
});

export default router;
