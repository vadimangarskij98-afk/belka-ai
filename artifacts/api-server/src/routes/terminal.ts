import { Router, type Request, type Response } from "express";
import { spawnSync } from "child_process";
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

function getRouteParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : (value ?? "");
}

function runShellCommand(command: string, cwd: string) {
  const env = {
    ...process.env,
    HOME: os.homedir(),
    USERPROFILE: os.homedir(),
    TERM: "xterm-256color",
  };

  if (process.platform === "win32") {
    return spawnSync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", command],
      {
        cwd,
        timeout: 30000,
        maxBuffer: 1024 * 1024,
        encoding: "utf-8",
        env,
      },
    );
  }

  return spawnSync("/bin/bash", ["-lc", command], {
    cwd,
    timeout: 30000,
    maxBuffer: 1024 * 1024,
    encoding: "utf-8",
    env,
  });
}

router.post("/terminal/exec", (req: Request, res: Response) => {
  const { command, cwd } = req.body;
  if (!command) { res.status(400).json({ error: "command required" }); return; }
  if (!isCommandSafe(command)) { res.status(403).json({ error: "command blocked for safety" }); return; }

  const workDir = cwd || getWorkspace();

  try {
    const result = runShellCommand(command, workDir);

    if (result.error) {
      throw result.error;
    }

    res.json({ output: result.stdout || "", exitCode: result.status ?? 0, cwd: workDir });
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
  const sessionId = getRouteParam(req.params.id);
  const session = sessions.get(sessionId);
  if (!session) { res.status(404).json({ error: "session not found" }); return; }

  const { command } = req.body;
  if (!command) { res.status(400).json({ error: "command required" }); return; }
  if (!isCommandSafe(command)) { res.status(403).json({ error: "command blocked for safety" }); return; }

  try {
    const result = runShellCommand(command, session.cwd);

    if (result.error) {
      throw result.error;
    }

    if (command.startsWith("cd ")) {
      const newDir = command.slice(3).trim();
      const resolved = require("path").resolve(session.cwd, newDir);
      try {
        const stats = require("fs").statSync(resolved);
        if (stats.isDirectory()) session.cwd = resolved;
      } catch {}
    }

    const output = result.stdout || "";
    res.json({ output, exitCode: result.status ?? 0, cwd: session.cwd });
  } catch (err: any) {
    const output = (err.stdout || "") + (err.stderr || err.message || "");
    res.json({ output, error: err.stderr || err.message, exitCode: err.status || 1, cwd: session.cwd });
  }
});

router.delete("/terminal/:id", (req: Request, res: Response) => {
  sessions.delete(getRouteParam(req.params.id));
  res.json({ success: true });
});

export default router;
