import { Hono } from "hono";
import { db } from "../database/db.js";
import { nowLocalDateTime, getToday } from "../utils/dateTime.js";
import { checkBadges, checkChallenges } from "../utils/achievements.js";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config.js";

type Variables = {
  user: { id: number };
};

const mealRoute = new Hono<{ Variables: Variables }>();

// Middleware to check auth
mealRoute.use("*", async (c, next) => {
  const authHeader = c.req.header("Authorization") || "";
  // Support both "Bearer token" and plain "token"
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  if (!token) return c.json({ error: "Not authenticated" }, 401);

  try {
    const payload = jwt.verify(token, JWT_SECRET!) as unknown as { id: number };
    c.set("user", payload);
    await next();
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
});

// GET /meals/:userId?date=YYYY-MM-DD
mealRoute.get("/:userId", (c) => {
  const user = c.get("user") as { id: number };
  const paramUserId = Number(c.req.param("userId"));
  const date = c.req.query("date");

  if (user.id !== paramUserId) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  if (!date) {
    return c.json({ error: "Date is required" }, 400);
  }

  const meals = db
    .prepare(
      `SELECT m.*, f.name as food_name, f.calories_per_100g, f.protein_per_100g, f.carb_per_100g, f.fat_per_100g 
       FROM meal_log m 
       JOIN food f ON m.food_id = f.id 
       WHERE m.user_id = ? AND m.meal_date = ?`
    )
    .all(user.id, date);

  return c.json(meals);
});

// POST /meals - Log a meal
mealRoute.post("/", async (c) => {
  const user = c.get("user") as { id: number };
  const body = await c.req.json();
  const { food_id, meal_date, meal_type, portion_multiplier } = body;

  if (!food_id || !meal_date || !meal_type || !portion_multiplier) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  const loggedAt = nowLocalDateTime(); // capture precise log time in local YYYY-MM-DD HH:mm:ss

  try {
    const info = db
      .prepare(
        `INSERT INTO meal_log (user_id, food_id, meal_date, meal_type, portion_multiplier, logged_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(user.id, food_id, meal_date, meal_type, portion_multiplier, loggedAt);

    // Check for badge/challenge unlocks (wrapped in try-catch to prevent blocking)
    let unlocks: any[] = [];
    let challengeUpdates: any[] = [];
    
    try {
      unlocks = checkBadges(user.id);
      challengeUpdates = checkChallenges(user.id);
    } catch (achievementError) {
      console.error('Achievement check error:', achievementError);
      // Continue anyway - don't block meal logging
    }

    return c.json({ 
      id: info.lastInsertRowid, 
      ...body,
      unlocks: unlocks || [],
      challengeUpdates: challengeUpdates || []
    });
  } catch (error) {
    console.error('Meal logging error:', error);
    return c.json({ error: 'Failed to log meal' }, 500);
  }
});

// DELETE /meals/:id - Delete a meal log
mealRoute.delete("/:id", (c) => {
  const user = c.get("user") as { id: number };
  const id = c.req.param("id");

  const log = db.prepare("SELECT user_id FROM meal_log WHERE id = ?").get(id) as { user_id: number };
  if (!log) return c.json({ error: "Log not found" }, 404);

  if (log.user_id !== user.id) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  db.prepare("DELETE FROM meal_log WHERE id = ?").run(id);
  return c.json({ success: true });
});

// PUT /meals/:id - Update a meal log
mealRoute.put("/:id", async (c) => {
  const user = c.get("user") as { id: number };
  const id = c.req.param("id");
  const body = await c.req.json();
  const { meal_type, portion_multiplier } = body;

  if (!meal_type || portion_multiplier === undefined) {
    return c.json({ error: "Missing required fields (meal_type, portion_multiplier)" }, 400);
  }

  const log = db.prepare("SELECT user_id FROM meal_log WHERE id = ?").get(id) as { user_id: number } | undefined;
  if (!log) return c.json({ error: "Log not found" }, 404);

  if (log.user_id !== user.id) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  db.prepare("UPDATE meal_log SET meal_type = ?, portion_multiplier = ? WHERE id = ?")
    .run(meal_type, portion_multiplier, id);

  return c.json({ success: true });
});

export default mealRoute;
