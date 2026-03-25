import { Router, type Request, type Response } from "express";
import { execFileSync } from "child_process";
import path from "path";
import os from "os";
import fs from "fs";
import { getWorkspace } from "../lib/workspace-state";

const router = Router();

function sanitizeShellArg(arg: string): string {
  return arg.replace(/[`$\\!"';&|<>(){}[\]\n\r]/g, "");
}

function gitExec(args: string[], cwd: string): string {
  return execFileSync("git", args, {
    cwd,
    timeout: 60000,
    maxBuffer: 5 * 1024 * 1024,
    encoding: "utf-8",
    env: { ...process.env, HOME: os.homedir(), GIT_TERMINAL_PROMPT: "0" },
  });
}

router.post("/git/clone", (req: Request, res: Response) => {
  const { url, directory } = req.body;
  if (!url) { res.status(400).json({ error: "url required" }); return; }

  const safeUrl = sanitizeShellArg(url);
  if (!safeUrl.match(/^https?:\/\//)) { res.status(400).json({ error: "only http(s) URLs allowed" }); return; }

  const workspace = getWorkspace();
  const targetDir = sanitizeShellArg(directory || path.basename(url, ".git"));
  const fullPath = path.resolve(workspace, targetDir);

  if (!fullPath.startsWith(workspace)) { res.status(403).json({ error: "invalid directory" }); return; }

  try {
    if (fs.existsSync(fullPath)) {
      res.status(409).json({ error: "directory already exists", path: fullPath });
      return;
    }
    const output = gitExec(["clone", safeUrl, fullPath], workspace);
    res.json({ success: true, path: fullPath, output: output.trim() });
  } catch (err: any) {
    res.status(500).json({ error: err.stderr || err.message });
  }
});

router.get("/git/status", (_req: Request, res: Response) => {
  const workspace = getWorkspace();
  try {
    const isGit = fs.existsSync(path.join(workspace, ".git"));
    if (!isGit) { res.json({ initialized: false, workspace }); return; }

    const branch = gitExec(["branch", "--show-current"], workspace).trim();
    const status = gitExec(["status", "--porcelain"], workspace).trim();
    const remote = (() => { try { return gitExec(["remote", "-v"], workspace).trim(); } catch { return ""; } })();

    const files = status.split("\n").filter(Boolean).map(line => ({
      status: line.substring(0, 2).trim(),
      file: line.substring(3),
    }));

    res.json({ initialized: true, branch, files, remote, workspace });
  } catch (err: any) {
    res.status(500).json({ error: err.stderr || err.message });
  }
});

router.post("/git/init", (_req: Request, res: Response) => {
  const workspace = getWorkspace();
  try {
    gitExec(["init"], workspace);
    res.json({ success: true, workspace });
  } catch (err: any) {
    res.status(500).json({ error: err.stderr || err.message });
  }
});

router.post("/git/commit", (req: Request, res: Response) => {
  const { message } = req.body;
  if (!message) { res.status(400).json({ error: "message required" }); return; }

  const workspace = getWorkspace();
  const safeMsg = sanitizeShellArg(message).slice(0, 200);

  try {
    gitExec(["add", "-A"], workspace);
    const output = gitExec(["commit", "-m", safeMsg], workspace);
    res.json({ success: true, output: output.trim() });
  } catch (err: any) {
    if (err.stderr?.includes("nothing to commit")) {
      res.json({ success: true, output: "nothing to commit" });
    } else {
      res.status(500).json({ error: err.stderr || err.message });
    }
  }
});

router.post("/git/push", (req: Request, res: Response) => {
  const { remote, branch } = req.body;
  const workspace = getWorkspace();
  const r = sanitizeShellArg(remote || "origin");
  const b = sanitizeShellArg(branch || "main");

  try {
    const output = gitExec(["push", r, b], workspace);
    res.json({ success: true, output: output.trim() });
  } catch (err: any) {
    res.status(500).json({ error: err.stderr || err.message });
  }
});

router.get("/git/log", (req: Request, res: Response) => {
  const workspace = getWorkspace();
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);

  try {
    const output = gitExec(["log", `--oneline`, `-${limit}`], workspace);
    const commits = output.trim().split("\n").filter(Boolean).map(line => {
      const spaceIdx = line.indexOf(" ");
      return { hash: line.substring(0, spaceIdx), message: line.substring(spaceIdx + 1) };
    });
    res.json({ commits });
  } catch (err: any) {
    res.json({ commits: [], error: err.stderr || err.message });
  }
});

router.post("/git/remote/add", (req: Request, res: Response) => {
  const { name, url } = req.body;
  if (!name || !url) { res.status(400).json({ error: "name and url required" }); return; }
  const workspace = getWorkspace();
  const safeName = sanitizeShellArg(name);
  const safeUrl = sanitizeShellArg(url);
  try {
    gitExec(["remote", "add", safeName, safeUrl], workspace);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.stderr || err.message });
  }
});

export default router;
