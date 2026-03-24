import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import healthRouter from "./health";
import authRouter from "./auth";
import conversationsRouter from "./conversations";
import agentsRouter from "./agents";
import adminRouter from "./admin";
import voiceRouter from "./voice";
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

const JWT_SECRET = process.env.JWT_SECRET || "belka-ai-secret-key-2024";

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
    const users = await db.select().from(usersTable).where(eq(usersTable.id, decoded.id)).limit(1);
    if (users.length === 0 || users[0].role !== "admin") {
      res.status(403).json({ error: "Forbidden: admin access required" }); return;
    }
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/conversations", conversationsRouter);
router.use("/agents", agentsRouter);
router.use("/admin", requireAdmin, adminRouter);
router.use("/voice", voiceRouter);
router.use("/memory", memoryRouter);
router.use("/repositories", repositoriesRouter);
router.use("/search", searchRouter);
router.use("/github", githubRouter);
router.use("/uploads", uploadsRouter);
router.use("/code", codeRunnerRouter);
router.use("/subscriptions", subscriptionsRouter);
router.use(workspaceRouter);
router.use(terminalRouter);
router.use(gitRouter);
router.use(previewRouter);

router.post("/belka/chat", async (req: Request, res: Response) => {
  try {
    const response = await fetch("https://belka-coder-api-production.up.railway.app/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(120000),
    });
    const data = await response.json();
    if (!response.ok) { res.status(response.status).json(data); return; }
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "belka-coder-api unavailable" });
  }
});

router.use("/", sharedRouter);

export default router;
