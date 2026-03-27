import { Router, type IRouter, type Request } from "express";
import { db, repositoriesTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getSessionUserId } from "../lib/auth-session";
import { decryptSecret } from "../lib/secrets";

const router: IRouter = Router();

async function getGithubTokenForRequest(req: Request): Promise<string | null> {
  const userId = getSessionUserId(req);
  if (!userId) {
    return null;
  }

  const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  return decryptSecret(users[0]?.githubToken);
}

router.get("/", async (req, res) => {
  try {
    const repos = await db.select().from(repositoriesTable);
    res.json({
      repositories: repos.map(r => ({
        id: String(r.id),
        name: r.name,
        fullName: r.fullName,
        description: r.description,
        url: r.url,
        branch: r.branch,
        isLocal: r.isLocal === "true",
        localPath: r.localPath,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "List repos error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { fullName, branch, isLocal, localPath } = req.body;
    const [owner, name] = fullName.split("/");
    const url = isLocal ? localPath : `https://github.com/${fullName}`;

    const inserted = await db.insert(repositoriesTable).values({
      name: name || fullName,
      fullName,
      url,
      branch: branch || "main",
      isLocal: isLocal ? "true" : "false",
      localPath,
    }).returning();

    const r = inserted[0];
    res.status(201).json({
      id: String(r.id),
      name: r.name,
      fullName: r.fullName,
      description: r.description,
      url: r.url,
      branch: r.branch,
      isLocal: r.isLocal === "true",
      localPath: r.localPath,
      createdAt: r.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Add repo error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id/files", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const path = req.query.path as string || "";
    const repos = await db.select().from(repositoriesTable).where(eq(repositoriesTable.id, id)).limit(1);
    if (repos.length === 0) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const repo = repos[0];
    const [owner, name] = repo.fullName.split("/");

    if (repo.isLocal === "true") {
      res.json({ files: [] });
      return;
    }

    const githubToken = await getGithubTokenForRequest(req);
    if (!githubToken) {
      res.status(401).json({ error: "GitHub not connected" });
      return;
    }

    const apiUrl = `https://api.github.com/repos/${owner}/${name}/contents/${path}`;
    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      res.json({ files: [] });
      return;
    }

    const data = await response.json() as any[];
    res.json({
      files: (Array.isArray(data) ? data : [data]).map((f: any) => ({
        name: f.name,
        path: f.path,
        type: f.type === "dir" ? "directory" : "file",
        size: f.size,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Get files error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
