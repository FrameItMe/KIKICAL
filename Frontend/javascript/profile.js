const API_BASE = "http://localhost:8000";

document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  loadProfile();
  setupEventListeners();
});

  setupMobileNav(); // Add mobile nav handlers

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

function checkAuth() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
  }
}

async function loadProfile() {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_BASE}/user/profile`, {
      headers: { "Authorization": token }
    });

    if (res.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "login.html";
      return;
    }

    if (!res.ok) {
      showMessage("Failed to load profile", "error");
      return;
    }

    const data = await res.json();
    populateForm(data.user, data.targets);
  } catch (err) {
    console.error("Load profile error:", err);
    showMessage("Error loading profile", "error");
  }
}

function populateForm(user, targets) {
  document.getElementById("name").value = user.name || "";
  document.getElementById("email").value = user.email || "";
  document.getElementById("gender").value = user.gender || "male";
  document.getElementById("birthdate").value = user.birthdate || "";
  document.getElementById("height_cm").value = user.height_cm || "";
  document.getElementById("weight_kg").value = user.weight_kg || "";
  document.getElementById("goal").value = targets?.goal || "maintain";
  document.getElementById("target_weight_kg").value = user.target_weight_kg || "";
  document.getElementById("activity_level").value = user.activity_level || "moderate";

  // Targets (read-only)
  document.getElementById("daily_calorie_target").value = Math.round(targets?.daily_calorie_target || 0);
  document.getElementById("daily_protein_target").value = Math.round(targets?.daily_protein_target || 0);
  document.getElementById("daily_carb_target").value = Math.round(targets?.daily_carb_target || 0);
  document.getElementById("daily_fat_target").value = Math.round(targets?.daily_fat_target || 0);
}

function setupEventListeners() {
  document.getElementById("btn-save").addEventListener("click", saveProfile);

  // Auto-recalculate targets when key fields change
  const recalcFields = ["weight_kg", "height_cm", "activity_level", "goal", "target_weight_kg", "birthdate", "gender"];
  recalcFields.forEach(id => {
    document.getElementById(id).addEventListener("change", updateTargetPreview);
  });
}

async function saveProfile() {
  const token = localStorage.getItem("token");
  const msgEl = document.getElementById("profile-message");
  msgEl.textContent = "";
  msgEl.className = "";

  const updates = {
    name: document.getElementById("name").value.trim(),
    email: document.getElementById("email").value.trim(),
    gender: document.getElementById("gender").value,
    birthdate: document.getElementById("birthdate").value,
    height_cm: parseFloat(document.getElementById("height_cm").value),
    weight_kg: parseFloat(document.getElementById("weight_kg").value),
    goal: document.getElementById("goal").value,
    target_weight_kg: parseFloat(document.getElementById("target_weight_kg").value) || null,
    activity_level: document.getElementById("activity_level").value
  };

  // Basic validation
  if (!updates.name) {
    msgEl.textContent = "Please enter your name";
    msgEl.className = "error";
    return;
  }

  if (!updates.email || !updates.email.includes("@")) {
    msgEl.textContent = "Please enter a valid email";
    msgEl.className = "error";
    return;
  }

  if (!updates.gender || !updates.birthdate || !updates.height_cm || !updates.weight_kg || !updates.activity_level || !updates.goal) {
    msgEl.textContent = "Please fill in all required fields";
    msgEl.className = "error";
    return;
  }

  if (updates.height_cm <= 0 || updates.weight_kg <= 0) {
    msgEl.textContent = "Height and weight must be positive";
    msgEl.className = "error";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/user/profile`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token
      },
      body: JSON.stringify(updates)
    });

    if (res.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "login.html";
      return;
    }

    if (!res.ok) {
      const err = await res.json();
      msgEl.textContent = err.error || "Failed to update profile";
      msgEl.className = "error";
      return;
    }

    // Reload profile to get updated targets
    msgEl.textContent = "✓ Profile updated successfully!";
    msgEl.className = "success";
    
    setTimeout(() => {
      loadProfile();
      msgEl.textContent = "";
      msgEl.className = "";
    }, 2000);
  } catch (err) {
    console.error("Save error:", err);
    msgEl.textContent = "Error: " + err.message;
    msgEl.className = "error";
  }
}

function updateTargetPreview() {
  // This is optional - just shows targets will be recalculated
  // The server will calculate them on save
  const msgEl = document.getElementById("profile-message");
  msgEl.textContent = "";
  msgEl.className = "";
}

function showMessage(text, type = "error") {
  const msgEl = document.getElementById("profile-message");
  msgEl.textContent = text;
  msgEl.className = type;
}
