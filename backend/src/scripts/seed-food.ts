import { get, run } from "../database/db.js";

// Common Thai daily foods with macros per 100g (approximate)
const foods: Array<{ name: string; category: string; calories: number; protein: number; carb: number; fat: number }> = [
  { name: "ข้าวหอมมะลิ", category: "Rice", calories: 130, protein: 2.7, carb: 28, fat: 0.3 },
  { name: "ข้าวกล้อง", category: "Rice", calories: 111, protein: 2.6, carb: 23, fat: 0.9 },
  { name: "ข้าวเหนียว", category: "Rice", calories: 169, protein: 3.5, carb: 37, fat: 0.3 },
  { name: "ไข่ดาว", category: "Egg", calories: 196, protein: 13, carb: 0.8, fat: 15 },
  { name: "ไข่ต้ม", category: "Egg", calories: 155, protein: 13, carb: 1.1, fat: 11 },
  { name: "ไก่ย่าง", category: "Protein", calories: 165, protein: 31, carb: 0, fat: 4 },
  { name: "หมูย่าง", category: "Protein", calories: 196, protein: 23, carb: 1, fat: 11 },
  { name: "ผัดกะเพราไก่", category: "Dish", calories: 180, protein: 15, carb: 8, fat: 9 },
  { name: "ผัดไทยกุ้ง", category: "Dish", calories: 210, protein: 12, carb: 32, fat: 6 },
  { name: "แกงเขียวหวานไก่", category: "Dish", calories: 140, protein: 9, carb: 6, fat: 8 },
  { name: "ต้มยำกุ้ง", category: "Soup", calories: 90, protein: 12, carb: 6, fat: 2 },
  { name: "ส้มตำไทย", category: "Salad", calories: 70, protein: 3, carb: 12, fat: 1 },
  { name: "ข้าวผัดหมู", category: "Dish", calories: 230, protein: 9, carb: 35, fat: 6 },
  { name: "โจ๊กหมู", category: "Dish", calories: 110, protein: 7, carb: 16, fat: 2 },
  { name: "ปลานึ่ง", category: "Protein", calories: 115, protein: 22, carb: 0, fat: 3 },
  { name: "มะละกอ", category: "Fruit", calories: 43, protein: 0.5, carb: 11, fat: 0.3 },
  { name: "แตงโม", category: "Fruit", calories: 30, protein: 0.6, carb: 8, fat: 0.2 },
  { name: "กล้วย", category: "Fruit", calories: 89, protein: 1.1, carb: 23, fat: 0.3 },
  { name: "น้ำส้ม", category: "Drink", calories: 45, protein: 0.7, carb: 10.4, fat: 0.2 },
  { name: "นมสด", category: "Drink", calories: 61, protein: 3.2, carb: 4.8, fat: 3.3 }
];

async function seedFood() {
  try {
    let inserted = 0;
    
    for (const f of foods) {
      const exists = await get<{ id: number }>(
        "SELECT id FROM food WHERE LOWER(name) = LOWER(?)",
        [f.name]
      );
      
      if (exists) continue;
      
      await run(
        `INSERT INTO food
          (name, category, calories_per_100g, protein_per_100g, carb_per_100g, fat_per_100g, default_serving_grams, created_by_user)
         VALUES (?, ?, ?, ?, ?, ?, 100, NULL)`,
        [f.name, f.category, f.calories, f.protein, f.carb, f.fat]
      );
      inserted++;
    }
    
    console.log(`✅ Seed completed. Inserted ${inserted} foods.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seedFood();
