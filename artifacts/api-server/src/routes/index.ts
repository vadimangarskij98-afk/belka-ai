import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

declare module "express" {
  interface Request {
    userId?: number;
  }
}
import healthRouter from "./health";
import conversationsRouter from "./conversations";
import agentsRouter from "./agents";
import adminRouter from "./admin";
import voiceRouter from "./voice";
import mcpRouter from "./mcp";
import memoryRouter from "./memory";
import repositoriesRouter from "./repositories";
import searchRouter from "./search";
import githubRouter from "./github";
import uploadsRouter from "./uploads";
import codeRunnerRouter from "./code-runner";
import sharedRouter from "./shared";
import subscriptionsRouter from "./subscriptions";
import workspaceRouter from "./workspace";
import terminalRouter from "./terminal";
import gitRouter from "./git";
import previewRouter from "./preview";
import referralsRouter from "./referrals";
import { BELKA_CODER_API_BASE_URL, ENABLE_PROJECT_TOOLS, normalizeBelkaMode } from "../config";

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = req.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  req.userId = userId;
  next();
}

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = req.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (users.length === 0 || users[0].role !== "admin") {
    res.status(403).json({ error: "Forbidden: admin access required" }); return;
  }
  req.userId = userId;
  next();
}

function requireProjectToolsEnabled(_req: Request, res: Response, next: NextFunction) {
  if (!ENABLE_PROJECT_TOOLS) {
    res.status(403).json({ error: "Project execution tools are disabled on this deployment" });
    return;
  }

  next();
}

const router: IRouter = Router();

async function readJsonSafely(response: globalThis.Response): Promise<unknown> {
  const raw = await response.text();
  if (!raw.trim()) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return { error: raw.trim() };
  }
}

async function fetchBelkaChat(payload: unknown) {
  const requestInit: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120000),
  };

  let response = await fetch(`${BELKA_CODER_API_BASE_URL}/chat`, requestInit);
  if (response.status === 503) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    response = await fetch(`${BELKA_CODER_API_BASE_URL}/chat`, requestInit);
  }

  return response;
}

router.use(healthRouter);
router.use("/conversations", requireAuth, conversationsRouter);
router.use("/agents", requireAdmin, agentsRouter);
router.use("/admin", requireAdmin, adminRouter);
router.use("/voice", requireAuth, voiceRouter);
router.use("/mcp", requireAdmin, requireProjectToolsEnabled, mcpRouter);
router.use("/memory", requireAuth, memoryRouter);
router.use("/repositories", requireAdmin, requireProjectToolsEnabled, repositoriesRouter);
router.use("/search", requireAuth, searchRouter);
router.use("/github", requireAuth, githubRouter);
router.use("/uploads", requireAuth, uploadsRouter);
router.use("/code", requireAdmin, requireProjectToolsEnabled, codeRunnerRouter);
router.use("/subscriptions", subscriptionsRouter);
router.use("/referrals", referralsRouter);

router.post("/belka/chat", requireAuth, async (req: Request, res: Response) => {
  try {
    const normalizedMode = normalizeBelkaMode(req.body?.mode);
    const payload = {
      ...req.body,
      mode: normalizedMode,
      message: req.body?.message ?? req.body?.content ?? "",
      conversation_id: req.body?.conversation_id ?? req.body?.conversationId,
      system_prompt: req.body?.system_prompt ?? req.body?.systemPrompt,
    };

    const response = await fetchBelkaChat(payload);
    const data = await readJsonSafely(response);
    if (!response.ok) { res.status(response.status).json(data); return; }
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "belka-coder-api unavailable" });
  }
});

router.use("/", sharedRouter);
router.use(requireAdmin, requireProjectToolsEnabled, workspaceRouter);
router.use(requireAdmin, requireProjectToolsEnabled, terminalRouter);
router.use(requireAdmin, requireProjectToolsEnabled, gitRouter);
router.use(requireAdmin, requireProjectToolsEnabled, previewRouter);

export default router;
