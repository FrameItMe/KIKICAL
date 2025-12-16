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
    // Fetch dashboard data
    const res = await fetch(`${API_BASE}/user/dashboard`, {
      headers: { "Authorization": token },
    });

    if (res.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "login.html";
      return;
    }

    const data = await res.json();
    
    // Fetch workouts separately for total burned
    const today = getTodayDate();

    
    try {
      const workoutRes = await fetch(`${API_BASE}/workouts?date=${today}`, {
        headers: { "Authorization": token },
      });
      
      let totalBurned = 0;
      if (workoutRes.ok) {
        const workouts = await workoutRes.json();

        workouts.forEach((w) => {
          const burned = parseFloat(w.calories_burned) || 0;

          totalBurned += burned;
        });
      }
      
      data.burned = totalBurned;

    } catch (err) {
      console.error("[fetchDashboardData] Workouts fetch error:", err);
      data.burned = 0;
    }
    
    updateUI(data);

  } catch (err) {
    console.error("Error fetching dashboard data:", err);
  }
}

function updateUI(data) {
  // 1. Greeting
  const greetTitle = document.getElementById("greet-title");
  if (greetTitle) greetTitle.innerText = `${getGreeting()}, ${data.username}!`;

  // 2. Targets & Consumed - with safe conversion
  let { consumed, burned, targets, remaining } = data;
  

  
  // Safe number conversion for consumed
  const consumedCalories = (consumed?.calories && typeof consumed.calories === 'number') ? consumed.calories : 0;
  const consumedProtein = (consumed?.protein && typeof consumed.protein === 'number') ? consumed.protein : 0;
  const consumedCarbs = (consumed?.carbs && typeof consumed.carbs === 'number') ? consumed.carbs : 0;
  const consumedFat = (consumed?.fat && typeof consumed.fat === 'number') ? consumed.fat : 0;
  
  // Safe number conversion for targets (might be strings from API)
  const targetCalories = parseFloat(targets.calories) || 0;
  const targetProtein = parseFloat(targets.protein) || 0;
  const targetCarbs = parseFloat(targets.carbs) || 0;
  const targetFat = parseFloat(targets.fat) || 0;
  
  const burnedValue = (typeof burned === 'number') ? parseFloat(burned) : parseFloat(burned) || 0;
  const remainingValue = (typeof remaining === 'number') ? remaining : 0;
  

  
  // Net Calories = consumed (แคลอรี่ที่กินไป)
  const netCalories = Math.round(consumedCalories);
  
  // Goal เพิ่มตาม workout = target + burned
  const adjustedGoal = targetCalories + burnedValue;
  

  
  // Update Text
  setText("cal-text", isNaN(netCalories) ? 0 : netCalories);
  setText("cal-goal", formatNumber(Math.round(adjustedGoal)));
  
  setText("val-consumed", isNaN(consumedCalories) ? 0 : Math.round(consumedCalories));
  setText("val-burned", isNaN(burnedValue) ? 0 : Math.round(burnedValue));
  setText("val-remaining", isNaN(remainingValue) ? 0 : Math.round(remainingValue));

  // Update Macros with safe fallback
  setText("macro-p", `${Math.round(consumedProtein)}g / ${Math.round(targetProtein)}g`);
  setText("macro-c", `${Math.round(consumedCarbs)}g / ${Math.round(targetCarbs)}g`);
  setText("macro-f", `${Math.round(consumedFat)}g / ${Math.round(targetFat)}g`);

  // Insights cards
  const insights = data.insights || {};

  // Protein balance today
  const protein = insights.protein || { pct: 0, consumed: 0, target: targetProtein };
  const proteinPct = Math.min(100, Math.round(protein.pct || 0));
  setText("ins-protein-main", `${proteinPct}%`);
  setText("ins-protein-sub", `${Math.round(protein.consumed || 0)}g / ${Math.round(protein.target || 0)}g`);

  // Carb/Fat balance
  const carbfat = insights.carbFat || { carbPct: 0, fatPct: 0, carbConsumed: 0, fatConsumed: 0, carbTarget: targetCarbs, fatTarget: targetFat };
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
    const earnedDate = new Date(badge.earned_date);
    const formattedDate = earnedDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
    setText("ins-badge-sub", `Earned ${formattedDate}`);
  } else {
    setText("ins-badge-main", "None yet");
    setText("ins-badge-sub", "Complete goals to unlock");
  }

  // Update Progress Bar (based on adjusted goal)
  // Safe calculation - avoid division by zero and NaN
  let percent = 0;
  if (adjustedGoal > 0) {
    percent = Math.min(100, Math.max(0, (netCalories / adjustedGoal) * 100));
  }
  
  // Check if percent is valid number
  if (isNaN(percent)) {
    percent = 0;
  }
  

  
  const progressBar = document.getElementById("cal-progress");
  const progressLabel = document.getElementById("cal-percent");
  
  if (progressBar) {
    progressBar.style.width = `${percent}%`;

  }
  if (progressLabel) progressLabel.innerText = `${Math.round(percent)}%`;

  // Update Circle Ring with conic-gradient (starts from top, goes clockwise)
  const circle = document.getElementById("cal-circle");
  if (circle) {
    const gradientAngle = (percent / 100) * 360;
    circle.style.background = `
      radial-gradient(circle, var(--bg-card) 68%, transparent 70%),
      conic-gradient(from 90deg at 50% 50%, #10b981 0deg ${gradientAngle}deg, #f3f4f6 ${gradientAngle}deg 360deg)
    `;
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
