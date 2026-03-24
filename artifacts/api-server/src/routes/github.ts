import { Router, type IRouter, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || "belka-ai-secret-key-2024";
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "";
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || "";

function getUserId(req: Request): number | null {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
    return decoded.id;
  } catch {
    return null;
  }
}

router.get("/auth/url", (req, res) => {
  if (!GITHUB_CLIENT_ID) {
    res.status(500).json({ error: "GitHub OAuth not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET." });
    return;
  }
  const scope = "repo,read:user,user:email";
  const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=${scope}&state=${Math.random().toString(36).slice(2)}`;
  res.json({ url });
});

router.post("/auth/callback", async (req, res) => {
  const { code } = req.body;
  const userId = getUserId(req);

  if (!code) {
    res.status(400).json({ error: "Code is required" });
    return;
  }

  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    res.status(500).json({ error: "GitHub OAuth not configured" });
    return;
  }

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, client_secret: GITHUB_CLIENT_SECRET, code }),
    });

    const tokenData = await tokenRes.json() as { access_token?: string; error?: string };

    if (!tokenData.access_token) {
      res.status(400).json({ error: tokenData.error || "Failed to get access token" });
      return;
    }

    const ghToken = tokenData.access_token;

    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${ghToken}`, Accept: "application/vnd.github.v3+json" },
    });
    const ghUser = await userRes.json() as { login?: string; name?: string; avatar_url?: string };

    if (userId) {
      await db.update(usersTable)
        .set({ githubToken: ghToken, githubUsername: ghUser.login || "" })
        .where(eq(usersTable.id, userId));
    }

    res.json({ success: true, username: ghUser.login, avatar: ghUser.avatar_url, token: ghToken });
  } catch (err) {
    req.log.error({ err }, "GitHub OAuth callback error");
    res.status(500).json({ error: "OAuth exchange failed" });
  }
});

