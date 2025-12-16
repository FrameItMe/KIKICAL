import { Hono } from "hono";
import { get, all, run } from "../database/db.js";
import { nowLocalDateTime, getToday } from "../utils/dateTime.js";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config.js";
import { checkBadges, checkChallenges } from "../utils/achievements.js";
const workoutRoute = new Hono();
// Middleware to check auth
workoutRoute.use("*", async (c, next) => {
    const authHeader = c.req.header("Authorization") || "";
    // Support both "Bearer token" and plain "token"
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
    if (!token)
        return c.json({ error: "Not authenticated" }, 401);
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        c.set("user", payload);
        await next();
    }
    catch {
        return c.json({ error: "Invalid token" }, 401);
    }
});
// GET /workouts?date=YYYY-MM-DD - Get workouts for a specific date (MUST be before /:id)
workoutRoute.get("/", async (c) => {
    const user = c.get("user");
    const date = c.req.query("date");
    if (!date) {
        return c.json({ error: "Date is required" }, 400);
    }
    const workouts = await all(`SELECT * FROM workouts 
     WHERE user_id = ? AND workout_date = ?
     ORDER BY created_at DESC`, [user.id, date]);
    return c.json(workouts);
});
// GET /workouts/:id - Get single workout (for editing)
workoutRoute.get("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const workout = await get("SELECT * FROM workouts WHERE id = ?", [id]);
    if (!workout)
        return c.json({ error: "Workout not found" }, 404);
    if (workout.user_id !== user.id)
        return c.json({ error: "Unauthorized" }, 403);
    return c.json(workout);
});
// POST /workouts - Log a workout
workoutRoute.post("/", async (c) => {
    const user = c.get("user");
    const body = await c.req.json();
    const { name, calories_burned, duration_minutes } = body;
    if (!name || !calories_burned) {
        return c.json({ error: "Missing required fields" }, 400);
    }
    const createdAt = nowLocalDateTime(); // precise log time in local YYYY-MM-DD HH:mm:ss
    const workoutDate = getToday(); // local date for daily grouping
    try {
        const info = await run(`INSERT INTO workouts (user_id, name, calories_burned, duration_minutes, workout_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`, [user.id, name, calories_burned, duration_minutes || 0, workoutDate, createdAt]);
        // Check achievements and send them with response
        const badgeUnlocks = await checkBadges(user.id);
        const challengeCompletions = await checkChallenges(user.id);
        return c.json({
            id: info.insertId,
            ...body,
            unlocks: badgeUnlocks,
            challengeUpdates: challengeCompletions
        });
    }
    catch (error) {
        console.error('Workout logging error:', error);
        return c.json({ error: 'Failed to log workout' }, 500);
    }
});
// DELETE /workouts/:id - Delete a workout
workoutRoute.delete("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const workout = await get("SELECT user_id FROM workouts WHERE id = ?", [id]);
    if (!workout)
        return c.json({ error: "Workout not found" }, 404);
    if (workout.user_id !== user.id) {
        return c.json({ error: "Unauthorized" }, 403);
    }
    await run("DELETE FROM workouts WHERE id = ?", [id]);
    return c.json({ success: true });
});
// PUT /workouts/:id - Update a workout
workoutRoute.put("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const body = await c.req.json();
    const { name, calories_burned, duration_minutes } = body;
    if (!name || calories_burned === undefined) {
        return c.json({ error: "Missing required fields (name, calories_burned)" }, 400);
    }
    const workout = await get("SELECT user_id FROM workouts WHERE id = ?", [id]);
    if (!workout)
        return c.json({ error: "Workout not found" }, 404);
    if (workout.user_id !== user.id) {
        return c.json({ error: "Unauthorized" }, 403);
    }
    await run("UPDATE workouts SET name = ?, calories_burned = ?, duration_minutes = ? WHERE id = ?", [name, calories_burned, duration_minutes || 0, id]);
    return c.json({ success: true });
});
export default workoutRoute;
