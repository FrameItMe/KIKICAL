import { Hono } from "hono";
import { db } from "../database/db.js";
import { nowLocalDateTime } from "../utils/dateTime.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config.js";

const authRoute = new Hono();

// REGISTER 
authRoute.post("/register", async (c) => {
  try {
    const body = await c.req.json();
    // normalize and validate email
    const name = (body.name || "").trim();
    const email = (body.email || "").trim().toLowerCase();

    //check email duplication (case-insensitive)
    const check = db
      .prepare("SELECT id FROM users WHERE LOWER(email) = ?")
      .get(email);

    if (check) {
      return c.json({ error: "Email already exists" }, 400);
    }
    
    // validate required fields
    const password = body.password || "";
    if (!name || !email || !password) {
      return c.json({ error: "Name, email and password are required" }, 400);
    }
    if (password.length < 4) {
      return c.json({ error: "Password must be at least 4 characters" }, 400);
    }

    //hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // provide defaults for required fields if not present from frontend
    const gender = body.gender || "unspecified";
    const birthdate = body.birthdate || "0000-00-00";
    const height_cm = body.height_cm ?? 0;
    const weight_kg = body.weight_kg ?? 0;
    const activity_level = body.activity_level || "unknown";
    const target_weight_kg = body.target_weight_kg ?? null;

    //insert user into database
    const stmt = db.prepare(`
      INSERT INTO users 
      (name, email, password_hash, gender, birthdate, height_cm, weight_kg, activity_level, target_weight_kg, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    //execute insertion
    const result = stmt.run(
      name,
      email,
      hashedPassword,
      gender,
      birthdate,
      height_cm,
      weight_kg,
      activity_level,
      target_weight_kg,
      nowLocalDateTime()
    );

    //return success response
    return c.json({
      message: "User registered",
      user_id: result.lastInsertRowid,
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});


// User Login
authRoute.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    // normalize email for lookup
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password;

    if(!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    const user = db
      .prepare("SELECT id, email, password_hash FROM users WHERE LOWER(email) = ?")
      .get(email) as { id: number; email: string; password_hash: string } | undefined;

    if (!user) {
      return c.json({ error: "Invalid email or password" }, 401);
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return c.json({ error: "Invalid email or password" }, 401);
    }
    // Use global JWT secret (do not log secret value)
    const token = jwt.sign({ id: user.id }, JWT_SECRET!, { expiresIn: "1d" });

    return c.json({
      message: "Login success",
      token: token,
      user: {
        id: user.id,
        email: user.email,
      }
    });

  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});



// User Logout (client handles localStorage)
authRoute.post("/logout", (c) => {
  return c.json({ message: "Logged out" });
});


// Get Current User Info
authRoute.get("/me", async (c) => {
  const token = c.req.header("Authorization") || "";

  if (!token) {
    return c.json({ user: null });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET!) as unknown as unknown as { id: number };

    const user = db.prepare(`
      SELECT id, name, email FROM users WHERE id = ?
    `).get(payload.id);

    return c.json({ user: user || null });
  } catch (err) {
    return c.json({ user: null });
  }
});

export default authRoute;
