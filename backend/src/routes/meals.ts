import { Hono } from "hono";
import { get, all, run } from "../database/db.js";
import { nowLocalDateTime, getToday } from "../utils/dateTime.js";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config.js";
import { checkBadges, checkChallenges } from "../utils/achievements.js";

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
mealRoute.get("/:userId", async (c) => {
  const user = c.get("user") as { id: number };
  const paramUserId = Number(c.req.param("userId"));
  const date = c.req.query("date");

  if (user.id !== paramUserId) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  if (!date) {
    return c.json({ error: "Date is required" }, 400);
  }

  const meals = await all<any>(
    `SELECT m.id, m.user_id, m.food_id, m.meal_date, m.meal_type, m.portion_multiplier, m.logged_at,
            f.name as food_name, f.calories_per_100g, f.protein_per_100g, f.carb_per_100g, f.fat_per_100g 
     FROM meal_log m 
     JOIN food f ON m.food_id = f.id 
     WHERE m.user_id = ? AND m.meal_date = ?
     ORDER BY m.logged_at DESC`,
    [user.id, date]
  );

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
    const info = await run(
      `INSERT INTO meal_log (user_id, food_id, meal_date, meal_type, portion_multiplier, logged_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user.id, food_id, meal_date, meal_type, portion_multiplier, loggedAt]
    );

    // Check achievements and send them with response
    const badgeUnlocks = await checkBadges(user.id);
    const challengeCompletions = await checkChallenges(user.id);

    return c.json({ 
      id: info.insertId, 
      ...body,
      unlocks: badgeUnlocks,
      challengeUpdates: challengeCompletions
    });
  } catch (error) {
    console.error('Meal logging error:', error);
    return c.json({ error: 'Failed to log meal' }, 500);
  }
});

// DELETE /meals/:id - Delete a meal log
mealRoute.delete("/:id", async (c) => {
  const user = c.get("user") as { id: number };
  const id = c.req.param("id");

  const log = await get<{ user_id: number }>("SELECT user_id FROM meal_log WHERE id = ?", [id]);
  if (!log) return c.json({ error: "Log not found" }, 404);

  if (log.user_id !== user.id) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  await run("DELETE FROM meal_log WHERE id = ?", [id]);

  // Recalculate badges/challenges so progress reflects deletions
  const badgeUnlocks = await checkBadges(user.id);
  const challengeUpdates = await checkChallenges(user.id);
  return c.json({ success: true, unlocks: badgeUnlocks, challengeUpdates });
});

// PUT /meals/:id - Update a meal log (with optional food update)
mealRoute.put("/:id", async (c) => {
  const user = c.get("user") as { id: number };
  const id = c.req.param("id");
  const body = await c.req.json();
  const { meal_type, portion_multiplier, food_id, update_food, name, calories_per_100g, protein_per_100g, carb_per_100g, fat_per_100g } = body as any;

  if (!meal_type || portion_multiplier === undefined) {
    return c.json({ error: "Missing required fields (meal_type, portion_multiplier)" }, 400);
  }

  const log = await get<{ user_id: number; food_id: number }>("SELECT user_id, food_id FROM meal_log WHERE id = ?", [id]);
  if (!log) return c.json({ error: "Log not found" }, 404);

  if (log.user_id !== user.id) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  let nextFoodId = log.food_id;

  // If user requested to update food macros/name
  if (update_food) {
    if (!name || calories_per_100g === undefined || protein_per_100g === undefined || carb_per_100g === undefined || fat_per_100g === undefined) {
      return c.json({ error: "Missing food fields for update" }, 400);
    }

    // Check current food category; if Custom, update in place, otherwise create new
    const currentFood = await get<{ id: number; category: string }>("SELECT id, category FROM food WHERE id = ?", [log.food_id]);

    if (currentFood && currentFood.category === "Custom") {
      await run(
        `UPDATE food
         SET name = ?, calories_per_100g = ?, protein_per_100g = ?, carb_per_100g = ?, fat_per_100g = ?
         WHERE id = ?`,
        [name, calories_per_100g, protein_per_100g, carb_per_100g, fat_per_100g, currentFood.id]
      );
      nextFoodId = currentFood.id;
    } else {
      const info = await run(
        `INSERT INTO food (name, category, calories_per_100g, protein_per_100g, carb_per_100g, fat_per_100g, default_serving_grams)
         VALUES (?, 'Custom', ?, ?, ?, ?, 100)`,
        [name, calories_per_100g, protein_per_100g, carb_per_100g, fat_per_100g]
      );
      nextFoodId = Number(info.insertId);
    }
  } else if (food_id) {
    nextFoodId = food_id;
  }

  await run("UPDATE meal_log SET meal_type = ?, portion_multiplier = ?, food_id = ? WHERE id = ?", 
    [meal_type, portion_multiplier, nextFoodId, id]);

  // Recalculate badges/challenges after meal adjustments
  const badgeUnlocks = await checkBadges(user.id);
  const challengeUpdates = await checkChallenges(user.id);
  return c.json({ success: true, unlocks: badgeUnlocks, challengeUpdates });
});

export default mealRoute;
