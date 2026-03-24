import { Router, type Request, type Response } from "express";
import { execSync } from "child_process";
import os from "os";
import { getWorkspace } from "../lib/workspace-state";

const router = Router();

const BLOCKED_PATTERNS = [
  /rm\s+(-[rf]+\s+)?\/(?!home\/runner\/belka)/i,
  /sudo\s/i,
  /chmod\s.*777/i,
  />\s*\/etc\//i,
  /mkfs/i,
  /dd\s+if=/i,
];

function isCommandSafe(command: string): boolean {
  return !BLOCKED_PATTERNS.some(p => p.test(command));
}

interface TerminalSession {
  id: string;
  cwd: string;
  alive: boolean;
}

const sessions = new Map<string, TerminalSession>();

router.post("/terminal/exec", (req: Request, res: Response) => {
  const { command, cwd } = req.body;
  if (!command) { res.status(400).json({ error: "command required" }); return; }
  if (!isCommandSafe(command)) { res.status(403).json({ error: "command blocked for safety" }); return; }

  const workDir = cwd || getWorkspace();

  try {
    const result = execSync(command, {
      cwd: workDir,
      timeout: 30000,
      maxBuffer: 1024 * 1024,
      encoding: "utf-8",
      env: { ...process.env, HOME: os.homedir(), TERM: "xterm-256color" },
      shell: "/bin/bash",
    });
    res.json({ output: result, exitCode: 0, cwd: workDir });
  } catch (err: any) {
    res.json({
      output: err.stdout || "",
      error: err.stderr || err.message,
      exitCode: err.status || 1,
      cwd: workDir,
    });
  }
});

router.post("/terminal/create", (req: Request, res: Response) => {
  const { cwd } = req.body;
  const id = `term-${Date.now()}`;
  const workDir = cwd || getWorkspace();

  const session: TerminalSession = { id, cwd: workDir, alive: true };
  sessions.set(id, session);
  res.json({ id, cwd: workDir });
});

router.post("/terminal/:id/write", (req: Request, res: Response) => {
  const session = sessions.get(req.params.id);
  if (!session) { res.status(404).json({ error: "session not found" }); return; }

  const { command } = req.body;
  if (!command) { res.status(400).json({ error: "command required" }); return; }
  if (!isCommandSafe(command)) { res.status(403).json({ error: "command blocked for safety" }); return; }

  try {
    const result = execSync(command, {
      cwd: session.cwd,
      timeout: 30000,
      maxBuffer: 1024 * 1024,
      encoding: "utf-8",
      env: { ...process.env, HOME: os.homedir(), TERM: "xterm-256color" },
      shell: "/bin/bash",
    });

    if (command.startsWith("cd ")) {
      const newDir = command.slice(3).trim();
      const resolved = require("path").resolve(session.cwd, newDir);
      try {
        const stats = require("fs").statSync(resolved);
        if (stats.isDirectory()) session.cwd = resolved;
      } catch {}
    }

    const output = result || "";
    res.json({ output, exitCode: 0, cwd: session.cwd });
  } catch (err: any) {
    const output = (err.stdout || "") + (err.stderr || err.message || "");
    res.json({ output, error: err.stderr || err.message, exitCode: err.status || 1, cwd: session.cwd });
  }
});

router.delete("/terminal/:id", (req: Request, res: Response) => {
  sessions.delete(req.params.id);
  res.json({ success: true });
});

export default router;
