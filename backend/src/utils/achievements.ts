import { db } from "../database/db.js";

/**
 * Check and update badge progress for a user
 * Call this after significant events (meal logged, workout logged, etc.)
 * Returns array of newly unlocked badges
 */
export function checkBadges(userId: number): Array<{ name: string; description: string; icon: string }> {
  const today = new Date().toLocaleDateString("sv-SE");
  const newUnlocks: Array<{ name: string; description: string; icon: string }> = [];

  // Badge 1: First Steps - Log first meal
  const mealCount = db
    .prepare("SELECT COUNT(*) as count FROM meal_log WHERE user_id = ?")
    .get(userId) as { count: number };
  
  if (mealCount.count >= 1) {
    const unlocked = awardBadge(userId, "First Steps");
    if (unlocked) newUnlocks.push(unlocked);
  }

  // Badge 2: Week Warrior - Log meals for 7 days straight
  const streak = calculateMealStreak(userId);
  if (streak >= 7) {
    const unlocked = awardBadge(userId, "Week Warrior");
    if (unlocked) newUnlocks.push(unlocked);
  }

  // Badge 3: Workout Starter - Log first workout
  const workoutCount = db
    .prepare("SELECT COUNT(*) as count FROM workouts WHERE user_id = ?")
    .get(userId) as { count: number };
  
  if (workoutCount.count >= 1) {
    const unlocked = awardBadge(userId, "Workout Starter");
    if (unlocked) newUnlocks.push(unlocked);
  }

  // Badge 4: Hydration Hero - Log 8 glasses of water (placeholder - would need water tracking)
  // Skip for now

  // Badge 5: Balanced Eater - Hit all macro targets in a day
  const macroHitCount = countMacroTargetDays(userId);
  if (macroHitCount >= 1) {
    const unlocked = awardBadge(userId, "Balanced Eater");
    if (unlocked) newUnlocks.push(unlocked);
  }

  // Badge 6: Protein Champion - Hit protein target 10 times
  const proteinDays = countProteinTargetDays(userId);
  if (proteinDays >= 10) {
    const unlocked = awardBadge(userId, "Protein Champion");
    if (unlocked) newUnlocks.push(unlocked);
  }

  // Badge 7: Consistency King - 30 day streak
  if (streak >= 30) {
    const unlocked = awardBadge(userId, "Consistency King");
    if (unlocked) newUnlocks.push(unlocked);
  }

  return newUnlocks;
}

/**
 * Check and update challenge progress
 * Returns array of challenges that were just completed
 */
export function checkChallenges(userId: number): Array<{ name: string; description: string }> {
  const today = new Date().toLocaleDateString("sv-SE");
  const completions: Array<{ name: string; description: string }> = [];

  // Challenge 1: Hit Daily Goal - Stay within calorie goal 7 days
  const calorieGoalDays = countCalorieGoalDays(userId);
  const c1 = updateChallengeProgress(userId, "Hit Daily Goal", calorieGoalDays);
  if (c1) completions.push(c1);

  // Challenge 2: Protein Power - Hit protein target 7 times
  const proteinDays = countProteinTargetDays(userId);
  const c2 = updateChallengeProgress(userId, "Protein Power", proteinDays);
  if (c2) completions.push(c2);

  // Challenge 3: 7-Day Streak
  const streak = calculateMealStreak(userId);
  const c3 = updateChallengeProgress(userId, "7-Day Streak", streak);
  if (c3) completions.push(c3);

  // Challenge 4: Workout Warrior - 5 workouts
  const workoutCount = db
    .prepare("SELECT COUNT(*) as count FROM workouts WHERE user_id = ?")
    .get(userId) as { count: number };
  const c4 = updateChallengeProgress(userId, "Workout Warrior", workoutCount.count);
  if (c4) completions.push(c4);

  // Challenge 5: Calorie Burn - 2000 kcal total
  const totalBurned = db
    .prepare("SELECT SUM(calories_burned) as total FROM workouts WHERE user_id = ?")
    .get(userId) as { total: number | null };
  const c5 = updateChallengeProgress(userId, "Calorie Burn", totalBurned?.total || 0);
  if (c5) completions.push(c5);

  // Challenge 6: Macro Master - Hit all macros 5 times
  const macroHitCount = countMacroTargetDays(userId);
  const c6 = updateChallengeProgress(userId, "Macro Master", macroHitCount);
  if (c6) completions.push(c6);

  return completions;
}

// ========== HELPER FUNCTIONS ==========

function awardBadge(userId: number, badgeName: string): { name: string; description: string; icon: string } | null {
  const badge = db
    .prepare("SELECT id, name, description, icon_url FROM badges WHERE name = ?")
    .get(badgeName) as { id: number; name: string; description: string | null; icon_url: string | null } | undefined;

  if (!badge) return null;

  const existing = db
    .prepare("SELECT id FROM user_earned_badges WHERE user_id = ? AND badge_id = ?")
    .get(userId, badge.id);

  if (!existing) {
    const today = new Date().toLocaleDateString("sv-SE");
    db.prepare(
      "INSERT INTO user_earned_badges (user_id, badge_id, earned_date) VALUES (?, ?, ?)"
    ).run(userId, badge.id, today);
    
    return {
      name: badge.name,
      description: badge.description || "",
      icon: badge.icon_url || "🏅"
    };
  }
  
  return null;
}

