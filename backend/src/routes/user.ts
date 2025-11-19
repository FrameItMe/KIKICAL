import { Hono } from "hono";
import { db } from "../database/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "KIKICAL_SECRET_KEY";

const userRoute = new Hono();

// CHECK SETUP
userRoute.get("/setup-status", (c) => {
  const token = c.req.header("Authorization");
  if (!token) return c.json({ need_setup: true });

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: number };

    const exists = db.prepare("SELECT id FROM targets WHERE user_id=?").get(payload.id);

    return c.json({ need_setup: !exists });
  } catch {
    return c.json({ need_setup: true });
  }
});




userRoute.post("/setup", async (c) => {
  const token = c.req.header("Authorization");
  if (!token) return c.json({ error: "Not authenticated" }, 401);

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET) as { id: number };
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }

  const body = await c.req.json();

  const {
    gender,
    birthdate,
    height_cm,
    weight_kg,
    activity_level,
    goal,
    target_weight_kg,
  } = body;

  // ➤ คำนวณอายุ (เวอร์ชันเดิม)
  const birthYear = Number(birthdate.split("-")[0]);
  const age = new Date().getFullYear() - birthYear;

  // ➤ BMR (เวอร์ชันเดิม)
  const BMR =
    gender === "male"
      ? 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
      : 10 * weight_kg + 6.25 * height_cm - 5 * age - 161;

  const MULT = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };

  const TDEE = BMR * (MULT[activity_level] || 1.2);

  let calTarget = TDEE;
  if (goal === "lose") calTarget -= 300;
  if (goal === "gain") calTarget += 300;

  const baseW = target_weight_kg || weight_kg;
  const protein = baseW * 1.6;
  const fat = baseW * 0.8;
  const carb = (calTarget - protein * 4 - fat * 9) / 4;

  // ➤ UPDATE USER
  db.prepare(
    `UPDATE users SET gender=?, birthdate=?, height_cm=?, weight_kg=?, activity_level=?, target_weight_kg=? WHERE id=?`
  ).run(
    gender,
    birthdate,
    height_cm,
    weight_kg,
    activity_level,
    target_weight_kg,
    payload.id
  );

  // ➤ UPDATE / INSERT TARGETS
  const exists = db
    .prepare("SELECT id FROM targets WHERE user_id=?")
    .get(payload.id);

  if (exists) {
    db.prepare(
      `UPDATE targets SET daily_calorie_target=?, daily_protein_target=?, daily_carb_target=?, daily_fat_target=?, target_weight_kg=?, goal=? WHERE user_id=?`
    ).run(calTarget, protein, carb, fat, baseW, goal, payload.id);
  } else {
    db.prepare(
      `INSERT INTO targets (user_id, daily_calorie_target, daily_protein_target, daily_carb_target, daily_fat_target, target_weight_kg, goal)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(payload.id, calTarget, protein, carb, fat, baseW, goal);
  }

  return c.json({ message: "Setup saved" });
});


userRoute.get("/targets", (c) => {
  const token = c.req.header("Authorization");
  if (!token) return c.json({ error: "Not authenticated" }, 401);

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET) as { id: number };
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
  const targets = db.prepare(`
    SELECT * FROM targets WHERE user_id=?
  `).get(payload.id);

  return c.json({ targets });
});

export default userRoute;
