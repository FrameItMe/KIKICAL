// Dark Mode Toggle Handler
function initializeTheme() {
  const themeToggle = document.getElementById("theme-toggle");
  const sunIcon = document.getElementById("sun-icon");
  const moonIcon = document.getElementById("moon-icon");
  const drawerThemeToggle = document.getElementById("drawer-theme-toggle");
  
  // Check saved theme preference
  const savedTheme = localStorage.getItem("theme") || "light";
  
  // Apply saved theme
  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
    if (sunIcon) sunIcon.style.display = "none";
    if (moonIcon) moonIcon.style.display = "block";
    if (drawerThemeToggle) drawerThemeToggle.textContent = "Light Mode";
  } else {
    if (drawerThemeToggle) drawerThemeToggle.textContent = "Dark Mode";
  }
  
  // Toggle theme on button click
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");
      const isDark = document.body.classList.contains("dark-mode");
      
      // Save preference
      localStorage.setItem("theme", isDark ? "dark" : "light");
      
      // Toggle icons
      if (sunIcon && moonIcon) {
        if (isDark) {
          sunIcon.style.display = "none";
          moonIcon.style.display = "block";
        } else {
          sunIcon.style.display = "block";
          moonIcon.style.display = "none";
        }
      }

      // Update drawer label
      if (drawerThemeToggle) {
        drawerThemeToggle.textContent = isDark ? "Light Mode" : "Dark Mode";
      }
    });
  }
}

// Initialize theme when DOM is ready
document.addEventListener("DOMContentLoaded", initializeTheme);
