import { Hono } from "hono";
import { db } from "../database/db.js";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config.js";

type Variables = {
  user: { id: number };
};

type BadgeRow = {
  id: number;
  name: string;
  description: string | null;
  icon_url: string | null;
  earned: 0 | 1;
  earned_date: string | null;
};

type ChallengeRow = {
  id: number;
  name: string;
  description: string | null;
  type: string | null;
  target_value: number | null;
  unit: string | null;
  current_value: number | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
};

const achievementsRoute = new Hono<{ Variables: Variables }>();

// Auth middleware
achievementsRoute.use("*", async (c, next) => {
  const token = c.req.header("Authorization") || "";
  if (!token) return c.json({ error: "Not authenticated" }, 401);

  try {
    const payload = jwt.verify(token, JWT_SECRET!) as unknown as { id: number };
    c.set("user", payload);
    await next();
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
});

achievementsRoute.get("/", (c) => {
  const user = c.get("user") as { id: number };

  const badges = db
    .prepare(
      `SELECT b.id, b.name, b.description, b.icon_url,
              CASE WHEN ueb.id IS NULL THEN 0 ELSE 1 END as earned,
              ueb.earned_date as earned_date
       FROM badges b
       LEFT JOIN user_earned_badges ueb
         ON ueb.badge_id = b.id AND ueb.user_id = ?
       ORDER BY b.id ASC`
    )
    .all(user.id) as BadgeRow[];

  const challengesRaw = db
    .prepare(
      `SELECT c.id, c.name, c.description, c.type, c.target_value, c.unit,
              ucp.current_value, ucp.status, ucp.start_date, ucp.end_date
       FROM challenges c
       LEFT JOIN user_challenge_progress ucp
         ON ucp.challenge_id = c.id AND ucp.user_id = ?
       ORDER BY c.id ASC`
    )
    .all(user.id) as ChallengeRow[];

  const challenges = challengesRaw.map((c) => {
    const current = c.current_value ?? 0;
    const target = c.target_value ?? 0;
    const progress_pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
    const status = c.status || (progress_pct >= 100 ? "completed" : "not_started");
    return {
      ...c,
      current_value: current,
      target_value: target,
      progress_pct,
      status,
    };
  });

  return c.json({ badges, challenges });
});

export default achievementsRoute;
