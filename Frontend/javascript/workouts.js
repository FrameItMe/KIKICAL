const API_BASE = "http://localhost:8000";

let activeDate = getTodayDate();
let pendingDeleteWorkoutId = null;
let pendingEditWorkoutId = null;
let editWorkoutData = null;

function handleUnauthorized(status) {
  if (status === 401) {
    localStorage.removeItem("token");
    window.location.href = "login.html";
    return true;
  }
  return false;
}

document.addEventListener("DOMContentLoaded", () => {
  if (!checkAuth()) return; // Stop if not authenticated
  setupMobileNav(); // Add mobile nav handlers
  setupEventListeners();
  loadDailyWorkouts();
  startDailyRefresh();
  setupDeleteModal();
});

// Mobile Navigation Drawer
function setupMobileNav() {
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
    if (navDrawer?.classList.contains("open")) {
      closeDrawer();
    } else {
      openDrawer();
    }
  });

  backdrop?.addEventListener("click", closeDrawer);

  // Close drawer when clicking nav items (except logout)
  navDrawer?.querySelectorAll(".drawer-item").forEach((el) => {
    if (el.id !== "drawer-logout") {
      el.addEventListener("click", closeDrawer);
    }
  });

  // Logout handler
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
}

function getTodayDate() {
  return new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD in local time
}

function checkAuth() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return false; // Prevent further execution
  }
  return true;
}

function setupEventListeners() {
  document.getElementById("btn-log-workout")?.addEventListener("click", () => openModal());
  document.getElementById("btn-close-modal")?.addEventListener("click", closeModal);
  document.getElementById("btn-cancel-modal")?.addEventListener("click", closeModal);
  document.getElementById("btn-submit-workout")?.addEventListener("click", submitWorkout);
}

function setupDeleteModal() {
  const close = () => {
    document.getElementById("delete-workout-modal").style.display = "none";
    pendingDeleteWorkoutId = null;
  };

  document.getElementById("btn-close-delete-workout")?.addEventListener("click", close);
  document.getElementById("btn-cancel-delete-workout")?.addEventListener("click", close);
  document.getElementById("btn-confirm-delete-workout")?.addEventListener("click", async () => {
    if (!pendingDeleteWorkoutId) {
      close();
      return;
    }
    await performDeleteWorkout(pendingDeleteWorkoutId);
    close();
  });
}

// ================= API CALLS =================

async function loadDailyWorkouts() {
  const token = localStorage.getItem("token");
  const date = activeDate || getTodayDate();
  console.log("[loadDailyWorkouts] Loading workouts for date:", date);

  try {
    const res = await fetch(`${API_BASE}/workouts?date=${date}`, {
      headers: { "Authorization": token }
    });

    if (handleUnauthorized(res.status)) return;

    if (!res.ok) {
      console.error("Failed to load workouts");
      return;
    }

    const workouts = await res.json();
    console.log("[loadDailyWorkouts] API Response:", workouts);
    renderWorkoutHistory(workouts);
    updateSummary(workouts);
  } catch (err) {
    console.error("Load workouts error:", err);
  }
}

async function submitWorkout() {
  const token = localStorage.getItem("token");
  
  const name = document.getElementById("workout-name").value.trim();
  const calories = parseFloat(document.getElementById("workout-calories").value) || 0;
  const duration = parseInt(document.getElementById("workout-duration").value) || 0;

  if (!name || calories <= 0) {
    alert("Please enter workout name and calories burned.");
    return;
  }

  try {
    // ถ้า edit mode
    if (pendingEditWorkoutId) {
      console.log("[submitWorkout] Edit mode - updating workout:", pendingEditWorkoutId);
      const updateRes = await fetch(`${API_BASE}/workouts/${pendingEditWorkoutId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token
        },
        body: JSON.stringify({
          name,
          calories_burned: calories,
          duration_minutes: duration
        })
      });

        if (handleUnauthorized(updateRes.status)) return;

      if (updateRes.ok) {
        console.log("[submitWorkout] Workout updated successfully");
        closeModal();
        pendingEditWorkoutId = null;
        editWorkoutData = null;
        loadDailyWorkouts();
      } else {
        const err = await updateRes.json();
        console.error("[submitWorkout] Update failed:", err);
        alert("Failed to update workout: " + (err.error || "Unknown error"));
      }
      return;
    }

    // ถ้า add mode
    const res = await fetch(`${API_BASE}/workouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token
      },
      body: JSON.stringify({
        name,
        calories_burned: calories,
        duration_minutes: duration
      })
    });

    if (handleUnauthorized(res.status)) return;

    if (res.ok) {
      closeModal();
      const data = await res.json();
      
      if (data.unlocks && data.unlocks.length > 0) {
        data.unlocks.forEach(unlock => showAchievementNotification(unlock, 'badge'));
      }
      if (data.challengeUpdates && data.challengeUpdates.length > 0) {
        data.challengeUpdates.forEach(challenge => showAchievementNotification(challenge, 'challenge'));
      }
      
      loadDailyWorkouts();
    } else {
      const err = await res.json();
      alert("Failed to log workout: " + (err.error || "Unknown error"));
    }
  } catch (err) {
    console.error("Submit error:", err);
    alert("Error: " + err.message);
  }
}

async function deleteWorkout(id) {
  pendingDeleteWorkoutId = id;
  document.getElementById("delete-workout-modal").style.display = "flex";
}