function updateChallengeProgress(userId: number, challengeName: string, currentValue: number): { name: string; description: string } | null {
  const challenge = db
    .prepare("SELECT id, target_value, description FROM challenges WHERE name = ?")
    .get(challengeName) as { id: number; target_value: number; description: string | null } | undefined;

  if (!challenge) return null;

  const existing = db
    .prepare("SELECT id, current_value, status FROM user_challenge_progress WHERE user_id = ? AND challenge_id = ?")
    .get(userId, challenge.id) as { id: number; current_value: number; status: string } | undefined;

  const status = currentValue >= challenge.target_value ? "completed" : "active";
  const today = new Date().toLocaleDateString("sv-SE");
  
  let justCompleted = false;

  if (existing) {
    const wasNotCompleted = existing.status !== "completed";
    const isNowCompleted = status === "completed";
    justCompleted = wasNotCompleted && isNowCompleted;
    
    db.prepare(
      "UPDATE user_challenge_progress SET current_value = ?, status = ? WHERE id = ?"
    ).run(currentValue, status, existing.id);
  } else {
    justCompleted = status === "completed";
    db.prepare(
      "INSERT INTO user_challenge_progress (user_id, challenge_id, current_value, status, start_date) VALUES (?, ?, ?, ?, ?)"
    ).run(userId, challenge.id, currentValue, status, today);
  }
  
  if (justCompleted) {
    return {
      name: challengeName,
      description: challenge.description || ""
    };
  }
  
  return null;
}

export function calculateMealStreak(userId: number): number {
  const dates = db
    .prepare("SELECT DISTINCT meal_date FROM meal_log WHERE user_id = ? ORDER BY meal_date DESC")
    .all(userId) as Array<{ meal_date: string }>;

  if (!dates.length) return 0;

  let streak = 1;
  for (let i = 0; i < dates.length - 1; i++) {
    const current = new Date(dates[i].meal_date);
    const next = new Date(dates[i + 1].meal_date);
    const diffDays = Math.floor((current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function countCalorieGoalDays(userId: number): number {
  const targets = db
    .prepare("SELECT daily_calorie_target FROM targets WHERE user_id = ?")
    .get(userId) as { daily_calorie_target: number } | undefined;

  if (!targets) return 0;

  const meals = db
    .prepare(
      `SELECT meal_date, SUM(f.calories_per_100g * m.portion_multiplier) as total
       FROM meal_log m
       JOIN food f ON m.food_id = f.id
       WHERE m.user_id = ?
       GROUP BY meal_date`
    )
    .all(userId) as Array<{ meal_date: string; total: number }>;

  const goalDays = meals.filter((m) => {
    const diff = Math.abs(m.total - targets.daily_calorie_target);
    return diff <= 200; // within 200 cal of target
  });

  return goalDays.length;
}

function countProteinTargetDays(userId: number): number {
  const targets = db
    .prepare("SELECT daily_protein_target FROM targets WHERE user_id = ?")
    .get(userId) as { daily_protein_target: number } | undefined;

  if (!targets) return 0;

  const meals = db
    .prepare(
      `SELECT meal_date, SUM(f.protein_per_100g * m.portion_multiplier) as total
       FROM meal_log m
       JOIN food f ON m.food_id = f.id
       WHERE m.user_id = ?
       GROUP BY meal_date`
    )
    .all(userId) as Array<{ meal_date: string; total: number }>;

  const proteinDays = meals.filter((m) => m.total >= targets.daily_protein_target);
  return proteinDays.length;
}

function countMacroTargetDays(userId: number): number {
  const targets = db
    .prepare(
      "SELECT daily_protein_target, daily_carb_target, daily_fat_target FROM targets WHERE user_id = ?"
    )
    .get(userId) as { daily_protein_target: number; daily_carb_target: number; daily_fat_target: number } | undefined;

  if (!targets) return 0;

  const meals = db
    .prepare(
      `SELECT meal_date,
              SUM(f.protein_per_100g * m.portion_multiplier) as protein,
              SUM(f.carb_per_100g * m.portion_multiplier) as carb,
              SUM(f.fat_per_100g * m.portion_multiplier) as fat
       FROM meal_log m
       JOIN food f ON m.food_id = f.id
       WHERE m.user_id = ?
       GROUP BY meal_date`
    )
    .all(userId) as Array<{ meal_date: string; protein: number; carb: number; fat: number }>;

  const macroDays = meals.filter((m) => {
    const proteinOk = m.protein >= targets.daily_protein_target;
    const carbOk = m.carb >= targets.daily_carb_target * 0.9; // 90% tolerance
    const fatOk = m.fat >= targets.daily_fat_target * 0.9;
    return proteinOk && carbOk && fatOk;
  });

  return macroDays.length;
}
