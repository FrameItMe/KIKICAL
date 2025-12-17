import 'dotenv/config';
import { createPool } from 'mysql2/promise';

const {
  MYSQL_HOST = 'localhost',
  MYSQL_PORT = '3306',
  MYSQL_USER = 'root',
  MYSQL_PASSWORD = '',
  MYSQL_DATABASE = 'kikical'
} = process.env;

export const pool = createPool({
  host: MYSQL_HOST,
  port: Number(MYSQL_PORT),
  user: MYSQL_USER,
  password: MYSQL_PASSWORD,
  database: MYSQL_DATABASE,
  dateStrings: true,
  timezone: '+07:00',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 20,
  maxIdle: 5,
  idleTimeout: 60000,
});

export async function get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
  const [rows] = await pool.execute(sql, params);
  return (rows as T[])[0];
}

export async function all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
}

export async function run(sql: string, params: any[] = []) {
  const [result] = await pool.execute(sql, params);
  return result as any;
}

const schemaStatements: string[] = [
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    gender VARCHAR(50),
    birthdate DATE,
    height_cm DECIMAL(10,2),
    weight_kg DECIMAL(10,2),
    activity_level VARCHAR(50),
    target_weight_kg DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB;`,
  `CREATE TABLE IF NOT EXISTS targets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    daily_calorie_target DECIMAL(10,2),
    daily_protein_target DECIMAL(10,2),
    daily_carb_target DECIMAL(10,2),
    daily_fat_target DECIMAL(10,2),
    target_weight_kg DECIMAL(10,2),
    goal VARCHAR(50),
    CONSTRAINT fk_targets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB;`,
  `CREATE TABLE IF NOT EXISTS food (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    calories_per_100g DECIMAL(10,2) NOT NULL,
    protein_per_100g DECIMAL(10,2) NOT NULL,
    carb_per_100g DECIMAL(10,2) NOT NULL,
    fat_per_100g DECIMAL(10,2) NOT NULL,
    default_serving_grams DECIMAL(10,2) NOT NULL,
    created_by_user INT,
    CONSTRAINT fk_food_user FOREIGN KEY (created_by_user) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB;`,
  `CREATE TABLE IF NOT EXISTS meal_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    food_id INT NOT NULL,
    meal_date DATE NOT NULL,
    meal_type VARCHAR(50) NOT NULL,
    portion_multiplier DECIMAL(10,2) NOT NULL,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_meal_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_meal_food FOREIGN KEY (food_id) REFERENCES food(id) ON DELETE CASCADE
  ) ENGINE=InnoDB;`,
  `CREATE TABLE IF NOT EXISTS badges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    icon_url TEXT
  ) ENGINE=InnoDB;`,
  `CREATE TABLE IF NOT EXISTS user_earned_badges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    badge_id INT NOT NULL,
    earned_date DATE NOT NULL,
    UNIQUE(user_id, badge_id),
    CONSTRAINT fk_user_badge_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_badge_badge FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE
  ) ENGINE=InnoDB;`,
  `CREATE TABLE IF NOT EXISTS challenges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    type VARCHAR(50),
    target_value DECIMAL(10,2),
    unit VARCHAR(50)
  ) ENGINE=InnoDB;`,
  `CREATE TABLE IF NOT EXISTS user_challenge_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    challenge_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    current_value DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(50) NOT NULL,
    CONSTRAINT fk_ucp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ucp_challenge FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE
  ) ENGINE=InnoDB;`,
  `CREATE TABLE IF NOT EXISTS workouts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    calories_burned DECIMAL(10,2) NOT NULL,
    duration_minutes INT,
    workout_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_workout_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB;`
];

// seed baseline badges and challenges; safe to run repeatedly
const seedStatements: string[] = [
  `INSERT IGNORE INTO badges (name, description, icon_url) VALUES
    ('First Steps', 'Log your first meal', NULL),
    ('Week Warrior', 'Log meals 7 days in a row', NULL),
    ('Workout Starter', 'Log your first workout', NULL),
    ('Balanced Eater', 'Hit all macros in a day', NULL),
    ('Protein Champion', 'Hit protein target 10 days', NULL),
    ('Consistency King', 'Maintain a 30-day meal streak', NULL)`,
  `INSERT IGNORE INTO challenges (name, description, type, target_value, unit) VALUES
    ('Hit Daily Goal', 'Stay within calorie goal 7 days', 'calorie', 7, 'days'),
    ('Protein Power', 'Hit protein target 7 times', 'protein', 7, 'days'),
    ('7-Day Streak', 'Maintain a 7-day meal streak', 'streak', 7, 'days'),
    ('Workout Warrior', 'Log 5 workouts', 'workout', 5, 'sessions'),
    ('Calorie Burn', 'Burn 2000 total calories from workouts', 'burn', 2000, 'kcal'),
    ('Macro Master', 'Hit all macros 5 times', 'macro', 5, 'days')`
];

export async function initDB() {
  console.log("Initializing MySQL schema...");
  for (const stmt of schemaStatements) {
    await pool.execute(stmt);
  }
  console.log("Seeding baseline data (badges/challenges)...");
  for (const seed of seedStatements) {
    await pool.execute(seed);
  }
  console.log("Schema ready (MySQL)");
}
