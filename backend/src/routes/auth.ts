import { Hono } from "hono";
import { db } from "../database/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import 'dotenv/config';

const JWT_SECRET = process.env.JWT_SECRET || "KIKICAL_SECRET_KEY";

const authRoute = new Hono();

authRoute.post("/register", async (c) => {
  try {
    const body = await c.req.json();
    const name = (body.name || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";

    if (!name || !email || !password)
      return c.json({ error: "Please fill all fields." }, 400);

    const check = db.prepare("SELECT id FROM users WHERE LOWER(email)=?").get(email);
    if (check) return c.json({ error: "Email already exists" }, 400);

    const hash = await bcrypt.hash(password, 10);

    const result = db.prepare(`
      INSERT INTO users (name, email, password_hash)
      VALUES (?, ?, ?)
    `).run(name, email, hash);

    return c.json({ message: "Register success", user_id: result.lastInsertRowid });

  } catch (err) {
    return c.json({ error: "Server error" }, 500);
  }
});

authRoute.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password;

    const user = db.prepare(
      "SELECT id, password_hash FROM users WHERE LOWER(email)=?"
    ).get(email);

    if (!user) return c.json({ error: "Invalid email or password" }, 401);

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return c.json({ error: "Invalid email or password" }, 401);

    // generate token (ไม่ผ่าน cookie)
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "1d" });

    return c.json({
      message: "Login success",
      token,
    });

  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

authRoute.get("/me", async (c) => {
  const token = c.req.header("Authorization");

  if (!token) return c.json({ user: null });

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: number };

    const user = db.prepare(`
      SELECT id, name, email FROM users WHERE id=?
    `).get(payload.id);

    return c.json({ user });
  } catch {
    return c.json({ user: null });
  }
});

export default authRoute;
