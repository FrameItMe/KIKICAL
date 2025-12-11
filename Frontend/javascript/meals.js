const API_BASE = "http://localhost:8000";

let currentFood = null;
let selectedPortionMult = 1;
let activeDate = getTodayDate();
let pendingDeleteMealId = null;
let pendingEditMealId = null;
let editMealData = null;

document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  setupEventListeners();
  loadDailyMeals();
  startDailyRefresh();
  setupDeleteModal();
});

function getTodayDate() {
  return new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD in local time
}

function checkAuth() {
  const token = localStorage.getItem("token");
  // if (!token) window.location.href = "login.html";
}

function setupEventListeners() {
  // Search Input (main page)
  const searchInput = document.getElementById("food-search-input");
  let debounceTimer;
  searchInput.addEventListener("input", (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const query = e.target.value;
      if (query.length > 1) searchFood(query);
    }, 500);
  });

  // Modal Controls
  document.getElementById("btn-open-log-modal").addEventListener("click", () => openModal());
  document.getElementById("btn-close-modal").addEventListener("click", closeModal);
  document.getElementById("btn-cancel-modal").addEventListener("click", closeModal);

  // Portion Buttons
  document.querySelectorAll(".portion-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".portion-btn").forEach(b => b.classList.remove("active"));
      e.target.classList.add("active");
      const mult = parseFloat(e.target.dataset.mult);
      updatePortion(mult);
    });
  });

  // Slider
  const slider = document.getElementById("portion-slider");
  slider.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    document.getElementById("slider-val").textContent = val.toFixed(1) + "x";
    document.querySelectorAll(".portion-btn").forEach(b => b.classList.remove("active"));
    updatePortion(val);
  });

  // Submit Meal
  document.getElementById("btn-submit-meal").addEventListener("click", submitMeal);
}

function setupDeleteModal() {
  const close = () => {
    document.getElementById("delete-confirm-modal").style.display = "none";
    pendingDeleteMealId = null;
  };

  document.getElementById("btn-close-delete").addEventListener("click", close);
  document.getElementById("btn-cancel-delete").addEventListener("click", close);
  document.getElementById("btn-confirm-delete").addEventListener("click", async () => {
    if (!pendingDeleteMealId) {
      close();
      return;
    }
    await performDeleteMeal(pendingDeleteMealId);
    close();
  });
}

// ================= API CALLS =================