async function performDeleteWorkout(id) {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_BASE}/workouts/${id}`, {
      method: "DELETE",
      headers: { "Authorization": token }
    });
    if (handleUnauthorized(res.status)) return;
    loadDailyWorkouts();
  } catch (err) {
    console.error("Delete error:", err);
  }
}

function quickLog(name, calories, duration) {
  openModal(name, calories, duration);
}

// ================= UI UPDATES =================

function openModal(name = "", calories = "", duration = "") {
  const modal = document.getElementById("log-workout-modal");
  modal.style.display = "flex";
  
  // Reset to "Log Workout" mode (unless editWorkout() has set pendingEditWorkoutId)
  if (!pendingEditWorkoutId) {
    const modalTitle = document.querySelector(".modal-header h3");
    if (modalTitle) {
      modalTitle.textContent = "Log Workout";
    }
    const submitBtn = document.getElementById("btn-submit-workout");
    if (submitBtn) {
      submitBtn.textContent = "Log Workout";
    }
    
    // Only clear fields if NOT in edit mode
    document.getElementById("workout-name").value = name;
    document.getElementById("workout-calories").value = calories;
    document.getElementById("workout-duration").value = duration;
  }
}

function closeModal() {
  document.getElementById("log-workout-modal").style.display = "none";
  pendingEditWorkoutId = null;
  editWorkoutData = null;
}

function renderWorkoutHistory(workouts) {
  const list = document.getElementById("workout-history-list");
  list.innerHTML = "";

  if (workouts.length === 0) {
    list.innerHTML = `
      <div class="empty-state-card">
        <p>No workouts logged yet. Start by adding your first workout!</p>
      </div>`;
    return;
  }

  workouts.forEach(workout => {
    const card = document.createElement("div");
    card.className = "meal-item-card";
    card.innerHTML = `
      <div class="meal-info">
        <div class="meal-name">${workout.name}</div>
        <div class="meal-meta">${workout.calories_burned} kcal • ${workout.duration_minutes} min</div>
      </div>
      <div class="meal-actions">
      <button class="btn-edit-log" onclick="editWorkout(${workout.id})" title="Edit">✎</button>
      <button class="btn-delete-log" onclick="deleteWorkout(${workout.id})">&times;</button>
      </div>
    `;
    list.appendChild(card);
  });
}

function updateSummary(workouts) {
  console.log("[updateSummary] Workouts data:", workouts);
  
  let totalBurned = 0;
  let totalDuration = 0;
  
  if (Array.isArray(workouts) && workouts.length > 0) {
    totalBurned = workouts.reduce((sum, w) => {
      const calories = parseFloat(w.calories_burned) || 0;
      console.log(`[updateSummary] Workout: ${w.name}, Calories: ${calories}`);
      return sum + calories;
    }, 0);
    
    totalDuration = workouts.reduce((sum, w) => sum + (parseInt(w.duration_minutes) || 0), 0);
  }
  
  const count = Array.isArray(workouts) ? workouts.length : 0;

  console.log(`[updateSummary] Total Burned: ${totalBurned}, Count: ${count}, Duration: ${totalDuration}`);
  
  document.getElementById("total-burned").textContent = Math.round(totalBurned);
  const cardBurned = document.getElementById("total-burned-card");
  if (cardBurned) cardBurned.textContent = Math.round(totalBurned);
  document.getElementById("workout-count").textContent = count;
  document.getElementById("total-duration").textContent = totalDuration;
}

function startDailyRefresh() {
  setInterval(() => {
    const today = getTodayDate();
    if (today !== activeDate) {
      activeDate = today;
      loadDailyWorkouts();
    }
  }, 60000); // check every minute
}

async function editWorkout(workoutId) {
  const token = localStorage.getItem("token");

  try {
    console.log("[editWorkout] Loading workout:", workoutId);
    
    // Fetch single workout by id to avoid date-mismatch issues
    const res = await fetch(`${API_BASE}/workouts/${workoutId}`, {
      headers: { "Authorization": token }
    });

    if (handleUnauthorized(res.status)) return;
    if (!res.ok) {
      const text = await res.text();
      console.error("Edit workout fetch failed:", res.status, text);
      throw new Error("Failed to fetch workout");
    }
    
    const workout = await res.json();
    console.log("[editWorkout] Data received:", workout);

    // Load values into modal
    document.getElementById("workout-name").value = workout.name || "";
    document.getElementById("workout-calories").value = workout.calories_burned || "";
    document.getElementById("workout-duration").value = workout.duration_minutes || "";

    // Update modal title and button
    const modalTitle = document.querySelector(".modal-header h3");
    if (modalTitle) {
      modalTitle.textContent = "Edit Workout";
    }
    const submitBtn = document.getElementById("btn-submit-workout");
    if (submitBtn) {
      submitBtn.textContent = "Update Workout";
    }

    // Set edit mode
    pendingEditWorkoutId = workoutId;
    editWorkoutData = workout;

    console.log("[editWorkout] Modal opened in edit mode");
    openModal();
  } catch (err) {
    console.error("Edit workout error:", err);
    alert("Error loading workout: " + err.message);
  }
}

window.quickLog = quickLog;
window.deleteWorkout = deleteWorkout;
window.editWorkout = editWorkout;
