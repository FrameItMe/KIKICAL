import { Hono } from "hono";
import { db } from "../database/db.js";
import jwt from "jsonwebtoken";
import 'dotenv/config';

const JWT_SECRET = process.env.JWT_SECRET || 
                   process.env.jwt_secret || 
                   "This_IS_MY_KIKICAL_SECRET_KEY_MUHAHA";

const userRoute = new Hono();

userRoute.get("/setup-status", async (c) => {
  const token = c.req.header("Authorization") || "";
  if (!token) return c.json({ need_setup: true });

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: number };

    const target = db.prepare(`
      SELECT id FROM targets WHERE user_id = ?
    `).get(payload.id);

    return c.json({ need_setup: !target });
  } catch (error) {
    console.error(error);
    return c.json({ need_setup: true });
  }
});



userRoute.post("/setup", async (c) => {
  const token = c.req.header("Authorization") || "";
  let payload: { id: number } | null = null;
  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  try {
    payload = jwt.verify(token, JWT_SECRET) as { id: number };
  } catch (error) {
    return c.json({ error: "Invalid token" }, 401);
  }

  const body = await c.req.json();
  
  const gender = body.gender;
  const birthdate = body.birthdate;
  const height = Number(body.height_cm);
  const weight = Number(body.weight_kg);
  const activity = body.activity_level;
  const goal = body.goal as "lose" | "maintain" | "gain";
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


  //calculate Age
  const birth = new Date(birthdate);
  if (isNaN(birth.getTime())) {
    return c.json({ error: "Invalid birthdate" }, 400);
  }
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  //calculate BMR
  let BMR;
  if (gender === "male") {
    BMR = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    BMR = 10 * weight + 6.25 * height - 5 * age - 161;
  }

  //TDEE multiplier
  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };

  const mult = activityMultipliers[activity] ?? 1.2;
  const TDEE = BMR * mult;

  //calculate calorie target
  let calTarget = TDEE;
  if (goal === "lose") calTarget = TDEE - 300;
  if (goal === "gain") calTarget = TDEE + 300;

const baseweight = target_weight || weight;

  const protein = baseweight * 1.6; // grams
  const fat = baseweight * 0.8; // grams
  const calProtein = protein * 4;
  const calFat = fat * 9;
  const remainingCalories = calTarget - (calProtein + calFat);
  const carb = remainingCalories > 0 ? remainingCalories / 4 : 0;

  db.prepare(`
    UPDATE users
    SET gender = ?, birthdate = ?, height_cm = ?, weight_kg = ?, activity_level = ?, target_weight_kg = ?
    WHERE id = ?
  `).run(gender, birthdate, height, weight, activity, target_weight, payload.id);

  const existing = db.prepare("select id from targets where user_id = ?").get(payload.id);

  if (existing) {
    db.prepare(`
      UPDATE targets
      SET daily_calorie_target=?, daily_protein_target=?, daily_carb_target=?, daily_fat_target=?, target_weight_kg=?, goal=?
      WHERE user_id=?
    `).run(calTarget, protein, carb, fat, target_weight, goal, payload.id);
  } else {
    db.prepare(`
      INSERT INTO targets (user_id, daily_calorie_target, daily_protein_target, daily_carb_target, daily_fat_target, target_weight_kg, goal)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(payload.id, calTarget, protein, carb, fat, target_weight, goal);
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
    const payload = jwt.verify(token, JWT_SECRET) as { id: number };

    // ดึงข้อมูล user
    const user = db.prepare(`
      SELECT name, email FROM users WHERE id = ?
    `).get(payload.id) as { name: string; email: string } | undefined;

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // ดึงข้อมูล targets
    const target = db.prepare(`
      SELECT daily_calorie_target, daily_protein_target, daily_carb_target, daily_fat_target
      FROM targets WHERE user_id = ?
    `).get(payload.id) as {
      daily_calorie_target: number;
      daily_protein_target: number;
      daily_carb_target: number;
      daily_fat_target: number;
    } | undefined;

    // ถ้ายังไม่มี target ให้ใช้ค่า default
    const targets = target || {
      daily_calorie_target: 2000,
      daily_protein_target: 150,
      daily_carb_target: 200,
      daily_fat_target: 65,
    };

    // คำนวณ consumed calories จาก meal_log วันนี้
    const today = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD in local time
    
    const meals = db.prepare(`
      SELECT m.portion_multiplier, f.calories_per_100g, f.protein_per_100g, f.carb_per_100g, f.fat_per_100g
      FROM meal_log m
      JOIN food f ON m.food_id = f.id
      WHERE m.user_id = ? AND m.meal_date = ?
    `).all(payload.id, today) as Array<{
      portion_multiplier: number;
      calories_per_100g: number;
      protein_per_100g: number;
      carb_per_100g: number;
      fat_per_100g: number;
    }>;

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
    const workouts = db.prepare(`
      SELECT calories_burned
      FROM workouts
      WHERE user_id = ? AND workout_date = ?
    `).all(payload.id, today) as Array<{ calories_burned: number }>;

    let totalBurned = 0;
    workouts.forEach((w) => {
      totalBurned += w.calories_burned || 0;
    });

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
    });

  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default userRoute;