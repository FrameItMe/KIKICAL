/**
 * Global notification system for achievement unlocks
 * Shows toast notifications in bottom-right corner
 */

let notificationQueue = [];
let isShowingNotification = false;

function showAchievementNotification(achievement, type = 'badge') {
  notificationQueue.push({ achievement, type });
  processNotificationQueue();
}

function processNotificationQueue() {
  if (isShowingNotification || notificationQueue.length === 0) return;
  
  isShowingNotification = true;
  const { achievement, type } = notificationQueue.shift();
  const container = getOrCreateNotificationContainer();
  const notification = createNotificationElement(achievement, type);
  
  container.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  // Remove after 4 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
      isShowingNotification = false;
      processNotificationQueue();
    }, 300);
  }, 4000);
}

function getOrCreateNotificationContainer() {
  let container = document.getElementById('achievement-notification-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'achievement-notification-container';
    container.className = 'achievement-notification-container';
    document.body.appendChild(container);
  }
  return container;
}

function createNotificationElement(achievement, type) {
  const notification = document.createElement('div');
  notification.className = `achievement-notification ${type}`;
  
  const icon = type === 'badge' ? (achievement.icon || '🏅') : '🎯';
  const title = type === 'badge' ? 'Badge Unlocked!' : 'Challenge Completed!';
  
  notification.innerHTML = `
    <div class="achievement-icon">${icon}</div>
    <div class="achievement-content">
      <div class="achievement-title">${title}</div>
      <div class="achievement-name">${achievement.name}</div>
      <div class="achievement-desc">${achievement.description || ''}</div>
    </div>
  `;
  
  return notification;
}

// Make it globally available
window.showAchievementNotification = showAchievementNotification;
