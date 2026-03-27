import crypto from "crypto";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config";

export const AUTH_COOKIE_NAME = "belka_session";
export const CSRF_COOKIE_NAME = "belka_csrf";
export const GITHUB_OAUTH_STATE_COOKIE_NAME = "belka_github_state";
const AUTH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

type SessionPayload = {
  id: number;
};

function getCookieSameSite(): "lax" | "none" {
  return IS_PRODUCTION ? "none" : "lax";
}

function buildCookieOptions(httpOnly: boolean) {
  return {
    httpOnly,
    secure: IS_PRODUCTION,
    sameSite: getCookieSameSite(),
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
    path: "/",
  } as const;
}

function randomToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function signAuthToken(userId: number): string {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "30d" });
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, buildCookieOptions(true));
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, buildCookieOptions(true));
}

export function setCsrfCookie(res: Response, token: string = randomToken()): string {
  res.cookie(CSRF_COOKIE_NAME, token, buildCookieOptions(false));
  return token;
}

export function getCsrfToken(req: Request): string | null {
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  return typeof cookieToken === "string" && cookieToken.trim() ? cookieToken.trim() : null;
}

export function hasValidCsrfToken(req: Request): boolean {
  const cookieToken = getCsrfToken(req);
  const headerToken = req.headers["x-csrf-token"];
  const normalizedHeader = Array.isArray(headerToken) ? headerToken[0] : headerToken;
  return Boolean(cookieToken && normalizedHeader && cookieToken === normalizedHeader);
}

export function clearCsrfCookie(res: Response): void {
  res.clearCookie(CSRF_COOKIE_NAME, buildCookieOptions(false));
}

export function setGithubOauthStateCookie(res: Response, token: string = randomToken()): string {
  res.cookie(GITHUB_OAUTH_STATE_COOKIE_NAME, token, buildCookieOptions(true));
  return token;
}

export function getGithubOauthState(req: Request): string | null {
  const cookieToken = req.cookies?.[GITHUB_OAUTH_STATE_COOKIE_NAME];
  return typeof cookieToken === "string" && cookieToken.trim() ? cookieToken.trim() : null;
}

export function clearGithubOauthStateCookie(res: Response): void {
  res.clearCookie(GITHUB_OAUTH_STATE_COOKIE_NAME, buildCookieOptions(true));
}

export function getAuthTokenFromRequest(req: Request): string | null {
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
  return typeof cookieToken === "string" && cookieToken.trim() ? cookieToken.trim() : null;
}

export function getSessionUserId(req: Request): number | null {
  try {
    const token = getAuthTokenFromRequest(req);
    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET) as SessionPayload;
    return decoded.id;
  } catch {
    return null;
  }
}
