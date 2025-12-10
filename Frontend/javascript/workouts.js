const API_BASE = "http://localhost:8000";

let activeDate = getTodayDate();
let pendingDeleteWorkoutId = null;
let pendingEditWorkoutId = null;
let editWorkoutData = null;

document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  setupEventListeners();
  loadDailyWorkouts();
  startDailyRefresh();
  setupDeleteModal();
});

function getTodayDate() {
  return new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD in local time
}

function checkAuth() {
  const token = localStorage.getItem("token");
  if (!token) window.location.href = "login.html";
}

function setupEventListeners() {
  document.getElementById("btn-log-workout").addEventListener("click", openModal);
  document.getElementById("btn-close-modal").addEventListener("click", closeModal);
  document.getElementById("btn-cancel-modal").addEventListener("click", closeModal);
  document.getElementById("btn-submit-workout").addEventListener("click", submitWorkout);
}

function setupDeleteModal() {
  const close = () => {
    document.getElementById("delete-workout-modal").style.display = "none";
    pendingDeleteWorkoutId = null;
  };

  document.getElementById("btn-close-delete-workout").addEventListener("click", close);
  document.getElementById("btn-cancel-delete-workout").addEventListener("click", close);
  document.getElementById("btn-confirm-delete-workout").addEventListener("click", async () => {
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

  try {
    const res = await fetch(`${API_BASE}/workouts?date=${date}`, {
      headers: { "Authorization": token }
    });

    if (!res.ok) {
      console.error("Failed to load workouts");
      return;
    }

    const workouts = await res.json();
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

      if (updateRes.ok) {
        closeModal();
        pendingEditWorkoutId = null;
        editWorkoutData = null;
        loadDailyWorkouts();
      } else {
        const err = await updateRes.json();
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
    await fetch(`${API_BASE}/workouts/${id}`, {
      method: "DELETE",
      headers: { "Authorization": token }
    });
    loadDailyWorkouts();
  } catch (err) {
    console.error("Delete error:", err);
  }
}

function quickLog(name, calories, duration) {
  document.getElementById("workout-name").value = name;
  document.getElementById("workout-calories").value = calories;
  document.getElementById("workout-duration").value = duration;
  openModal();
}

// ================= UI UPDATES =================

function openModal() {
  const modal = document.getElementById("log-workout-modal");
  modal.style.display = "flex";
  
  document.getElementById("workout-name").value = "";
  document.getElementById("workout-calories").value = "";
  document.getElementById("workout-duration").value = "";
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
  const totalBurned = workouts.reduce((sum, w) => sum + (w.calories_burned || 0), 0);
  const totalDuration = workouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0);
  const count = workouts.length;

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
    // Fetch current workouts for today
    const res = await fetch(`${API_BASE}/workouts?date=${activeDate}`, {
      headers: { "Authorization": token }
    });

    if (!res.ok) throw new Error("Failed to fetch workouts");
    
    const workouts = await res.json();
    const workout = workouts.find(w => w.id === workoutId);

    if (!workout) {
      alert("Workout not found");
      return;
    }

    // Load values into modal
    document.getElementById("workout-name").value = workout.name;
    document.getElementById("workout-calories").value = workout.calories_burned;
    document.getElementById("workout-duration").value = workout.duration_minutes;

    // Set edit mode
    pendingEditWorkoutId = workoutId;
    editWorkoutData = workout;

    openModal();
  } catch (err) {
    console.error("Edit workout error:", err);
    alert("Error: " + err.message);
  }
}

window.quickLog = quickLog;
window.deleteWorkout = deleteWorkout;
window.editWorkout = editWorkout;
