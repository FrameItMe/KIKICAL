const API_BASE = "http://localhost:8000";

let lastLoadedDate = getTodayDate();

const motivationalQuotes = [
  "You're building a healthier you, keep going! 🌿",
  "Don't underestimate your progress 🌟",
  "Your habits today shape your tomorrow 🌞",
  "Every meal is a new chance to choose better 🥗",
  "Strength grows in the moments you push through 💪",
  "You’re closer than you think — keep moving 🚶‍♂️",
  "Healthy choices add up, one by one ➕",
  "You’re doing better than you give yourself credit for 💚",
  "Fuel your body, fuel your mind 🔋",
  "Your future self is cheering for you 🙌",
  "Discipline is choosing what you want most 🤝",
  "You showed up today — that matters 🧡",
  "Small steps still move you forward 👣",
  "Your effort is rewriting your story 📘",
  "Take care of your body — it’s the only place you live 🏡",
  "Let every day bring you closer to balance ⚖️",
  "Don't rush — trust your pace 🌀",
  "A little progress each day becomes big results 📈",
  "Healthy looks good on you already 😉",
  "Your consistency is inspiring ✨",
  "Reset, refocus, restart — you’re allowed to try again 🔄",
  "You're showing real dedication — keep it up 🏅",
  "Make yourself proud today 🌠",
  "Strong body, strong mind 🧠💪",
  "You’re creating the best version of you 🌸",
  "Every healthy choice is a victory 🎉",
  "Your perseverance is powerful 🌬️🔥",
  "Your goals matter — keep them close ❤️",
  "You’re doing something amazing for yourself 🌱",
  "Stay patient — results need time ⏳",
  "Don’t fear failure, fear giving up 💥",
  "Your journey is unique — own it 🌈",
  "Push a little more — you're almost there 🚀",
  "You're becoming unstoppable 🔥",
  "Your health journey is worth every effort 🤍",
  "You showed up for yourself today — that’s huge ⭐",
  "Healthy energy starts with healthy choices ⚡",
  "Your commitment is admirable 👏",
  "You are capable of incredible things 🌟"
];

function getRandomMotivation() {
  return motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
}

function initializeMotivation() {
  const motivationP = document.querySelector(".motivation p");
  if (motivationP) {
    const today = getTodayDate();
    const storedData = JSON.parse(localStorage.getItem("dailyMotivation") || "{}");
    
    // If it's a new day, get a new quote
    if (storedData.date !== today) {
      const newQuote = getRandomMotivation();
      localStorage.setItem("dailyMotivation", JSON.stringify({
        date: today,
        quote: newQuote
      }));
      motivationP.textContent = `"${newQuote}"`;
    } else {
      // Use the same quote from today
      motivationP.textContent = `"${storedData.quote}"`;
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  initializeMotivation();
  fetchDashboardData();
  setupEventListeners();
  startDailyRefresh();

  // Mobile/Tablet nav toggle
  const navToggle = document.getElementById("nav-toggle");
  const navDrawer = document.getElementById("nav-drawer");
  const backdrop = document.getElementById("drawer-backdrop");

  function openDrawer() {
    if (!navDrawer) return;
    navDrawer.classList.add("open");
    navDrawer.setAttribute("aria-hidden", "false");
    navToggle?.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    if (!navDrawer) return;
    navDrawer.classList.remove("open");
    navDrawer.setAttribute("aria-hidden", "true");
    navToggle?.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  navToggle?.addEventListener("click", () => {
    if (navDrawer?.classList.contains("open")) closeDrawer();
    else openDrawer();
  });

  backdrop?.addEventListener("click", closeDrawer);
  navDrawer?.querySelectorAll(".drawer-item").forEach(el => {
    if (el.id !== "drawer-logout") {
      el.addEventListener("click", closeDrawer);
    }
  });

  // Drawer logout handler
  const drawerLogout = document.getElementById("drawer-logout");
  drawerLogout?.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "login.html";
  });

  // Drawer Dark Mode toggle
  const drawerTheme = document.getElementById("drawer-theme-toggle");
  drawerTheme?.addEventListener("click", () => {
    document.getElementById("theme-toggle")?.click();
  });
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
  const btnLogMeal = document.getElementById("btn-log-meal");
  const btnLogWorkout = document.getElementById("btn-log-workout");
  const editProfileBtn = document.getElementById("edit-profile-btn");
  const settingsBtn = document.getElementById("settings-btn");

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

  if (editProfileBtn) {
    editProfileBtn.addEventListener("click", () => {
      window.location.href = "profile.html";
    });
  }

  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      window.location.href = "profile.html";
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
  setText("macro-p", `${Math.round(consumed.protein)}g / ${Math.round(targets.protein)}g`);
  setText("macro-c", `${Math.round(consumed.carbs)}g / ${Math.round(targets.carbs)}g`);
  setText("macro-f", `${Math.round(consumed.fat)}g / ${Math.round(targets.fat)}g`);

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
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
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
