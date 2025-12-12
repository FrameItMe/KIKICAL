import { Hono } from "hono";
import { db } from "../database/db.js";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config.js";

type Variables = {
  user: { id: number };
};

const foodRoute = new Hono<{ Variables: Variables }>();

// Middleware to check auth
foodRoute.use("*", async (c, next) => {
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

// GET /food/search?q= - Search foods (in use)
foodRoute.get("/search", (c) => {
  const query = c.req.query("q");
  if (!query) return c.json([]);

  const q = query.trim();
  const qLower = q.toLowerCase();
  const prefix = `${q}%`;
  const contains = `%${q}%`;

  // Prioritize: exact (case-insensitive) > prefix > contains > others; then shorter names first
  const foods = db
    .prepare(
      `SELECT * FROM food
       WHERE LOWER(name) LIKE ?
       ORDER BY
         CASE
           WHEN LOWER(name) = ? THEN 0
           WHEN LOWER(name) LIKE ? THEN 1
           ELSE 2
         END,
         LENGTH(name) ASC
       LIMIT 30`
    )
    .all(contains, qLower, prefix);
  return c.json(foods);
});

// NOTE: The following CRUD endpoints are currently unused by the frontend.
// They are commented out to reduce surface area; re-enable when a food
// management UI is added.

// // GET /food - List all foods (limit 50)
// foodRoute.get("/", (c) => {
//   const foods = db.prepare("SELECT * FROM food LIMIT 50").all();
//   return c.json(foods);
// });

// // GET /food/:id - Get single food
// foodRoute.get("/:id", (c) => {
//   const id = c.req.param("id");
//   const food = db.prepare("SELECT * FROM food WHERE id = ?").get(id);
//   if (!food) return c.json({ error: "Food not found" }, 404);
//   return c.json(food);
// });

// // POST /food - Create new food
// foodRoute.post("/", async (c) => {
//   const user = c.get("user") as { id: number };
//   const body = await c.req.json();
//   const {
//     name,
//     category,
//     calories_per_100g,
//     protein_per_100g,
//     carb_per_100g,
//     fat_per_100g,
//     default_serving_grams,
//   } = body;

//   if (!name || !calories_per_100g) {
//     return c.json({ error: "Missing required fields" }, 400);
//   }

//   const info = db
//     .prepare(
//       `INSERT INTO food (name, category, calories_per_100g, protein_per_100g, carb_per_100g, fat_per_100g, default_serving_grams, created_by_user)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
//     )
//     .run(
//       name,
//       category || "General",
//       calories_per_100g,
//       protein_per_100g,
//       carb_per_100g,
//       fat_per_100g,
//       default_serving_grams || 100,
//       user.id
//     );

//   return c.json({ id: info.lastInsertRowid, ...body });
// });

// // PUT /food/:id - Update food (only if created by user)
// foodRoute.put("/:id", async (c) => {
//   const user = c.get("user") as { id: number };
//   const id = c.req.param("id");
//   const body = await c.req.json();

//   const food = db.prepare("SELECT created_by_user FROM food WHERE id = ?").get(id) as { created_by_user: number };
//   if (!food) return c.json({ error: "Food not found" }, 404);
//   
//   // Allow update only if user created it (or maybe admin, but we don't have admin yet)
//   if (food.created_by_user !== user.id) {
//     return c.json({ error: "Not authorized to update this food" }, 403);
//   }

//   const {
//     name,
//     category,
//     calories_per_100g,
//     protein_per_100g,
//     carb_per_100g,
//     fat_per_100g,
//     default_serving_grams,
//   } = body;

//   db.prepare(
//     `UPDATE food SET name=?, category=?, calories_per_100g=?, protein_per_100g=?, carb_per_100g=?, fat_per_100g=?, default_serving_grams=? WHERE id=?`
//   ).run(
//     name,
//     category,
//     calories_per_100g,
//     protein_per_100g,
//     carb_per_100g,
//     fat_per_100g,
//     default_serving_grams,
//     id
//   );

//   return c.json({ success: true });
// });

// // DELETE /food/:id - Delete food (only if created by user)
// foodRoute.delete("/:id", (c) => {
//   const user = c.get("user") as { id: number };
//   const id = c.req.param("id");

//   const food = db.prepare("SELECT created_by_user FROM food WHERE id = ?").get(id) as { created_by_user: number };
//   if (!food) return c.json({ error: "Food not found" }, 404);

//   if (food.created_by_user !== user.id) {
//     return c.json({ error: "Not authorized to delete this food" }, 403);
//   }

//   db.prepare("DELETE FROM food WHERE id = ?").run(id);
//   return c.json({ success: true });
// });

export default foodRoute;
