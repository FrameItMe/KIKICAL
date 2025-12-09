import { Hono } from "hono";
import { db } from "../database/db.js";
import { nowLocalDateTime } from "../utils/time.js";
import { checkBadges, checkChallenges } from "../utils/achievements.js";
import jwt from "jsonwebtoken";

type Variables = {
  user: { id: number };
};

const JWT_SECRET = process.env.JWT_SECRET || "KIKICAL_SECRET_KEY";

const workoutRoute = new Hono<{ Variables: Variables }>();

// Middleware to check auth
workoutRoute.use("*", async (c, next) => {
  const token = c.req.header("Authorization") || "";
  if (!token) return c.json({ error: "Not authenticated" }, 401);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: number };
    c.set("user", payload);
    await next();
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
});

// GET /workouts?date=YYYY-MM-DD - Get workouts for a specific date
workoutRoute.get("/", (c) => {
  const user = c.get("user") as { id: number };
  const date = c.req.query("date");

  if (!date) {
    return c.json({ error: "Date is required" }, 400);
  }

  const workouts = db
    .prepare(
      `SELECT * FROM workouts 
       WHERE user_id = ? AND workout_date = ?
       ORDER BY created_at DESC`
    )
    .all(user.id, date);

  return c.json(workouts);
});

// POST /workouts - Log a workout
workoutRoute.post("/", async (c) => {
  const user = c.get("user") as { id: number };
  const body = await c.req.json();
  const { name, calories_burned, duration_minutes } = body;

  if (!name || !calories_burned) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  const createdAt = nowLocalDateTime(); // precise log time in local YYYY-MM-DD HH:mm:ss
  const workoutDate = new Date().toLocaleDateString('sv-SE'); // local date for daily grouping

  try {
    const info = db
      .prepare(
        `INSERT INTO workouts (user_id, name, calories_burned, duration_minutes, workout_date, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(user.id, name, calories_burned, duration_minutes || 0, workoutDate, createdAt);

    // Check for badge/challenge unlocks (wrapped in try-catch to prevent blocking)
    let unlocks: any[] = [];
    let challengeUpdates: any[] = [];
    
    try {
      unlocks = checkBadges(user.id);
      challengeUpdates = checkChallenges(user.id);
    } catch (achievementError) {
      console.error('Achievement check error:', achievementError);
      // Continue anyway - don't block workout logging
    }

    return c.json({ 
      id: info.lastInsertRowid, 
      ...body,
      unlocks: unlocks || [],
      challengeUpdates: challengeUpdates || []
    });
  } catch (error) {
    console.error('Workout logging error:', error);
    return c.json({ error: 'Failed to log workout' }, 500);
  }
});

// DELETE /workouts/:id - Delete a workout
workoutRoute.delete("/:id", (c) => {
  const user = c.get("user") as { id: number };
  const id = c.req.param("id");

  const workout = db
    .prepare("SELECT user_id FROM workouts WHERE id = ?")
    .get(id) as { user_id: number } | undefined;

  if (!workout) return c.json({ error: "Workout not found" }, 404);

  if (workout.user_id !== user.id) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  db.prepare("DELETE FROM workouts WHERE id = ?").run(id);
  return c.json({ success: true });
});

export default workoutRoute;