async function searchFood(query) {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_BASE}/food/search?q=${query}`, {
      headers: { "Authorization": token }
    });
    const foods = await res.json();
    showSearchResults(foods, query);
  } catch (err) {
    console.error("Search error:", err);
  }
}

function showSearchResults(foods, query) {
  let list = document.getElementById("search-results-list");
  if (!list) {
    list = document.createElement("div");
    list.id = "search-results-list";
    list.className = "search-dropdown";
    document.querySelector(".search-bar-wrapper").appendChild(list);
  }
  
  list.innerHTML = "";

  if (!foods || foods.length === 0) {
    const empty = document.createElement("div");
    empty.className = "search-item empty";
    empty.textContent = "No foods found. Add custom?";
    empty.onclick = () => {
      openModalWithName(query || "");
      list.innerHTML = "";
    };
    list.appendChild(empty);
    return;
  }

  foods.forEach(food => {
    const item = document.createElement("div");
    item.className = "search-item";
    item.textContent = `${food.name} (${food.calories_per_100g} cal/100g)`;
    item.onclick = () => {
      populateModalWithFood(food);
      list.innerHTML = "";
    };
    list.appendChild(item);
  });
}

function populateModalWithFood(food) {
  openModal();
  currentFood = food;
  document.getElementById("modal-food-name").value = food.name;
  document.getElementById("modal-food-id").value = food.id;
  document.getElementById("modal-cal").value = food.calories_per_100g || 0;
  document.getElementById("modal-protein").value = food.protein_per_100g || 0;
  document.getElementById("modal-carbs").value = food.carb_per_100g || 0;
  document.getElementById("modal-fat").value = food.fat_per_100g || 0;
  
  selectedPortionMult = 1;
  document.getElementById("portion-slider").value = 1;
  document.getElementById("slider-val").textContent = "1.0x";
  document.querySelectorAll(".portion-btn").forEach(b => b.classList.remove("active"));
  const btn1x = document.querySelector("[data-mult='1']");
  if (btn1x) btn1x.classList.add("active");
}

function openModalWithName(name) {
  openModal();
  currentFood = null; // custom food
  document.getElementById("modal-food-name").value = name || "";
}

async function loadDailyMeals() {
  const token = localStorage.getItem("token");
  const user = await fetchUser();
  if (!user) return;

  const date = activeDate || getTodayDate();

  try {
    const res = await fetch(`${API_BASE}/meals/${user.id}?date=${date}`, {
      headers: { "Authorization": token }
    });
    const meals = await res.json();
    renderMealHistory(meals);
    updateSummary(meals);
  } catch (err) {
    console.error("Load meals error:", err);
  }
}

async function fetchUser() {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { "Authorization": token }
    });
    const data = await res.json();
    return data.user;
  } catch (err) {
    console.error("Fetch user error:", err);
    return null;
  }
}

async function submitMeal() {
  const token = localStorage.getItem('token');
  const user = await fetchUser();
  
  if (!user) {
    alert("Error: Not logged in");
    return;
  }
  
  const foodName = document.getElementById("modal-food-name").value.trim();
  const mealType = document.getElementById("modal-meal-type").value;
  const calories = parseFloat(document.getElementById("modal-cal").value) || 0;
  const protein = parseFloat(document.getElementById("modal-protein").value) || 0;
  const carbs = parseFloat(document.getElementById("modal-carbs").value) || 0;
  const fat = parseFloat(document.getElementById("modal-fat").value) || 0;
  
  if (!foodName) {
    alert("Please select or enter a food name.");
    return;
  }

  try {
    // ถ้า edit mode
    if (pendingEditMealId) {
      const updateRes = await fetch(`${API_BASE}/meals/${pendingEditMealId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": token 
        },
        body: JSON.stringify({
          meal_type: mealType,
          portion_multiplier: selectedPortionMult
        })
      });

      if (updateRes.ok) {
        closeModal();
        pendingEditMealId = null;
        editMealData = null;
        loadDailyMeals();
      } else {
        const err = await updateRes.json();
        alert("Failed to update meal: " + (err.error || "Unknown error"));
      }
      return;
    }

    // ถ้า add mode
    let foodId;
    
    if (currentFood && currentFood.id) {
      foodId = currentFood.id;
    } else {
      const foodRes = await fetch(`${API_BASE}/food`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": token 
        },
        body: JSON.stringify({
          name: foodName,
          category: "Custom",
          calories_per_100g: calories,
          protein_per_100g: protein,
          carb_per_100g: carbs,
          fat_per_100g: fat,
          default_serving_grams: 100
        })
      });

      if (!foodRes.ok) {
        const err = await foodRes.json();
        alert("Failed to create food: " + (err.error || "Unknown error"));
        return;
      }

      const foodData = await foodRes.json();
      foodId = foodData.id;
    }

    const mealRes = await fetch(`${API_BASE}/meals`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": token 
      },
      body: JSON.stringify({
        food_id: foodId,
        meal_date: activeDate || getTodayDate(),
        meal_type: mealType,
        portion_multiplier: selectedPortionMult
      })
    });

    if (mealRes.ok) {
      closeModal();
      const data = await mealRes.json();
      
      if (data.unlocks && data.unlocks.length > 0) {
        data.unlocks.forEach(unlock => showAchievementNotification(unlock, 'badge'));
      }
      if (data.challengeUpdates && data.challengeUpdates.length > 0) {
        data.challengeUpdates.forEach(challenge => showAchievementNotification(challenge, 'challenge'));
      }
      
      loadDailyMeals();
    } else {
      const err = await mealRes.json();
      alert("Failed to log meal: " + (err.error || "Unknown error"));
    }
  } catch (err) {
    console.error("Submit error:", err);
    alert("Error: " + err.message);
  }
}

function openModal(food = null) {
  const modal = document.getElementById("log-meal-modal");
  modal.style.display = "flex";
  
  document.getElementById("modal-meal-type").value = "breakfast";
  document.getElementById("modal-food-name").value = "";
  document.getElementById("modal-food-id").value = "";
  resetMacros();
  selectedPortionMult = 1;
  document.getElementById("portion-slider").value = 1;
  document.getElementById("slider-val").textContent = "1.0x";
  document.querySelectorAll(".portion-btn").forEach(b => b.classList.remove("active"));
  const btn1x = document.querySelector("[data-mult='1']");
  if (btn1x) btn1x.classList.add("active");
  
  currentFood = null;
}

