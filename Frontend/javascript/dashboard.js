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
  if (!token) {
    window.location.href = "login.html";
  }
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
  const { consumed, burned, targets } = data;
  
  // Calculate Net Calories: (Consumed - Burned)
  const netCalories = Math.round(consumed.calories - burned);
  const remaining = Math.round(targets.calories - netCalories);
  
  // Update Text
  setText("cal-text", netCalories);
  setText("cal-goal", formatNumber(targets.calories));
  
  setText("val-consumed", Math.round(consumed.calories));
  setText("val-burned", Math.round(burned));
  setText("val-remaining", remaining);

  // Update Macros
  setText("macro-p", `${Math.round(consumed.protein)}g / ${Math.round(targets.protein)}g Protein`);
  setText("macro-c", `${Math.round(consumed.carbs)}g / ${Math.round(targets.carbs)}g Carbs`);
  setText("macro-f", `${Math.round(consumed.fat)}g / ${Math.round(targets.fat)}g Fat`);

  // Update Progress Bar
  const percent = Math.min(100, Math.max(0, (netCalories / targets.calories) * 100));
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
