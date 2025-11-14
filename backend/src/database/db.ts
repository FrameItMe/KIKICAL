import Database from "better-sqlite3";

const db = new Database("src/database/kikical.db", {
  verbose: console.log,
});

// SQL สร้างตารางทั้งหมด
const schema = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT,
  gender TEXT NOT NULL,
  birthdate TEXT NOT NULL,
  height_cm REAL NOT NULL,
  weight_kg REAL NOT NULL,
  activity_level TEXT NOT NULL,
  target_weight_kg REAL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS targets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  daily_calorie_target INTEGER,
  daily_protein_target REAL,
  daily_carb_target REAL,
  daily_fat_target REAL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS food (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT,
  calories_per_100g REAL NOT NULL,
  protein_per_100g REAL NOT NULL,
  carb_per_100g REAL NOT NULL,
  fat_per_100g REAL NOT NULL,
  default_serving_grams REAL NOT NULL,
  created_by_user INTEGER,
  FOREIGN KEY (created_by_user) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS meal_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  food_id INTEGER NOT NULL,
  meal_date TEXT NOT NULL,
  meal_type TEXT NOT NULL,
  portion_multiplier REAL NOT NULL,
  logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (food_id) REFERENCES food(id)
);

CREATE TABLE IF NOT EXISTS badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon_url TEXT
);

CREATE TABLE IF NOT EXISTS user_earned_badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  badge_id INTEGER NOT NULL,
  earned_date TEXT NOT NULL,
  UNIQUE(user_id, badge_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (badge_id) REFERENCES badges(id)
);

CREATE TABLE IF NOT EXISTS challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  type TEXT,
  target_value REAL,
  unit TEXT
);

CREATE TABLE IF NOT EXISTS user_challenge_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  challenge_id INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT,
  current_value REAL DEFAULT 0,
  status TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (challenge_id) REFERENCES challenges(id)
);

CREATE TABLE IF NOT EXISTS workouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  calories_burned REAL NOT NULL,
  duration_minutes INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
`;

// รัน schema ทั้งหมด
db.exec(schema);

console.log("Database created and initialized successfully!");

