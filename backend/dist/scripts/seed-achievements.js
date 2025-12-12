import { db } from "../database/db.js";
// Seed sample badges
const sampleBadges = [
    { name: "First Steps", description: "Log your first meal", icon_url: "🍽️" },
    { name: "Week Warrior", description: "Log meals for 7 days straight", icon_url: "🔥" },
    { name: "Goal Crusher", description: "Reach your weight goal", icon_url: "🏆" },
    { name: "Hydration Hero", description: "Log 8 glasses of water in a day", icon_url: "💧" },
    { name: "Balanced Eater", description: "Hit all macro targets in a day", icon_url: "⚖️" },
    { name: "Early Bird", description: "Log breakfast before 8 AM for 5 days", icon_url: "🌅" },
    { name: "Protein Champion", description: "Hit protein target 10 times", icon_url: "💪" },
    { name: "Workout Starter", description: "Log your first workout", icon_url: "🏋️" },
    { name: "Marathon Mood", description: "Run 10km in workouts total", icon_url: "🏃" },
    { name: "Consistency King", description: "Log meals for 30 days straight", icon_url: "👑" },
];
// Seed sample challenges
const sampleChallenges = [
    {
        name: "Hit Daily Goal",
        description: "Stay within calorie goal",
        type: "daily",
        target_value: 7,
        unit: "days",
    },
    {
        name: "Protein Power",
        description: "Hit protein target 7 times",
        type: "nutrition",
        target_value: 7,
        unit: "times",
    },
    {
        name: "7-Day Streak",
        description: "Log meals every day for a week",
        type: "streak",
        target_value: 7,
        unit: "days",
    },
    {
        name: "Workout Warrior",
        description: "Complete 5 workouts",
        type: "exercise",
        target_value: 5,
        unit: "workouts",
    },
    {
        name: "Calorie Burn",
        description: "Burn 2000 calories total",
        type: "exercise",
        target_value: 2000,
        unit: "kcal",
    },
    {
        name: "Macro Master",
        description: "Hit all macros 5 times",
        type: "nutrition",
        target_value: 5,
        unit: "days",
    },
];
function seedBadges() {
    console.log("Seeding badges...");
    const insertBadge = db.prepare("INSERT OR IGNORE INTO badges (name, description, icon_url) VALUES (?, ?, ?)");
    sampleBadges.forEach((badge) => {
        insertBadge.run(badge.name, badge.description, badge.icon_url);
    });
    console.log(`✅ Seeded ${sampleBadges.length} badges`);
}
function seedChallenges() {
    console.log("Seeding challenges...");
    const insertChallenge = db.prepare("INSERT OR IGNORE INTO challenges (name, description, type, target_value, unit) VALUES (?, ?, ?, ?, ?)");
    sampleChallenges.forEach((ch) => {
        insertChallenge.run(ch.name, ch.description, ch.type, ch.target_value, ch.unit);
    });
    console.log(`✅ Seeded ${sampleChallenges.length} challenges`);
}
// Run both
seedBadges();
seedChallenges();
console.log("\n🎉 Achievements seeded successfully!");
