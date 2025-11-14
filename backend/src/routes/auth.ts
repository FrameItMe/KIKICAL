import { Hono } from "hono";
import Database from "better-sqlite3";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import 'dotenv/config';
// Support both env names and provide a dev default
const JWT_SECRET = process.env.JWT_SECRET || process.env.jwt_secret || "This_IS_MY_KIKICAL_SECRET_KEY_MUHAHA";

// Connect to SQLite database
const db = new Database("src/database/kikical.db", {
  verbose: console.log,
});

const authRoute = new Hono();

// User Registration
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
    
    //hash password
    const hashedPassword = await bcrypt.hash(body.password, 10);

    // provide defaults for required fields if not present from frontend
    const gender = body.gender || "unspecified";
    const birthdate = body.birthdate || "1970-01-01";
    const height_cm = body.height_cm ?? 0;
    const weight_kg = body.weight_kg ?? 0;
    const activity_level = body.activity_level || "unknown";
    const target_weight_kg = body.target_weight_kg ?? null;

    //insert user into database
    const stmt = db.prepare(`
      INSERT INTO users 
      (name, email, password_hash, gender, birthdate, height_cm, weight_kg, activity_level, target_weight_kg)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      target_weight_kg
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
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return c.json({
      message: "Login success",
      token,
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



// User Logout
authRoute.post("/logout", async (c) => {
  try {
    // In a stateless JWT
    return c.json({ message: "Logout successful" });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});


export default authRoute;