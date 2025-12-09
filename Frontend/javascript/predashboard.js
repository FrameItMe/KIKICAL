const API_BASE_URL = "http://localhost:8000";

// predashboard script (minimal logs removed)

let currentStep = 1;

const setupData = {
  gender: null,
  age: null,
  height_cm: null,
  weight_kg: null,
  activity_level: null,
  goal: null,
  target_weight_kg: null,
};

// ---------- Helpers ----------
function showSection(pre) {
  const preSec = document.getElementById("pre-dashboard");
  const setupSec = document.getElementById("setup-flow");
  if (pre) {
    preSec.style.display = "block";
    setupSec.style.display = "none";
  } else {
    preSec.style.display = "none";
    setupSec.style.display = "block";
  }
}

function renderStep() {
  document.querySelectorAll(".setup-step").forEach((stepEl) => {
    const stepNum = Number(stepEl.dataset.step);
    stepEl.style.display = stepNum === currentStep ? "block" : "none";
  });

  // progress text
  const label = document.getElementById("step-label");
  const percent = document.getElementById("step-percent");
  const bar = document.getElementById("step-progress");

  const percentVal = currentStep * 25; // 4 steps → 25,50,75,100
  label.textContent = `Step ${currentStep} of 4`;
  percent.textContent = `${percentVal}%`;
  bar.style.width = `${percentVal}%`;
}

// ---------- Start Setup ----------
function startSetup() {
  showSection(false);
  currentStep = 1;
  renderStep();
}

// ---------- Step Navigation ----------
function goNextStep() {
  collectStepData(currentStep);

  if (currentStep === 3) {
    // ก่อนเข้า step4 สรุป → คำนวณ
    computeSummary();
  }

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
    // ถ้ากลับจาก step1 → กลับไปหน้า pre-dashboard
    showSection(true);
  }
}

// ---------- Collect Data ----------
function collectStepData(step) {
  if (step === 1) {
    const birthdateVal = document.getElementById("birthdate").value;
    const hVal = parseFloat(
      document.getElementById("height-input").value || "0"
    );
    const wVal = parseFloat(
      document.getElementById("weight-input").value || "0"
    );

    // คำนวณอายุจากวันเกิด
    if (birthdateVal) {
      const birthDate = new Date(birthdateVal);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      setupData.age = age;
      setupData.birthdate = birthdateVal; // เก็บวันเกิดไว้ส่ง backend
    }
    
    if (!isNaN(hVal) && hVal > 0) setupData.height_cm = hVal;
    if (!isNaN(wVal) && wVal > 0) setupData.weight_kg = wVal;
  }

  if (step === 3) {
    if (setupData.goal === "maintain") {
      setupData.target_weight_kg = setupData.weight_kg;
    } else {
      const twVal = parseFloat(
        document.getElementById("target-weight-input").value || "0"
      );
      if (!isNaN(twVal) && twVal > 0) {
        setupData.target_weight_kg = twVal;
      }
    }
  }
}

// ---------- Selectors ----------
function selectGender(g) {
  setupData.gender = g;
  document.querySelectorAll("[data-gender]").forEach((btn) => {
    btn.classList.toggle("pill-active", btn.dataset.gender === g);
  });
}

function selectActivity(a) {
  setupData.activity_level = a;
  document.querySelectorAll("[data-activity]").forEach((btn) => {
    btn.classList.toggle("activity-active", btn.dataset.activity === a);
  });
}

function selectGoal(g) {
  setupData.goal = g;
  document.querySelectorAll("[data-goal]").forEach((btn) => {
    btn.classList.toggle("goal-active", btn.dataset.goal === g);
  });

  const wrap = document.getElementById("target-weight-wrap");
  if (g === "maintain") {
    wrap.style.display = "none";
  } else {
    wrap.style.display = "block";
  }
}

