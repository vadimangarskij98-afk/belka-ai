import { Router, type Request, type Response } from "express";
import { spawn, type ChildProcess } from "child_process";
import path from "path";
import os from "os";
import fs from "fs";
import { getWorkspace } from "../lib/workspace-state";

const router = Router();

interface PreviewServer {
  process: ChildProcess;
  port: number;
  logs: string[];
  status: "starting" | "running" | "error" | "stopped";
  startedAt: number;
  command: string;
}

let currentPreview: PreviewServer | null = null;

function detectStartCommand(dir: string): { command: string; args: string[] } | null {
  const pkgPath = path.join(dir, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      if (pkg.scripts?.dev) return { command: "npm", args: ["run", "dev"] };
      if (pkg.scripts?.start) return { command: "npm", args: ["run", "start"] };
    } catch {}
  }
  if (fs.existsSync(path.join(dir, "index.html"))) {
    return { command: "npx", args: ["serve", "-l", "3333"] };
  }
  if (fs.existsSync(path.join(dir, "main.py")) || fs.existsSync(path.join(dir, "app.py"))) {
    const entry = fs.existsSync(path.join(dir, "app.py")) ? "app.py" : "main.py";
    return { command: "python3", args: [entry] };
  }
  return null;
}

router.post("/preview/start", (req: Request, res: Response) => {
  const { command, cwd, port } = req.body;
  const workspace = cwd || getWorkspace();
  const previewPort = port || 3333;

  if (currentPreview && currentPreview.status !== "stopped" && currentPreview.status !== "error") {
    try { currentPreview.process.kill(); } catch {}
  }

  let cmd: string;
  let args: string[];

  if (command) {
    const parts = command.split(" ");
    cmd = parts[0];
    args = parts.slice(1);
  } else {
    const detected = detectStartCommand(workspace);
    if (!detected) {
      res.status(400).json({ error: "Could not detect start command. Specify a command." });
      return;
    }
    cmd = detected.command;
    args = detected.args;
  }

  const fullCommand = `${cmd} ${args.join(" ")}`;

  try {
    const child = spawn(cmd, args, {
      cwd: workspace,
      env: { ...process.env, PORT: String(previewPort), HOME: os.homedir(), TERM: "xterm-256color" },
      shell: true,
      stdio: ["pipe", "pipe", "pipe"],
    });

    const preview: PreviewServer = {
      process: child,
      port: previewPort,
      logs: [],
      status: "starting",
      startedAt: Date.now(),
      command: fullCommand,
    };

    const addLog = (data: Buffer | string) => {
      const lines = data.toString().split("\n").filter(Boolean);
      for (const line of lines) {
        preview.logs.push(line);
        if (preview.logs.length > 500) preview.logs.shift();
        if (line.toLowerCase().includes("listening") || line.toLowerCase().includes("ready") || line.toLowerCase().includes("started")) {
          preview.status = "running";
        }
      }
    };

    child.stdout?.on("data", addLog);
    child.stderr?.on("data", addLog);

    child.on("error", (err) => {
      preview.status = "error";
      preview.logs.push(`[ERROR] ${err.message}`);
    });

    child.on("exit", (code) => {
      if (preview.status !== "error") {
        preview.status = "stopped";
      }
      preview.logs.push(`[EXIT] Process exited with code ${code}`);
    });

    setTimeout(() => {
      if (preview.status === "starting") preview.status = "running";
    }, 5000);

    currentPreview = preview;
    res.json({ success: true, port: previewPort, command: fullCommand, status: "starting" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/preview/stop", (_req: Request, res: Response) => {
  if (!currentPreview) {
    res.json({ success: true, message: "no preview running" });
    return;
  }
  try { currentPreview.process.kill(); } catch {}
  currentPreview.status = "stopped";
  res.json({ success: true });
});

router.get("/preview/status", (_req: Request, res: Response) => {
  if (!currentPreview) {
    res.json({ running: false });
    return;
  }
  const recentLogs = currentPreview.logs.slice(-50);
  res.json({
    running: currentPreview.status === "running" || currentPreview.status === "starting",
    status: currentPreview.status,
    port: currentPreview.port,
    command: currentPreview.command,
    uptime: Date.now() - currentPreview.startedAt,
    logs: recentLogs,
  });
});

export default router;
