import { get, all, run } from "../database/db.js";

/**
 * Check and update badge progress for a user
 * Call this after significant events (meal logged, workout logged, etc.)
 * Returns array of newly unlocked badges
 */
export async function checkBadges(userId: number): Promise<Array<{ name: string; description: string; icon: string }>> {
  const today = new Date().toLocaleDateString("sv-SE");
  const newUnlocks: Array<{ name: string; description: string; icon: string }> = [];

  // Badge 1: First Steps - Log first meal
  const mealCount = await get<{ count: number }>("SELECT COUNT(*) as count FROM meal_log WHERE user_id = ?", [userId]);
  
  if (mealCount && mealCount.count >= 1) {
    const unlocked = await awardBadge(userId, "First Steps");
    if (unlocked) newUnlocks.push(unlocked);
  }

  // Badge 2: Week Warrior - Log meals for 7 days straight
  const streak = await calculateMealStreak(userId);
  if (streak >= 7) {
    const unlocked = await awardBadge(userId, "Week Warrior");
    if (unlocked) newUnlocks.push(unlocked);
  }

  // Badge 3: Workout Starter - Log first workout
  const workoutCount = await get<{ count: number }>("SELECT COUNT(*) as count FROM workouts WHERE user_id = ?", [userId]);
  
  if (workoutCount && workoutCount.count >= 1) {
    const unlocked = await awardBadge(userId, "Workout Starter");
    if (unlocked) newUnlocks.push(unlocked);
  }

  // Badge 4: Hydration Hero - Log 8 glasses of water (placeholder - would need water tracking)
  // Skip for now

  // Badge 5: Balanced Eater - Hit all macro targets in a day
  const macroHitCount = await countMacroTargetDays(userId);
  if (macroHitCount >= 1) {
    const unlocked = await awardBadge(userId, "Balanced Eater");
    if (unlocked) newUnlocks.push(unlocked);
  }

  // Badge 6: Protein Champion - Hit protein target 10 times
  const proteinDays = await countProteinTargetDays(userId);
  if (proteinDays >= 10) {
    const unlocked = await awardBadge(userId, "Protein Champion");
    if (unlocked) newUnlocks.push(unlocked);
  }

  // Badge 7: Consistency King - 30 day streak
  if (streak >= 30) {
    const unlocked = await awardBadge(userId, "Consistency King");
    if (unlocked) newUnlocks.push(unlocked);
  }

  return newUnlocks;
}

/**
 * Check and update challenge progress
 * Returns array of challenges that were just completed
 */
export async function checkChallenges(userId: number): Promise<Array<{ name: string; description: string }>> {
  const today = new Date().toLocaleDateString("sv-SE");
  const completions: Array<{ name: string; description: string }> = [];

  // Challenge 1: Hit Daily Goal - Stay within calorie goal 7 days
  const calorieGoalDays = await countCalorieGoalDays(userId);
  const c1 = await updateChallengeProgress(userId, "Hit Daily Goal", calorieGoalDays);
  if (c1) completions.push(c1);

  // Challenge 2: Protein Power - Hit protein target 7 times
  const proteinDays = await countProteinTargetDays(userId);
  const c2 = await updateChallengeProgress(userId, "Protein Power", proteinDays);
  if (c2) completions.push(c2);

  // Challenge 3: 7-Day Streak
  const streak = await calculateMealStreak(userId);
  const c3 = await updateChallengeProgress(userId, "7-Day Streak", streak);
  if (c3) completions.push(c3);

  // Challenge 4: Workout Warrior - 5 workouts
  const workoutCount = await get<{ count: number }>("SELECT COUNT(*) as count FROM workouts WHERE user_id = ?", [userId]);
  const c4 = await updateChallengeProgress(userId, "Workout Warrior", workoutCount?.count || 0);
  if (c4) completions.push(c4);

  // Challenge 5: Calorie Burn - 2000 kcal total
  const totalBurned = await get<{ total: number | null }>("SELECT SUM(calories_burned) as total FROM workouts WHERE user_id = ?", [userId]);
  const c5 = await updateChallengeProgress(userId, "Calorie Burn", totalBurned?.total || 0);
  if (c5) completions.push(c5);

  // Challenge 6: Macro Master - Hit all macros 5 times
  const macroHitCount = await countMacroTargetDays(userId);
  const c6 = await updateChallengeProgress(userId, "Macro Master", macroHitCount);
  if (c6) completions.push(c6);

  return completions;
}

// ========== HELPER FUNCTIONS ==========

async function awardBadge(userId: number, badgeName: string): Promise<{ name: string; description: string; icon: string } | null> {
  const badge = await get<{ id: number; name: string; description: string | null; icon_url: string | null }>("SELECT id, name, description, icon_url FROM badges WHERE name = ?", [badgeName]);

  if (!badge) return null;

  const existing = await get<{ id: number }>("SELECT id FROM user_earned_badges WHERE user_id = ? AND badge_id = ?", [userId, badge.id]);

  if (!existing) {
    const today = new Date().toLocaleDateString("sv-SE");
    await run(
      "INSERT INTO user_earned_badges (user_id, badge_id, earned_date) VALUES (?, ?, ?)",
      [userId, badge.id, today]
    );
    
    return {
      name: badge.name,
      description: badge.description || "",
      icon: badge.icon_url || "🏅"
    };
  }
  
  return null;
}

