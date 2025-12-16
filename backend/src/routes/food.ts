import { Hono } from "hono";
import { get, all, run } from "../database/db.js";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config.js";

type Variables = {
  user: { id: number };
};

const foodRoute = new Hono<{ Variables: Variables }>();

// Middleware to check auth
foodRoute.use("*", async (c, next) => {
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

// GET /food/search?q= - Search foods (in use)
foodRoute.get("/search", async (c) => {
  const query = c.req.query("q");
  if (!query) return c.json([]);

  const q = query.trim();
  const qLower = q.toLowerCase();
  const prefix = `${q}%`;
  const contains = `%${q}%`;

  // Prioritize: exact (case-insensitive) > prefix > contains > others; then shorter names first
  const foods = await all<any>(
    `SELECT * FROM food
     WHERE LOWER(name) LIKE ?
     ORDER BY
       CASE
         WHEN LOWER(name) = ? THEN 0
         WHEN LOWER(name) LIKE ? THEN 1
         ELSE 2
       END,
       LENGTH(name) ASC
     LIMIT 30`,
    [contains, qLower, prefix]
  );
  return c.json(foods);
});

// NOTE: The following CRUD endpoints are currently unused by the frontend.
// They are commented out to reduce surface area; re-enable when a food
// management UI is added.

// GET /food - List all foods (limit 50)
foodRoute.get("/", async (c) => {
  const foods = await all<any>("SELECT * FROM food LIMIT 50", []);
  return c.json(foods);
});

// GET /food/:id - Get single food
foodRoute.get("/:id", async (c) => {
  const id = c.req.param("id");
  const food = await get<any>("SELECT * FROM food WHERE id = ?", [id]);
  if (!food) return c.json({ error: "Food not found" }, 404);
  return c.json(food);
});

// POST /food - Create new food
foodRoute.post("/", async (c) => {
  const user = c.get("user") as { id: number };
  const body = await c.req.json();
  const {
    name,
    category,
    calories_per_100g,
    protein_per_100g,
    carb_per_100g,
    fat_per_100g,
    default_serving_grams,
  } = body;

  if (!name || !calories_per_100g) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  const info = await run(
    `INSERT INTO food (name, category, calories_per_100g, protein_per_100g, carb_per_100g, fat_per_100g, default_serving_grams, created_by_user)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      category || "General",
      calories_per_100g,
      protein_per_100g,
      carb_per_100g,
      fat_per_100g,
      default_serving_grams || 100,
      user.id
    ]
  );

  return c.json({ id: info.insertId, ...body });
});

// PUT /food/:id - Update food (only if created by user)
foodRoute.put("/:id", async (c) => {
  const user = c.get("user") as { id: number };
  const id = c.req.param("id");
  const body = await c.req.json();

  const food = await get<{ created_by_user: number }>("SELECT created_by_user FROM food WHERE id = ?", [id]);
  if (!food) return c.json({ error: "Food not found" }, 404);
  
  // Allow update only if user created it (or maybe admin, but we don't have admin yet)
  if (food.created_by_user !== user.id) {
    return c.json({ error: "Not authorized to update this food" }, 403);
  }

  const {
    name,
    category,
    calories_per_100g,
    protein_per_100g,
    carb_per_100g,
    fat_per_100g,
    default_serving_grams,
  } = body;

  await run(
    `UPDATE food SET name=?, category=?, calories_per_100g=?, protein_per_100g=?, carb_per_100g=?, fat_per_100g=?, default_serving_grams=? WHERE id=?`,
    [
      name,
      category,
      calories_per_100g,
      protein_per_100g,
      carb_per_100g,
      fat_per_100g,
      default_serving_grams,
      id
    ]
  );

  return c.json({ success: true });
});

// DELETE /food/:id - Delete food (only if created by user)
foodRoute.delete("/:id", async (c) => {
  const user = c.get("user") as { id: number };
  const id = c.req.param("id");

  const food = await get<{ created_by_user: number }>("SELECT created_by_user FROM food WHERE id = ?", [id]);
  if (!food) return c.json({ error: "Food not found" }, 404);

  if (food.created_by_user !== user.id) {
    return c.json({ error: "Not authorized to delete this food" }, 403);
  }

  await run("DELETE FROM food WHERE id = ?", [id]);
  return c.json({ success: true });
});

export default foodRoute;
