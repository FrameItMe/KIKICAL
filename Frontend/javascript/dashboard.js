const API_BASE = "http://localhost:8000";

let lastLoadedDate = getTodayDate();

document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  fetchDashboardData();
  setupEventListeners();
  startDailyRefresh();
});

function getTodayDate() {
  return new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD in local time
}

function checkAuth() {
  const token = localStorage.getItem("token");
  // if (!token) {
  //   window.location.href = "login.html";
  // }
}

function setupEventListeners() {
  // Logout
  
  const btnLogMeal = document.getElementById("btn-log-meal");
  const btnLogWorkout = document.getElementById("btn-log-workout");

  if (btnLogMeal) {
    btnLogMeal.addEventListener("click", () => {
      window.location.href = "meals.html";
    });
  }

  if (btnLogWorkout) {
    btnLogWorkout.addEventListener("click", () => {
      window.location.href = "workouts.html";
    });
  }
}

async function fetchDashboardData() {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE}/user/dashboard`, {
      headers: { "Authorization": token },
    });

    if (res.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "login.html";
      return;
    }

    const data = await res.json();
    updateUI(data);

  } catch (err) {
    console.error("Error fetching dashboard data:", err);
  }
}

function updateUI(data) {
  // 1. Greeting
  const greetTitle = document.getElementById("greet-title");
  if (greetTitle) greetTitle.innerText = `${getGreeting()}, ${data.username}!`;

  // 2. Targets & Consumed
  const { consumed, burned, targets, remaining } = data;
  
  // Net Calories = consumed (แคลอรี่ที่กินไป)
  const netCalories = Math.round(consumed.calories);
  
  // Goal เพิ่มตาม workout = target + burned
  const adjustedGoal = targets.calories + burned;
  
  // Update Text
  setText("cal-text", netCalories);
  setText("cal-goal", formatNumber(Math.round(adjustedGoal)));
  
  setText("val-consumed", Math.round(consumed.calories));
  setText("val-burned", Math.round(burned));
  setText("val-remaining", Math.round(remaining));

  // Update Macros
  setText("macro-p", `${Math.round(consumed.protein)}g / ${Math.round(targets.protein)}g Protein`);
  setText("macro-c", `${Math.round(consumed.carbs)}g / ${Math.round(targets.carbs)}g Carbs`);
  setText("macro-f", `${Math.round(consumed.fat)}g / ${Math.round(targets.fat)}g Fat`);

  // Insights cards
  const insights = data.insights || {};

  // Protein balance today
  const protein = insights.protein || { pct: 0, consumed: 0, target: targets.protein };
  const proteinPct = Math.min(100, Math.round(protein.pct || 0));
  setText("ins-protein-main", `${proteinPct}%`);
  setText("ins-protein-sub", `${Math.round(protein.consumed || 0)}g / ${Math.round(protein.target || 0)}g`);

  // Carb/Fat balance
  const carbfat = insights.carbFat || { carbPct: 0, fatPct: 0, carbConsumed: 0, fatConsumed: 0, carbTarget: targets.carbs, fatTarget: targets.fat };
  const carbPctDisplay = Math.min(100, Math.round(carbfat.carbPct || 0));
  const fatPctDisplay = Math.min(100, Math.round(carbfat.fatPct || 0));
  setText("ins-carbfat-main", `${carbPctDisplay}% / ${fatPctDisplay}%`);
  setText("ins-carbfat-sub", `${Math.round(carbfat.carbConsumed || 0)}g / ${Math.round(carbfat.carbTarget || 0)}g • ${Math.round(carbfat.fatConsumed || 0)}g / ${Math.round(carbfat.fatTarget || 0)}g`);

  // Logging streak
  const streakDays = insights.streakDays || 0;
  setText("ins-streak-main", `${streakDays} day${streakDays === 1 ? "" : "s"}`);
  setText("ins-streak-sub", streakDays >= 7 ? "Great consistency!" : "Keep logging daily");

  // Latest badge
  const badge = insights.latestBadge;
  if (badge) {
    setText("ins-badge-main", badge.name || "Badge unlocked");
    setText("ins-badge-sub", `Earned ${badge.earned_date}`);
  } else {
    setText("ins-badge-main", "None yet");
    setText("ins-badge-sub", "Complete goals to unlock");
  }

  // Update Progress Bar (based on adjusted goal)
  const percent = Math.min(100, Math.max(0, (netCalories / adjustedGoal) * 100));
  const progressBar = document.getElementById("cal-progress");
  const progressLabel = document.getElementById("cal-percent");
  
  if (progressBar) progressBar.style.width = `${percent}%`;
  if (progressLabel) progressLabel.innerText = `${Math.round(percent)}%`;

  // Update Circle Gradient
  const circle = document.getElementById("cal-circle");
  if (circle) {
    circle.style.background = `conic-gradient(#2ecc71 ${percent}%, #eee ${percent}%)`;
  }
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = text;
}

function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function startDailyRefresh() {
  setInterval(() => {
    const today = getTodayDate();
    if (today !== lastLoadedDate) {
      lastLoadedDate = today;
      fetchDashboardData();
    }
  }, 60000); // check every minute
}
