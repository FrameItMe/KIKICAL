import { Hono } from "hono";
import { all, get, run, pool } from "../database/db.js";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config.js";
import { getToday } from "../utils/dateTime.js";
import { calculateAge, calculateBMR, calculateTDEE, calculateCalorieTarget, calculateMacros } from "../utils/userCalculations.js";
import { calculateMealStreak } from "../utils/achievements.js";
const userRoute = new Hono();
userRoute.get("/setup-status", async (c) => {
    const authHeader = c.req.header("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
    if (!token)
        return c.json({ need_setup: true });
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        const target = await get(`SELECT id FROM targets WHERE user_id = ?`, [payload.id]);
        return c.json({ need_setup: !target });
    }
    catch (error) {
        console.error(error);
        return c.json({ need_setup: true });
    }
});
userRoute.post("/setup", async (c) => {
    const authHeader = c.req.header("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
    let payload = null;
    if (!token) {
        return c.json({ error: "Not authenticated" }, 401);
    }
    try {
        payload = jwt.verify(token, JWT_SECRET);
    }
    catch (error) {
        return c.json({ error: "Invalid token" }, 401);
    }
    const body = await c.req.json();
    const gender = body.gender;
    const birthdate = body.birthdate || null; // Handle empty string as null
    const height = Number(body.height_cm);
    const weight = Number(body.weight_kg);
    const activity = body.activity_level;
    const goal = body.goal;
    let target_weight = body.target_weight_kg ? Number(body.target_weight_kg) : null;
    // basic validation to avoid silent failures / NaN writes
    if (!gender || !birthdate || !activity || !goal) {
        return c.json({ error: "Missing required fields" }, 400);
    }
    if (!Number.isFinite(height) || height <= 0 || !Number.isFinite(weight) || weight <= 0) {
        return c.json({ error: "Height and weight must be positive numbers" }, 400);
    }
    if (goal !== "maintain" && !target_weight) {
        target_weight = weight;
    }
    // Calculate age
    const age = calculateAge(birthdate);
    if (age === null) {
        return c.json({ error: "Invalid birthdate" }, 400);
    }
    // Calculate BMR
    const BMR = calculateBMR(gender, weight, height, age);
    // Calculate TDEE
    const TDEE = calculateTDEE(BMR, activity);
    // Calculate calorie target
    const calTarget = calculateCalorieTarget(TDEE, goal);
    // Calculate macros
    const baseWeight = target_weight || weight;
    const { protein, fat, carb } = calculateMacros(calTarget, baseWeight);
    await run(`UPDATE users
     SET gender = ?, birthdate = ?, height_cm = ?, weight_kg = ?, activity_level = ?, target_weight_kg = ?
     WHERE id = ?`, [gender, birthdate, height, weight, activity, target_weight, payload.id]);
    const existing = await get("select id from targets where user_id = ?", [payload.id]);
    if (existing) {
        await run(`UPDATE targets
       SET daily_calorie_target=?, daily_protein_target=?, daily_carb_target=?, daily_fat_target=?, target_weight_kg=?, goal=?
       WHERE user_id=?`, [calTarget, protein, carb, fat, target_weight, goal, payload.id]);
    }
    else {
        await run(`INSERT INTO targets (user_id, daily_calorie_target, daily_protein_target, daily_carb_target, daily_fat_target, target_weight_kg, goal)
       VALUES (?, ?, ?, ?, ?, ?, ?)`, [payload.id, calTarget, protein, carb, fat, target_weight, goal]);
    }
    return c.json({
        message: "Setup completed",
        bmr: BMR,
        tdee: TDEE,
        calorie_target: calTarget,
        macros: {
            protein,
            fat,
            carb,
        },
    });
});
// GET /user/dashboard - ดึงข้อมูลสำหรับหน้า dashboard
userRoute.get("/dashboard", async (c) => {
    const token = c.req.header("Authorization") || "";
    if (!token) {
        return c.json({ error: "Not authenticated" }, 401);
    }
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        // ดึงข้อมูล user
        const user = await get(`SELECT name, email FROM users WHERE id = ?`, [payload.id]);
        if (!user) {
            return c.json({ error: "User not found" }, 404);
        }
        // ดึงข้อมูล targets
        const target = await get(`SELECT daily_calorie_target, daily_protein_target, daily_carb_target, daily_fat_target
       FROM targets WHERE user_id = ?`, [payload.id]);
        // ถ้ายังไม่มี target ให้ใช้ค่า default
        const targets = target || {
            daily_calorie_target: 2000,
            daily_protein_target: 150,
            daily_carb_target: 200,
            daily_fat_target: 65,
        };
        // คำนวณ consumed calories จาก meal_log วันนี้
        const today = getToday(); // YYYY-MM-DD in local time
        const meals = await all(`SELECT m.portion_multiplier, f.calories_per_100g, f.protein_per_100g, f.carb_per_100g, f.fat_per_100g
       FROM meal_log m
       JOIN food f ON m.food_id = f.id
       WHERE m.user_id = ? AND m.meal_date = ?`, [payload.id, today]);
        let totalCalories = 0;
        let totalProtein = 0;
        let totalCarbs = 0;
        let totalFat = 0;
        meals.forEach((meal) => {
            const multiplier = meal.portion_multiplier || 1;
            totalCalories += (meal.calories_per_100g || 0) * multiplier;
            totalProtein += (meal.protein_per_100g || 0) * multiplier;
            totalCarbs += (meal.carb_per_100g || 0) * multiplier;
            totalFat += (meal.fat_per_100g || 0) * multiplier;
        });
        // คำนวณ calories burned จาก workouts วันนี้
        const workouts = await all(`SELECT calories_burned
       FROM workouts
       WHERE user_id = ? AND workout_date = ?`, [payload.id, today]);
        console.log("[dashboard] Today:", today, "Workouts found:", workouts.length, "Workouts:", workouts);
        let totalBurned = 0;
        workouts.forEach((w) => {
            totalBurned += w.calories_burned || 0;
        });
        console.log("[dashboard] Total burned:", totalBurned);
        // Calculate remaining: (target - consumed + burned), but never negative
        const netRemaining = targets.daily_calorie_target - totalCalories + totalBurned;
        const remaining = Math.max(0, netRemaining);
        // Insights
        const proteinPct = targets.daily_protein_target > 0
            ? (totalProtein / targets.daily_protein_target) * 100
            : 0;
        const carbPct = targets.daily_carb_target > 0
            ? (totalCarbs / targets.daily_carb_target) * 100
            : 0;
        const fatPct = targets.daily_fat_target > 0
            ? (totalFat / targets.daily_fat_target) * 100
            : 0;
        const streakDays = await calculateMealStreak(payload.id);
        const latestBadge = await get(`SELECT b.name, b.icon_url as icon, ueb.earned_date
       FROM user_earned_badges ueb
       JOIN badges b ON ueb.badge_id = b.id
       WHERE ueb.user_id = ?
       ORDER BY ueb.earned_date DESC, ueb.id DESC
       LIMIT 1`, [payload.id]);
        return c.json({
            username: user.name,
            targets: {
                calories: targets.daily_calorie_target,
                protein: targets.daily_protein_target,
                carbs: targets.daily_carb_target,
                fat: targets.daily_fat_target,
            },
            consumed: {
                calories: totalCalories,
                protein: totalProtein,
                carbs: totalCarbs,
                fat: totalFat,
            },
            burned: totalBurned,
            remaining: remaining,
            insights: {
                protein: {
                    pct: proteinPct,
                    consumed: totalProtein,
                    target: targets.daily_protein_target,
                },
                carbFat: {
                    carbPct,
                    fatPct,
                    carbConsumed: totalCarbs,
                    fatConsumed: totalFat,
                    carbTarget: targets.daily_carb_target,
                    fatTarget: targets.daily_fat_target,
                },
                streakDays,
                latestBadge: latestBadge || null,
            },
        });
    }
    catch (error) {
        console.error(error);
        return c.json({ error: "Internal server error" }, 500);
    }
});
// PATCH /user/profile - Update specific user profile fields
userRoute.patch("/profile", async (c) => {
    const token = c.req.header("Authorization") || "";
    if (!token) {
        return c.json({ error: "Not authenticated" }, 401);
    }
    let payload = null;
    try {
        payload = jwt.verify(token, JWT_SECRET);
    }
    catch (error) {
        return c.json({ error: "Invalid token" }, 401);
    }
    const body = await c.req.json();
    const updates = {};
    const recalculateTargets = body.weight_kg || body.height_cm || body.activity_level || body.goal || body.target_weight_kg || body.birthdate;
    // Allowed fields to update
    if (body.name !== undefined && body.name.trim())
        updates.name = body.name.trim();
    if (body.email !== undefined && body.email.trim())
        updates.email = body.email.trim();
    if (body.gender !== undefined)
        updates.gender = body.gender;
    if (body.birthdate !== undefined)
        updates.birthdate = body.birthdate || null; // Handle empty string
    if (body.height_cm !== undefined) {
        const h = Number(body.height_cm);
        if (!Number.isFinite(h) || h <= 0)
            return c.json({ error: "Invalid height" }, 400);
        updates.height_cm = h;
    }
    if (body.weight_kg !== undefined) {
        const w = Number(body.weight_kg);
        if (!Number.isFinite(w) || w <= 0)
            return c.json({ error: "Invalid weight" }, 400);
        updates.weight_kg = w;
    }
    if (body.activity_level !== undefined)
        updates.activity_level = body.activity_level;
    if (body.target_weight_kg !== undefined)
        updates.target_weight_kg = Number(body.target_weight_kg);
    // Separate target updates (for targets table)
    const targetUpdates = {};
    if (body.goal !== undefined)
        targetUpdates.goal = body.goal;
    try {
        // Update users table
        if (Object.keys(updates).length > 0) {
            const setClause = Object.keys(updates).map(key => `${key} = ?`).join(", ");
            const values = Object.values(updates);
            await run(`UPDATE users SET ${setClause} WHERE id = ?`, [...values, payload.id]);
        }
        // Update targets table directly for target fields
        if (Object.keys(targetUpdates).length > 0) {
            const targetSetClause = Object.keys(targetUpdates).map(key => `${key} = ?`).join(", ");
            const targetValues = Object.values(targetUpdates);
            await run(`UPDATE targets SET ${targetSetClause} WHERE user_id = ?`, [...targetValues, payload.id]);
        }
        // Recalculate targets if needed
        if (recalculateTargets) {
            const user = await get("SELECT gender, birthdate, height_cm, weight_kg, activity_level, target_weight_kg FROM users WHERE id = ?", [payload.id]);
            if (!user)
                return c.json({ error: "User not found or invalid data" }, 404);
            const targets = await get("SELECT goal FROM targets WHERE user_id = ?", [payload.id]);
            const goal = targetUpdates.goal || targets?.goal || "maintain";
            const age = calculateAge(user.birthdate);
            if (age === null)
                return c.json({ error: "Invalid birthdate" }, 400);
            const BMR = calculateBMR(user.gender, user.weight_kg, user.height_cm, age);
            const TDEE = calculateTDEE(BMR, user.activity_level);
            const calTarget = calculateCalorieTarget(TDEE, goal);
            const baseWeight = user.target_weight_kg || user.weight_kg;
            const { protein, fat, carb } = calculateMacros(calTarget, baseWeight);
            const targetExists = await get("SELECT id FROM targets WHERE user_id = ?", [payload.id]);
            if (targetExists) {
                await run(`UPDATE targets
           SET daily_calorie_target = ?, daily_protein_target = ?, daily_carb_target = ?, daily_fat_target = ?, target_weight_kg = ?, goal = ?
           WHERE user_id = ?`, [calTarget, protein, carb, fat, user.target_weight_kg, goal, payload.id]);
            }
        }
        return c.json({ message: "Profile updated successfully" });
    }
    catch (error) {
        console.error("Profile update error:", error);
        return c.json({ error: "Failed to update profile" }, 500);
    }
});
// GET /user/profile - Get full user profile (for edit form)
userRoute.get("/profile", async (c) => {
    const token = c.req.header("Authorization") || "";
    if (!token) {
        return c.json({ error: "Not authenticated" }, 401);
    }
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        const user = await get(`SELECT id, name, email, gender, birthdate, height_cm, weight_kg, activity_level, target_weight_kg
       FROM users WHERE id = ?`, [payload.id]);
        if (!user)
            return c.json({ error: "User not found" }, 404);
        const targets = await get(`SELECT daily_calorie_target, daily_protein_target, daily_carb_target, daily_fat_target, goal
       FROM targets WHERE user_id = ?`, [payload.id]);
        return c.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                gender: user.gender,
                birthdate: user.birthdate,
                height_cm: user.height_cm,
                weight_kg: user.weight_kg,
                activity_level: user.activity_level,
                target_weight_kg: user.target_weight_kg,
            },
            targets: targets || {
                daily_calorie_target: 0,
                daily_protein_target: 0,
                daily_carb_target: 0,
                daily_fat_target: 0,
                goal: "maintain",
            },
        });
    }
    catch (error) {
        console.error(error);
        return c.json({ error: "Internal server error" }, 500);
    }
});
export default userRoute;
