export function calculateAge(birthdate: string): number | null {
  const birth = new Date(birthdate);
  if (isNaN(birth.getTime())) {
    return null;
  }
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/*
  Calculate Basal Metabolic Rate (BMR) using Mifflin-St Jeor equation
 */
export function calculateBMR(gender: string, weight: number, height: number, age: number): number {
  if (gender === "male") {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
}

/*
  Calculate Total Daily Energy Expenditure (TDEE) from BMR and activity level
 */
export function calculateTDEE(bmr: number, activityLevel: string): number {
  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };

  const mult = activityMultipliers[activityLevel] ?? 1.2;
  return bmr * mult;
}

/*
  Calculate calorie target based on TDEE and goal
 */
export function calculateCalorieTarget(tdee: number, goal: string): number {
  let calTarget = tdee;
  if (goal === "lose") calTarget = tdee - 300;
  if (goal === "gain") calTarget = tdee + 300;
  return calTarget;
}

/*
  Calculate macro targets (protein, fat, carbs) based on calorie target and weight
 */
export function calculateMacros(
  calTarget: number,
  baseWeight: number
): {
  protein: number;
  fat: number;
  carb: number;
} {
  const protein = baseWeight * 1.6; // grams
  const fat = baseWeight * 0.8; // grams
  const calProtein = protein * 4;
  const calFat = fat * 9;
  const remainingCalories = calTarget - (calProtein + calFat);
  const carb = remainingCalories > 0 ? remainingCalories / 4 : 0;

  return { protein, fat, carb };
}