async function updateChallengeProgress(userId: number, challengeName: string, currentValue: number): Promise<{ name: string; description: string } | null> {
  const challenge = await get<{ id: number; target_value: number; description: string | null }>("SELECT id, target_value, description FROM challenges WHERE name = ?", [challengeName]);

  if (!challenge) return null;

  const existing = await get<{ id: number; current_value: number; status: string }>("SELECT id, current_value, status FROM user_challenge_progress WHERE user_id = ? AND challenge_id = ?", [userId, challenge.id]);

  // Determine status based on progress
  let status: string;
  if (currentValue <= 0) {
    status = "not_started";
  } else if (currentValue >= challenge.target_value) {
    status = "completed";
  } else {
    status = "active";
  }
  
  const today = new Date().toLocaleDateString("sv-SE");
  
  let justCompleted = false;

  if (existing) {
    const wasNotCompleted = existing.status !== "completed";
    const isNowCompleted = status === "completed";
    justCompleted = wasNotCompleted && isNowCompleted;
    
    await run(
      "UPDATE user_challenge_progress SET current_value = ?, status = ? WHERE id = ?",
      [currentValue, status, existing.id]
    );
  } else {
    // Only create record if there's actual progress
    if (currentValue > 0) {
      justCompleted = status === "completed";
      await run(
        "INSERT INTO user_challenge_progress (user_id, challenge_id, current_value, status, start_date) VALUES (?, ?, ?, ?, ?)",
        [userId, challenge.id, currentValue, status, today]
      );
    }
  }
  
  if (justCompleted) {
    return {
      name: challengeName,
      description: challenge.description || ""
    };
  }
  
  return null;
}

export async function calculateMealStreak(userId: number): Promise<number> {
  const dates = await all<{ meal_date: string }>("SELECT DISTINCT meal_date FROM meal_log WHERE user_id = ? ORDER BY meal_date DESC", [userId]);

  if (!dates.length) return 0;

  // avoid local timezone shifting by comparing UTC day numbers from YYYY-MM-DD strings
  const toDayNumber = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return Math.floor(Date.UTC(y, m - 1, d) / (1000 * 60 * 60 * 24));
  };

  let streak = 1;
  for (let i = 0; i < dates.length - 1; i++) {
    const currentDay = toDayNumber(dates[i].meal_date);
    const nextDay = toDayNumber(dates[i + 1].meal_date);
    const diffDays = currentDay - nextDay;

    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

async function countCalorieGoalDays(userId: number): Promise<number> {
  const targets = await get<{ daily_calorie_target: number }>("SELECT daily_calorie_target FROM targets WHERE user_id = ?", [userId]);

  if (!targets) return 0;

  const meals = await all<{ meal_date: string; total: number }>(
    `SELECT meal_date, SUM(f.calories_per_100g * m.portion_multiplier) as total
     FROM meal_log m
     JOIN food f ON m.food_id = f.id
     WHERE m.user_id = ?
     GROUP BY meal_date`,
    [userId]
  );

  const goalDays = meals.filter((m) => {
    const diff = Math.abs(m.total - targets.daily_calorie_target);
    return diff <= 200; // within 200 cal of target
  });

  return goalDays.length;
}

async function countProteinTargetDays(userId: number): Promise<number> {
  const targets = await get<{ daily_protein_target: number }>("SELECT daily_protein_target FROM targets WHERE user_id = ?", [userId]);

  if (!targets) return 0;

  const meals = await all<{ meal_date: string; total: number }>(
    `SELECT meal_date, SUM(f.protein_per_100g * m.portion_multiplier) as total
     FROM meal_log m
     JOIN food f ON m.food_id = f.id
     WHERE m.user_id = ?
     GROUP BY meal_date`,
    [userId]
  );

  const proteinDays = meals.filter((m) => m.total >= targets.daily_protein_target);
  return proteinDays.length;
}

async function countMacroTargetDays(userId: number): Promise<number> {
  const targets = await get<{ daily_protein_target: number; daily_carb_target: number; daily_fat_target: number }>(
    "SELECT daily_protein_target, daily_carb_target, daily_fat_target FROM targets WHERE user_id = ?",
    [userId]
  );

  if (!targets) return 0;

  const meals = await all<{ meal_date: string; protein: number; carb: number; fat: number }>(
    `SELECT meal_date,
            SUM(f.protein_per_100g * m.portion_multiplier) as protein,
            SUM(f.carb_per_100g * m.portion_multiplier) as carb,
            SUM(f.fat_per_100g * m.portion_multiplier) as fat
     FROM meal_log m
     JOIN food f ON m.food_id = f.id
     WHERE m.user_id = ?
     GROUP BY meal_date`,
    [userId]
  );

  const macroDays = meals.filter((m) => {
    // Convert to numbers and provide defaults to handle null/undefined
    const protein = parseFloat(m.protein as any) || 0;
    const carb = parseFloat(m.carb as any) || 0;
    const fat = parseFloat(m.fat as any) || 0;
    
    const proteinTarget = parseFloat(targets.daily_protein_target as any) || 0;
    const carbTarget = parseFloat(targets.daily_carb_target as any) || 0;
    const fatTarget = parseFloat(targets.daily_fat_target as any) || 0;
    
    // Relaxed tolerance: 80% of target is considered success
    const proteinOk = protein >= proteinTarget * 0.8;
    const carbOk = carb >= carbTarget * 0.8;
    const fatOk = fat >= fatTarget * 0.8;
    
    return proteinOk && carbOk && fatOk;
  });

  return macroDays.length;
}
