// Background script for Habit Tracker Pro

// Listen for alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'habitReminder') {
    // Check if notifications are enabled
    chrome.storage.local.get(['notificationsEnabled', 'habits'], (result) => {
      if (result.notificationsEnabled) {
        const habits = result.habits || [];
        const today = new Date().toISOString().slice(0, 10);
        
        // Count incomplete habits
        const completedCount = habits.filter(habit => 
          habit.history && habit.history.includes(today)
        ).length;
        
        const remainingCount = habits.length - completedCount;
        
        // Show notification if there are incomplete habits
        if (remainingCount > 0) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Напоминание о привычках',
            message: `У вас осталось ${remainingCount} невыполненных привычек на сегодня.`,
            buttons: [
              { title: 'Открыть трекер' }
            ],
            priority: 2
          });
        }
      }
    });
  }
});

// Handle notification button click
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (buttonIndex === 0) {
    // Open the popup
    chrome.action.openPopup();
  }
});

// Set up initial alarm when extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  // Create daily reminder at 8:00 PM
  setupDailyReminder();
  
  // Initialize notification setting if not set
  chrome.storage.local.get('notificationsEnabled', (result) => {
    if (result.notificationsEnabled === undefined) {
      chrome.storage.local.set({ notificationsEnabled: true });
    }
  });
});

// Set up daily reminder
function setupDailyReminder() {
  // Clear any existing alarms
  chrome.alarms.clear('habitReminder');
  
  // Calculate next 8:00 PM
  const now = new Date();
  const reminderTime = new Date(now);
  
  reminderTime.setHours(20, 0, 0, 0); // 8:00 PM
  
  if (reminderTime <= now) {
    reminderTime.setDate(reminderTime.getDate() + 1);
  }
  
  // Create the alarm
  chrome.alarms.create('habitReminder', {
    when: reminderTime.getTime(),
    periodInMinutes: 1440 // Daily
  });
}

// Listen for changes to notification settings
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.notificationsEnabled) {
    if (changes.notificationsEnabled.newValue) {
      setupDailyReminder();
    } else {
      chrome.alarms.clear('habitReminder');
    }
  }
});