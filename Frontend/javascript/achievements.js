const API_BASE = "http://localhost:8000";

let currentTab = "badges";

document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  loadAchievements();
  setupTabs();
});

function checkAuth() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
  }
}

function setupTabs() {
  const tabBadges = document.getElementById("tab-badges");
  const tabChallenges = document.getElementById("tab-challenges");
  const sectionBadges = document.getElementById("section-badges");
  const sectionChallenges = document.getElementById("section-challenges");

  tabBadges.addEventListener("click", () => {
    currentTab = "badges";
    tabBadges.classList.add("active");
    tabChallenges.classList.remove("active");
    sectionBadges.style.display = "block";
    sectionChallenges.style.display = "none";
  });

  tabChallenges.addEventListener("click", () => {
    currentTab = "challenges";
    tabChallenges.classList.add("active");
    tabBadges.classList.remove("active");
    sectionChallenges.style.display = "block";
    sectionBadges.style.display = "none";
  });
}

async function loadAchievements() {
  const token = localStorage.getItem("token");
  const badgeGrid = document.getElementById("badge-grid");
  const badgeEmpty = document.getElementById("badge-empty");
  const challengeList = document.getElementById("challenge-list");
  const challengeEmpty = document.getElementById("challenge-empty");

  try {
    const res = await fetch(`${API_BASE}/achievements`, {
      headers: { Authorization: token },
    });

    if (!res.ok) {
      badgeEmpty.style.display = "block";
      challengeEmpty.style.display = "block";
      return;
    }

    const data = await res.json();
    const badges = data.badges || [];
    const challenges = data.challenges || [];

    const earnedCount = badges.filter((b) => b.earned).length;
    const totalCount = badges.length;

    // Update tab label and subtitle
    const tabBadgesBtn = document.getElementById("tab-badges");
    const subtitle = document.querySelector(".page-subtitle");
    if (tabBadgesBtn) tabBadgesBtn.textContent = `Badges (${earnedCount}/${totalCount})`;
    if (subtitle) subtitle.textContent = `Track your progress with badges and challenges. You have earned ${earnedCount} of ${totalCount} badges!`;

    renderBadges(badges, badgeGrid, badgeEmpty);
    renderChallenges(challenges, challengeList, challengeEmpty);
  } catch (err) {
    console.error("Failed to load achievements", err);
    if (badgeEmpty) badgeEmpty.style.display = "block";
    if (challengeEmpty) challengeEmpty.style.display = "block";
  }
}

function renderBadges(badges, grid, emptyState) {
  if (!badges.length) {
    grid.innerHTML = "";
    emptyState.style.display = "block";
    return;
  }
  emptyState.style.display = "none";

  // Separate locked and earned
  const locked = badges.filter((b) => !b.earned);
  const earned = badges.filter((b) => b.earned);

  grid.innerHTML = "";

  // Show all badges (locked first)
  const sortedBadges = [...locked, ...earned];

  sortedBadges.forEach((badge) => {
    const card = document.createElement("div");
    card.className = `badge-card ${badge.earned ? "badge-earned" : "badge-locked"}`;
    card.innerHTML = `
      <div class="badge-icon ${!badge.earned ? "grayscale" : ""}">${badge.icon_url || "🏅"}</div>
      <div class="badge-info">
        <p class="badge-name">${badge.name}</p>
        <p class="badge-desc">${badge.description || ""}</p>
      </div>
    `;
    grid.appendChild(card);
  });
}

function renderChallenges(challenges, list, emptyState) {
  if (!challenges.length) {
    list.innerHTML = "";
    emptyState.style.display = "block";
    return;
  }
  emptyState.style.display = "none";
  list.innerHTML = "";

  challenges.forEach((ch) => {
    const progress = Math.min(100, Math.max(0, ch.progress_pct || 0));
    const current = ch.current_value ?? 0;
    const target = ch.target_value ?? 0;
    const unit = ch.unit || "";
    const status = ch.status || (progress >= 100 ? "completed" : "active");

    const card = document.createElement("div");
    card.className = "challenge-card";
    card.innerHTML = `
      <div class="challenge-top">
        <div>
          <p class="challenge-name">${ch.name}</p>
          <p class="challenge-desc">${ch.description || ""}</p>
        </div>
        <span class="challenge-status ${status}">${status.replace("_", " ")}</span>
      </div>
      <div class="challenge-progress">
        <div class="progress-bar thin">
          <div class="progress-fill" style="width:${progress}%"></div>
        </div>
        <div class="challenge-meta">
          <span>${current}/${target} ${unit}</span>
          <span>${progress}%</span>
        </div>
      </div>
    `;
    list.appendChild(card);
  });
}
