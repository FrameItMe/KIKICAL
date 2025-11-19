const API_BASE = "http://localhost:8000";

let currentStep = 1;

const setupData = {
  gender: null,
  birthdate: null,
  height_cm: null,
  weight_kg: null,
  activity_level: null,
  goal: null,
  target_weight_kg: null,
};

// =============================
// SECTION CONTROL
// =============================
function showSection(pre) {
  document.getElementById("pre-dashboard").style.display = pre ? "block" : "none";
  document.getElementById("setup-flow").style.display = pre ? "none" : "block";
}

function renderStep() {
  document.querySelectorAll(".setup-step").forEach((stepEl) => {
    stepEl.style.display = Number(stepEl.dataset.step) === currentStep ? "block" : "none";
  });

  const percent = currentStep * 25;
  document.getElementById("step-label").textContent = `Step ${currentStep} of 4`;
  document.getElementById("step-percent").textContent = `${percent}%`;
  document.getElementById("step-progress").style.width = `${percent}%`;
}

// =============================
// SELECTORS
// =============================
function selectGender(g) {
  setupData.gender = g;
  document.querySelectorAll("[data-gender]").forEach((btn) =>
    btn.classList.toggle("pill-active", btn.dataset.gender === g)
  );
}

function selectActivity(a) {
  setupData.activity_level = a;
  document.querySelectorAll("[data-activity]").forEach((btn) =>
    btn.classList.toggle("activity-active", btn.dataset.activity === a)
  );
}

function selectGoal(g) {
  setupData.goal = g;
  document.querySelectorAll("[data-goal]").forEach((btn) =>
    btn.classList.toggle("goal-active", btn.dataset.goal === g)
  );

  document.getElementById("target-weight-wrap").style.display =
    g === "maintain" ? "none" : "block";
}

// =============================
// STEP COLLECTION
// =============================
function collectStepData(step) {
  if (step === 1) {
    setupData.birthdate = document.getElementById("birthdate").value;
    setupData.height_cm = Number(document.getElementById("height-input").value);
    setupData.weight_kg = Number(document.getElementById("weight-input").value);
  }

  if (step === 3) {
    if (setupData.goal === "maintain") {
      setupData.target_weight_kg = setupData.weight_kg;
    } else {
      setupData.target_weight_kg = Number(document.getElementById("target-weight-input").value);
    }
  }
}

// =============================
// STEPS
// =============================
function startSetup() {
  currentStep = 1;
  showSection(false);
  renderStep();
}

function goNextStep() {
  collectStepData(currentStep);
  if (currentStep === 3) computeSummary();
  if (currentStep < 4) {
    currentStep++;
    renderStep();
  }
}

function goPrevStep() {
  if (currentStep > 1) {
    currentStep--;
    renderStep();
  } else {
    showSection(true);
  }
}

// =============================
// SUMMARY
// =============================
function computeSummary() {
  const birthYear = Number(setupData.birthdate.split("-")[0]);
  const age = new Date().getFullYear() - birthYear;


  const gender = setupData.gender;
  const height = setupData.height_cm;
  const weight = setupData.weight_kg;
  const activity = setupData.activity_level;
  const goal = setupData.goal;
  const targetWeight = setupData.target_weight_kg || weight;


  const BMR =
    gender === "male"
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;

  const MULT = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };

  const TDEE = BMR * (MULT[activity] || 1.2);
  let calTarget = TDEE;
  if (goal === "lose") calTarget -= 300;
  if (goal === "gain") calTarget += 300;

  const protein = targetWeight * 1.6;
  const fat = targetWeight * 0.8;
  const carb = (calTarget - protein * 4 - fat * 9) / 4;

  document.getElementById("sum-cal").textContent = Math.round(calTarget);
  document.getElementById("sum-protein").textContent = Math.round(protein);
  document.getElementById("sum-fat").textContent = Math.round(fat);
  document.getElementById("sum-carb").textContent = Math.round(carb);

}

// =============================
// FINISH SETUP
// =============================
async function finishSetup() {
  const msg = document.getElementById("setup-message");
  msg.textContent = "";

  collectStepData(3);

  const token = localStorage.getItem("token");

  const res = await fetch(`${API_BASE}/user/setup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token,
    },
    body: JSON.stringify({
      gender: setupData.gender,
      birthdate: setupData.birthdate,
      height_cm: setupData.height_cm,
      weight_kg: setupData.weight_kg,
      activity_level: setupData.activity_level,
      goal: setupData.goal,
      target_weight_kg: setupData.target_weight_kg,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    msg.textContent = "Setup failed";
    msg.className = "auth-message error";
    return;
  }

  msg.textContent = "Setup completed!";
  msg.className = "auth-message success";

  setTimeout(() => {
    window.location.href = "dashboard.html";
  }, 800);
}

function getGreetingByTime() {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return "Good Morning";
  } else if (hour >= 12 && hour < 17) {
    return "Good Afternoon";
  } else {
    return "Good Evening"; 
  }
}

// =============================
// INIT
// =============================
async function initPredashboard() {
  const token = localStorage.getItem("token");
  if (!token) return;

  // load user
  const resUser = await fetch(`${API_BASE}/auth/me`, {
    headers: { "Authorization": token },
  });
  const userData = await resUser.json();

  if (userData.user?.name) {
    const greeting = getGreetingByTime();
    document.getElementById("greeting-text").textContent =`${greeting}, ${userData.user.name.charAt(0).toUpperCase() + userData.user.name.slice(1)
}!`;
  }

  // load setup status
  const resSetup = await fetch(`${API_BASE}/user/setup-status`, {
    headers: { "Authorization": token },
  });

  const setupInfo = await resSetup.json();

  showSection(true);
  renderStep();
}

document.addEventListener("DOMContentLoaded", initPredashboard);