function closeModal() {
  document.getElementById("log-meal-modal").style.display = "none";
}

function updatePortion(mult) {
  selectedPortionMult = mult;
  document.getElementById("portion-slider").value = mult;
  document.getElementById("slider-val").textContent = mult.toFixed(1) + "x";
}

function resetMacros() {
  document.getElementById("modal-cal").value = "";
  document.getElementById("modal-protein").value = "";
  document.getElementById("modal-carbs").value = "";
  document.getElementById("modal-fat").value = "";
}

function renderMealHistory(meals) {
  const list = document.getElementById("meal-history-list");
  list.innerHTML = "";

  if (meals.length === 0) {
    list.innerHTML = `
      <div class="empty-state-card">
        <p>No meals logged yet. Start by adding your first meal!</p>
      </div>`;
    return;
  }

  meals.forEach(meal => {
    const card = document.createElement("div");
    card.className = "meal-item-card";
    const cals = Math.round((meal.calories_per_100g || 0) * (meal.portion_multiplier || 1));
    card.innerHTML = `
      <div class="meal-info">
        <div class="meal-name">${meal.food_name}</div>
        <div class="meal-meta">${meal.meal_type} • ${cals} kcal</div>
      </div>
      <div class="meal-actions">
        <button class="btn-edit-log" onclick="editMeal(${meal.id})" title="Edit">✎</button>
        <button class="btn-delete-log" onclick="deleteLog(${meal.id})">&times;</button>
      </div>
    `;
    list.appendChild(card);
  });
}

async function deleteLog(id) {
  pendingDeleteMealId = id;
  document.getElementById("delete-confirm-modal").style.display = "flex";
}

async function performDeleteMeal(id) {
  const token = localStorage.getItem("token");
  try {
    await fetch(`${API_BASE}/meals/${id}`, {
      method: "DELETE",
      headers: { "Authorization": token }
    });
    loadDailyMeals();
  } catch (err) {
    console.error("Delete error:", err);
  }
}

function updateSummary(meals) {
  const total = meals.reduce((sum, m) => sum + ((m.calories_per_100g || 0) * (m.portion_multiplier || 1)), 0);
  document.getElementById("today-calories").textContent = Math.round(total);
}

function startDailyRefresh() {
  setInterval(() => {
    const today = getTodayDate();
    if (today !== activeDate) {
      activeDate = today;
      loadDailyMeals();
    }
  }, 60000); // check every minute
}

function quickSearch(term) {
  document.getElementById("food-search-input").value = term;
  searchFood(term);
}

async function editMeal(mealId) {
  const token = localStorage.getItem("token");
  const user = await fetchUser();
  if (!user) return;

  const date = activeDate || getTodayDate();

  try {
    const res = await fetch(`${API_BASE}/meals/${user.id}?date=${date}`, {
      headers: { "Authorization": token }
    });
    const meals = await res.json();
    const meal = meals.find(m => m.id === mealId);
    
    if (!meal) {
      alert("Meal not found");
      return;
    }

    // Store meal data for update
    editMealData = meal;
    pendingEditMealId = mealId;

    // Populate modal with current values
    const modal = document.getElementById("log-meal-modal");
    modal.style.display = "flex";
    
    document.getElementById("modal-meal-type").value = meal.meal_type;
    document.getElementById("modal-food-name").value = meal.food_name;
    document.getElementById("modal-food-id").value = meal.food_id;
    document.getElementById("modal-cal").value = meal.calories_per_100g || 0;
    document.getElementById("modal-protein").value = meal.protein_per_100g || 0;
    document.getElementById("modal-carbs").value = meal.carb_per_100g || 0;
    document.getElementById("modal-fat").value = meal.fat_per_100g || 0;
    
    selectedPortionMult = meal.portion_multiplier || 1;
    document.getElementById("portion-slider").value = selectedPortionMult;
    document.getElementById("slider-val").textContent = selectedPortionMult.toFixed(1) + "x";
    document.querySelectorAll(".portion-btn").forEach(b => b.classList.remove("active"));
    
    currentFood = { id: meal.food_id };
  } catch (err) {
    console.error("Edit meal error:", err);
  }
}

window.quickSearch = quickSearch;
window.deleteLog = deleteLog;
window.editMeal = editMeal;