router.get("/status", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    res.json({ connected: false });
    return;
  }
  try {
    const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!users[0]?.githubToken) {
      res.json({ connected: false });
      return;
    }
    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${users[0].githubToken}`, Accept: "application/vnd.github.v3+json" },
    });
    if (!userRes.ok) {
      res.json({ connected: false });
      return;
    }
    const ghUser = await userRes.json() as { login?: string; avatar_url?: string };
    res.json({ connected: true, username: ghUser.login, avatar: ghUser.avatar_url });
  } catch {
    res.json({ connected: false });
  }
});

router.delete("/disconnect", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  await db.update(usersTable).set({ githubToken: null, githubUsername: null }).where(eq(usersTable.id, userId));
  res.json({ success: true });
});

async function getGhToken(userId: number | null): Promise<string | null> {
  if (!userId) return process.env.GITHUB_TOKEN || null;
  const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  return users[0]?.githubToken || process.env.GITHUB_TOKEN || null;
}

router.get("/repos", async (req, res) => {
  const userId = getUserId(req);
  const token = await getGhToken(userId);
  if (!token) { res.status(401).json({ error: "GitHub not connected" }); return; }

  try {
    const page = req.query.page || 1;
    const response = await fetch(`https://api.github.com/user/repos?sort=updated&per_page=50&page=${page}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" },
    });
    if (!response.ok) { res.status(response.status).json({ error: "GitHub API error" }); return; }
    const data = await response.json() as any[];
    res.json({
      repos: data.map((r: any) => ({
        id: String(r.id),
        name: r.name,
        fullName: r.full_name,
        description: r.description,
        url: r.html_url,
        cloneUrl: r.clone_url,
        branch: r.default_branch,
        private: r.private,
        language: r.language,
        updatedAt: r.updated_at,
        stars: r.stargazers_count,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "List repos error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/repos/:owner/:repo/contents", async (req, res) => {
  const userId = getUserId(req);
  const token = await getGhToken(userId);
  if (!token) { res.status(401).json({ error: "GitHub not connected" }); return; }

  const { owner, repo } = req.params;
  const path = (req.query.path as string) || "";
  const branch = (req.query.branch as string) || "main";

  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" },
    });
    if (!response.ok) { res.status(response.status).json({ error: "Path not found" }); return; }
    const data = await response.json() as any;
    const items = Array.isArray(data) ? data : [data];
    res.json({
      files: items.map((f: any) => ({
        name: f.name,
        path: f.path,
        type: f.type === "dir" ? "directory" : "file",
        size: f.size || 0,
        sha: f.sha,
        downloadUrl: f.download_url,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Get contents error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/repos/:owner/:repo/file", async (req, res) => {
  const userId = getUserId(req);
  const token = await getGhToken(userId);
  if (!token) { res.status(401).json({ error: "GitHub not connected" }); return; }

  const { owner, repo } = req.params;
  const path = req.query.path as string;
  const branch = (req.query.branch as string) || "main";

  if (!path) { res.status(400).json({ error: "path required" }); return; }

  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" },
    });
    if (!response.ok) { res.status(response.status).json({ error: "File not found" }); return; }
    const data = await response.json() as { content?: string; encoding?: string; sha?: string; name?: string };
    const content = data.encoding === "base64" && data.content
      ? Buffer.from(data.content, "base64").toString("utf-8")
      : "";
    res.json({ content, sha: data.sha, name: data.name, path });
  } catch (err) {
    req.log.error({ err }, "Get file error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/repos/:owner/:repo/file", async (req, res) => {
  const userId = getUserId(req);
  const token = await getGhToken(userId);
  if (!token) { res.status(401).json({ error: "GitHub not connected" }); return; }

  const { owner, repo } = req.params;
  const { path, content, message, sha, branch } = req.body;

  if (!path || content === undefined) { res.status(400).json({ error: "path and content required" }); return; }

  try {
    const encodedContent = Buffer.from(content, "utf-8").toString("base64");
    const body: any = {
      message: message || `Update ${path} via BELKA AI`,
      content: encodedContent,
      branch: branch || "main",
    };
    if (sha) body.sha = sha;

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json() as any;
    if (!response.ok) {
      res.status(response.status).json({ error: data.message || "GitHub API error" });
      return;
    }
    res.json({ success: true, sha: data.content?.sha, url: data.content?.html_url });
  } catch (err) {
    req.log.error({ err }, "Update file error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/repos/:owner/:repo/file", async (req, res) => {
  const userId = getUserId(req);
  const token = await getGhToken(userId);
  if (!token) { res.status(401).json({ error: "GitHub not connected" }); return; }

  const { owner, repo } = req.params;
  const { path, sha, message, branch } = req.body;

  if (!path || !sha) { res.status(400).json({ error: "path and sha required" }); return; }

  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: message || `Delete ${path} via BELKA AI`,
        sha,
        branch: branch || "main",
      }),
    });

    if (!response.ok) {
      const data = await response.json() as any;
      res.status(response.status).json({ error: data.message || "GitHub API error" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Delete file error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/repos/:owner/:repo/create", async (req, res) => {
  const userId = getUserId(req);
  const token = await getGhToken(userId);
  if (!token) { res.status(401).json({ error: "GitHub not connected" }); return; }

  const { owner, repo } = req.params;
  const { name, description, isPrivate } = req.body;

  try {
    const response = await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: name || repo,
        description: description || "Created with BELKA AI",
        private: isPrivate || false,
        auto_init: true,
      }),
    });

    const data = await response.json() as any;
    if (!response.ok) {
      res.status(response.status).json({ error: data.message || "GitHub API error" });
      return;
    }
    res.json({
      success: true,
      repo: { fullName: data.full_name, url: data.html_url, cloneUrl: data.clone_url, branch: data.default_branch },
    });
  } catch (err) {
    req.log.error({ err }, "Create repo error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/repos/:owner/:repo/push", async (req, res) => {
  const userId = getUserId(req);
  const token = await getGhToken(userId);
  if (!token) { res.status(401).json({ error: "GitHub not connected" }); return; }

  const { owner, repo } = req.params;
  const { files, message, branch } = req.body as {
    files: { path: string; content: string; sha?: string }[];
    message: string;
    branch?: string;
  };

  if (!files?.length) { res.status(400).json({ error: "files array required" }); return; }

  const targetBranch = branch || "main";
  const commitMessage = message || "Push files via BELKA AI";
  const results: { path: string; success: boolean; sha?: string; error?: string }[] = [];

  for (const file of files) {
    try {
      let sha = file.sha;
      if (!sha) {
        const existingRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}?ref=${targetBranch}`,
          { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" } }
        );
        if (existingRes.ok) {
          const existing = await existingRes.json() as { sha?: string };
          sha = existing.sha;
        }
      }

      const body: any = {
        message: commitMessage,
        content: Buffer.from(file.content, "utf-8").toString("base64"),
        branch: targetBranch,
      };
      if (sha) body.sha = sha;

      const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const putData = await putRes.json() as any;
      if (putRes.ok) {
        results.push({ path: file.path, success: true, sha: putData.content?.sha });
      } else {
        results.push({ path: file.path, success: false, error: putData.message });
      }
    } catch (err) {
      results.push({ path: file.path, success: false, error: String(err) });
    }
  }

  const allOk = results.every(r => r.success);
  res.status(allOk ? 200 : 207).json({ success: allOk, results });
});

router.get("/repos/:owner/:repo/branches", async (req, res) => {
  const userId = getUserId(req);
  const token = await getGhToken(userId);
  if (!token) { res.status(401).json({ error: "GitHub not connected" }); return; }

  const { owner, repo } = req.params;
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" },
    });
    const data = await response.json() as any[];
    res.json({ branches: data.map((b: any) => b.name) });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
