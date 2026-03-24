import { Router, type IRouter } from "express";
import { execFile } from "child_process";
import { writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { tmpdir } from "os";
import jwt from "jsonwebtoken";

const router: IRouter = Router();

const TIMEOUT_MS = 10000;
const MAX_OUTPUT = 50000;
const JWT_SECRET = process.env.JWT_SECRET || "belka-ai-secret-key-2024";

const SAFE_ENV: Record<string, string> = {
  PATH: "/usr/bin:/bin:/usr/local/bin",
  HOME: tmpdir(),
  TMPDIR: tmpdir(),
  NODE_OPTIONS: "--max-old-space-size=128",
  NODE_ENV: "sandbox",
};

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + "\n...[truncated]" : str;
}

function requireAuth(req: any, res: any, next: any): void {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

async function runInSandbox(
  cmd: string,
  args: string[],
  filePath: string
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const proc = execFile(
      cmd,
      [...args, filePath],
      {
        timeout: TIMEOUT_MS,
        maxBuffer: MAX_OUTPUT * 2,
        cwd: tmpdir(),
        env: SAFE_ENV,
      },
      (error, stdout, stderr) => {
        resolve({
          stdout: truncate(stdout || "", MAX_OUTPUT),
          stderr: truncate(stderr || "", MAX_OUTPUT),
          exitCode: error ? (error as any).code ?? 1 : 0,
        });
      }
    );

    setTimeout(() => {
      try { proc.kill("SIGKILL"); } catch {}
    }, TIMEOUT_MS + 500);
  });
}

router.post("/run", requireAuth, async (req, res) => {
  try {
    const { code, language } = req.body;
    if (!code || typeof code !== "string") {
      res.status(400).json({ error: "Code is required" });
      return;
    }

    if (code.length > 100000) {
      res.status(400).json({ error: "Code too large (max 100KB)" });
      return;
    }

    const lang = (language || "javascript").toLowerCase();
    const sandboxDir = join(tmpdir(), "belka-sandbox");
    await mkdir(sandboxDir, { recursive: true });

    let ext: string;
    let cmd: string;
    let args: string[];

    switch (lang) {
      case "javascript":
      case "js":
      case "node":
        ext = ".mjs";
        cmd = "node";
        args = ["--no-warnings"];
        break;
      case "typescript":
      case "ts":
        ext = ".ts";
        cmd = "npx";
        args = ["tsx"];
        break;
      case "python":
      case "py":
        ext = ".py";
        cmd = "python3";
        args = [];
        break;
      default:
        ext = ".mjs";
        cmd = "node";
        args = ["--no-warnings"];
    }

    const filename = `run_${randomUUID()}${ext}`;
    const filePath = join(sandboxDir, filename);

    try {
      await writeFile(filePath, code, "utf-8");
      const result = await runInSandbox(cmd, args, filePath);
      res.json({
        output: result.stdout,
        error: result.stderr,
        exitCode: result.exitCode,
        language: lang,
      });
    } finally {
      try { await unlink(filePath); } catch {}
    }
  } catch (err: any) {
    res.status(500).json({
      error: err.message || "Code execution failed",
      output: "",
      exitCode: 1,
    });
  }
});

router.post("/preview", async (req, res) => {
  try {
    const { html, css, js } = req.body;
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>${css || ""}</style>
</head>
<body>
${html || ""}
<script>${js || ""}<\/script>
</body>
</html>`;
    res.json({ html: fullHtml });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Preview generation failed" });
  }
});

export default router;