// ---------- Summary (frontend preview) ----------
function computeSummary() {
  const gender = setupData.gender || "male";
  const age = setupData.age || 25;
  const weight = setupData.weight_kg || 70;
  const height = setupData.height_cm || 170;
  const activity = setupData.activity_level || "moderate";
  const goal = setupData.goal || "maintain";
  const targetWeight = setupData.target_weight_kg || weight;

  // BMR
  let BMR;
  if (gender === "male") {
    BMR = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    BMR = 10 * weight + 6.25 * height - 5 * age - 161;
  }

  // TDEE
  const mult = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  }[activity] || 1.2;
  const TDEE = BMR * mult;

  // Calorie target
  let calTarget = TDEE;
  if (goal === "lose") calTarget = TDEE - 300;
  if (goal === "gain") calTarget = TDEE + 300;

  // Macros (ใช้ target weight)
  const protein = targetWeight * 1.6;
  const fat = targetWeight * 0.8;
  const calProtein = protein * 4;
  const calFat = fat * 9;
  const remaining = calTarget - (calProtein + calFat);
  const carb = remaining > 0 ? remaining / 4 : 0;

  document.getElementById("sum-cal").textContent = calTarget.toFixed(0);
  document.getElementById("sum-protein").textContent = protein.toFixed(0);
  document.getElementById("sum-fat").textContent = fat.toFixed(0);
  document.getElementById("sum-carb").textContent = carb.toFixed(0);
}

// ---------- Finish (send to backend) ----------
async function finishSetup() {
  collectStepData(3); // เผื่อยังไม่ได้ดึง target weight รอบล่าสุด

  const msgEl = document.getElementById("setup-message");
  if (msgEl) {
    msgEl.textContent = "";
    msgEl.className = "auth-message";
  }

  // client-side quick validation to prevent empty payload
  const required = [
    setupData.gender,
    setupData.height_cm,
    setupData.weight_kg,
    setupData.activity_level,
    setupData.goal,
  ];

  const missing = required.some((v) => v === null || v === undefined || v === "");
  const invalidNumber =
    !Number.isFinite(setupData.height_cm) || setupData.height_cm <= 0 ||
    !Number.isFinite(setupData.weight_kg) || setupData.weight_kg <= 0;

  if (missing || invalidNumber) {
    if (msgEl) {
      msgEl.textContent = "Please fill in all steps with valid height/weight.";
      msgEl.classList.add("error");
    }
    return;
  }


  try {
    // แปลง age → birthdate (approx) ตาม year
    const nowYear = new Date().getFullYear();
    const age = setupData.age || 25;
    const birthYear = nowYear - age;
    const birthdate = `${birthYear}-01-01`;

    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/user/setup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": token },
      body: JSON.stringify({
        gender: setupData.gender,
        birthdate,
        height_cm: setupData.height_cm,
        weight_kg: setupData.weight_kg,
        activity_level: setupData.activity_level,
        goal: setupData.goal,
        target_weight_kg: setupData.target_weight_kg,
      }),
    });

    let data;
    try {
      data = await res.json();
    } catch (e) {
      data = null;
    }

    if (!res.ok) {
      if (res.status === 401) {
        if (msgEl) {
          msgEl.textContent = "You must be logged in to complete setup.";
          msgEl.classList.add("error");
        }
        return;
      }

      const errMsg = (data && data.error) ? data.error : 'Setup failed';
      if (msgEl) {
        msgEl.textContent = errMsg;
        msgEl.classList.add("error");
      }
      throw new Error(errMsg);
    }

    if (msgEl) {
      msgEl.textContent = "Setup completed!";
      msgEl.classList.add("success");
    }

    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 800);
  } catch (err) {
    if (msgEl) {
      msgEl.textContent = "Failed to complete setup.";
      msgEl.classList.add("error");
    }
  }
}

// ---------- On load: greeting + setup-status ----------
async function initPredashboard() {
  // Check auth via token
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  try {
    // Get user info
    const res = await fetch(`${API_BASE_URL}/auth/me`, { headers: { Authorization: token } });
    if (res.ok) {
      const data = await res.json();
      const greetEl = document.getElementById("greeting-text");
      if (data.user?.name && greetEl) greetEl.textContent = `Good afternoon, ${data.user.name}`;
    }
  } catch (err) {
    // Silently fail
  }

  // Check setup status
  try {
    const res2 = await fetch(`${API_BASE_URL}/user/setup-status`, { headers: { Authorization: token } });
    if (res2.ok) {
      const data2 = await res2.json();
      if (!data2.need_setup) {
        window.location.href = "dashboard.html";
        return;
      }
    }
  } catch (err) {
    // Silently fail
  }

  showSection(true);
  renderStep();
}

document.addEventListener("DOMContentLoaded", () => {
  initPredashboard();
});
