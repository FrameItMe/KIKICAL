import Database from "better-sqlite3";

const db = new Database("src/database/kikical.db", { 
  fileMustExist: false,
  timeout: 5000
});

// Set busy timeout FIRST before any pragma
db.pragma("busy_timeout = 5000");

// Reset to DELETE mode first to clear any locks
try {
  db.pragma("journal_mode = DELETE");
} catch (e) {
  console.warn("Could not reset journal mode:", e.message);
}

// Now enable WAL mode
try {
  const mode = db.pragma("journal_mode = WAL", { simple: true });
  console.log(`Journal mode set to: ${mode}`);
} catch (e) {
  console.warn("Could not enable WAL mode:", e.message);
  console.log("Continuing with DELETE mode...");
}

// Optimize performance
db.pragma("synchronous = NORMAL");

export { db };

const schema = `

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,

  -- setup values (optional)
  gender TEXT,
  birthdate TEXT,
  height_cm REAL,
  weight_kg REAL,
  activity_level TEXT,
  target_weight_kg REAL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TARGETS TABLE (FIXED: remove UNIQUE constraint)
CREATE TABLE IF NOT EXISTS targets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  daily_calorie_target REAL,
  daily_protein_target REAL,
  daily_carb_target REAL,
  daily_fat_target REAL,
  target_weight_kg REAL,
  goal TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- FOOD TABLE
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

-- MEAL LOG
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

-- BADGES
CREATE TABLE IF NOT EXISTS badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon_url TEXT
);

-- USER EARNED BADGES
CREATE TABLE IF NOT EXISTS user_earned_badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  badge_id INTEGER NOT NULL,
  earned_date TEXT NOT NULL,
  UNIQUE(user_id, badge_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (badge_id) REFERENCES badges(id)
);

-- CHALLENGES
CREATE TABLE IF NOT EXISTS challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  type TEXT,
  target_value REAL,
  unit TEXT
);

-- USER CHALLENGE PROGRESS
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

-- WORKOUTS
CREATE TABLE IF NOT EXISTS workouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  calories_burned REAL NOT NULL,
  duration_minutes INTEGER,
  workout_date TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

`;

export function initDB() {
  console.log("Initializing database schema...");
  db.exec(schema);
  console.log("Schema applied successfully");

  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all();

  console.log("Tables:", tables);
}
