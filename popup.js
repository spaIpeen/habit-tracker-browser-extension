// DOM Elements
const habitList = document.getElementById('habit-list');
const newHabitInput = document.getElementById('new-habit');
const addHabitBtn = document.getElementById('add-habit');
const categorySelect = document.getElementById('habit-category');
const filterSelect = document.getElementById('filter-habits');
const statsContainer = document.getElementById('stats-container');
const exportBtn = document.getElementById('export-data');
const importBtn = document.getElementById('import-data');
const fileInput = document.getElementById('import-file');
const themeToggle = document.getElementById('theme-toggle');
const searchInput = document.getElementById('search-habits');
const notificationsToggle = document.getElementById('notifications-toggle');

// Constants
const CATEGORIES = ['Здоровье', 'Продуктивность', 'Обучение', 'Спорт', 'Другое'];
const MAX_STREAK_DISPLAY = 30; // Days to display in streak visualization

// State
let currentFilter = 'all';
let searchTerm = '';

// Initialize the app
function initApp() {
  // Populate category dropdown
  CATEGORIES.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });
  
  // Set up event listeners
  addHabitBtn.addEventListener('click', addHabit);
  exportBtn.addEventListener('click', exportData);
  importBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', importData);
  themeToggle.addEventListener('click', toggleTheme);
  filterSelect.addEventListener('change', (e) => {
    currentFilter = e.target.value;
    loadHabits();
  });
  searchInput.addEventListener('input', (e) => {
    searchTerm = e.target.value.toLowerCase();
    loadHabits();
  });
  
  // Set up notifications toggle
  if (notificationsToggle) {
    notificationsToggle.addEventListener('change', toggleNotifications);
    
    // Initialize notifications toggle state
    chrome.storage.local.get('notificationsEnabled', (result) => {
      notificationsToggle.checked = result.notificationsEnabled !== false;
    });
  }
  
  // Load saved theme preference
  chrome.storage.local.get('theme', (result) => {
    if (result.theme === 'dark') {
      document.body.classList.add('dark-theme');
      themeToggle.textContent = '☀️';
    }
  });
  
  // Load habits
  loadHabits();
}

// Cache for habit data to reduce storage reads
let habitsCache = null;

// Load habits from storage with caching
function loadHabits() {
  // Use cached data if available, otherwise fetch from storage
  if (habitsCache) {
    renderHabits(habitsCache);
  } else {
    chrome.storage.local.get('habits', (result) => {
      habitsCache = result.habits || [];
      renderHabits(habitsCache);
    });
  }
}

// Render habits with filtering
function renderHabits(habits) {
  // Clear the list with a more performant method
  while (habitList.firstChild) {
    habitList.removeChild(habitList.firstChild);
  }
  
  // Create a document fragment for better performance
  const fragment = document.createDocumentFragment();
  
  // Filter habits based on current filter and search term
  let filteredHabits = habits;
  
  // Apply filters
  if (currentFilter !== 'all' || searchTerm) {
    filteredHabits = habits.filter(habit => {
      // Category filter
      if (currentFilter !== 'all' && habit.category !== currentFilter) {
        return false;
      }
      
      // Search filter
      if (searchTerm && !habit.name.toLowerCase().includes(searchTerm)) {
        return false;
      }
      
      return true;
    });
  }
  
  // Show empty state or render habits
  if (filteredHabits.length === 0) {
    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'empty-message';
    emptyMessage.textContent = searchTerm 
      ? 'Привычки не найдены' 
      : 'Добавьте свою первую привычку!';
    fragment.appendChild(emptyMessage);
  } else {
    // Group habits by category
    const habitsByCategory = {};
    
    // Add "Other" category for habits without a category
    filteredHabits.forEach(habit => {
      const category = habit.category || 'Другое';
      if (!habitsByCategory[category]) {
        habitsByCategory[category] = [];
      }
      habitsByCategory[category].push(habit);
    });
    
    // Get saved collapsed state or initialize
    chrome.storage.local.get('collapsedCategories', (result) => {
      const collapsedCategories = result.collapsedCategories || {};
      
      // Create category sections
      Object.keys(habitsByCategory).forEach(category => {
        const habits = habitsByCategory[category];
        const isCollapsed = collapsedCategories[category] || false;
        
        // Create category section
        const categorySection = document.createElement('div');
        categorySection.className = 'category-section';
        
        // Create category header
        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'category-header';
        // Add category-specific class for styling
        categoryHeader.classList.add(category.toLowerCase());
        categoryHeader.addEventListener('click', () => toggleCategory(category));
        
        // Create category title
        const categoryTitle = document.createElement('div');
        categoryTitle.className = 'category-title';
        
        // Add category icon based on category name
        let categoryIcon = '📝';
        if (category === 'Здоровье') categoryIcon = '❤️';
        if (category === 'Продуктивность') categoryIcon = '⚡';
        if (category === 'Обучение') categoryIcon = '📚';
        if (category === 'Спорт') categoryIcon = '🏃';
        if (category === 'Другое') categoryIcon = '📌';
        
        categoryTitle.innerHTML = `${categoryIcon} ${category}`;
        
        // Create category count
        const categoryCount = document.createElement('span');
        categoryCount.className = 'category-count';
        categoryCount.textContent = habits.length;
        categoryTitle.appendChild(categoryCount);
        
        // Create toggle icon
        const toggleIcon = document.createElement('span');
        toggleIcon.className = 'category-toggle' + (isCollapsed ? ' collapsed' : '');
        toggleIcon.textContent = '▼';
        
        categoryHeader.appendChild(categoryTitle);
        categoryHeader.appendChild(toggleIcon);
        
        // Create category content
        const categoryContent = document.createElement('div');
        categoryContent.className = 'category-content' + (isCollapsed ? ' collapsed' : '');
        
        // Add habits to category content
        habits.forEach((habit, index) => {
          createHabitElement(habit, index, habits, categoryContent);
        });
        
        // Add category section to fragment
        categorySection.appendChild(categoryHeader);
        categorySection.appendChild(categoryContent);
        fragment.appendChild(categorySection);
      });
      
      // Add all elements to the DOM at once
      habitList.appendChild(fragment);
      
      // Update statistics
      updateStats(habits);
    });
  }
}

// Toggle category collapse state
function toggleCategory(category) {
  chrome.storage.local.get('collapsedCategories', (result) => {
    const collapsedCategories = result.collapsedCategories || {};
    collapsedCategories[category] = !collapsedCategories[category];
    
    chrome.storage.local.set({ collapsedCategories }, () => {
      // Update UI
      const categoryHeaders = document.querySelectorAll('.category-header');
      categoryHeaders.forEach(header => {
        if (header.querySelector('.category-title').textContent.includes(category)) {
          const toggle = header.querySelector('.category-toggle');
          const content = header.nextElementSibling;
          
          if (collapsedCategories[category]) {
            toggle.classList.add('collapsed');
            content.classList.add('collapsed');
          } else {
            toggle.classList.remove('collapsed');
            content.classList.remove('collapsed');
          }
        }
      });
    });
  });
}

// Create a habit list item
function createHabitElement(habit, index, allHabits, container) {
  const li = document.createElement('li');
  li.className = 'habit-item';
  if (habit.category) {
    li.classList.add(`category-${habit.category.toLowerCase()}`);
  }
  
  // Add accessibility attributes
  li.setAttribute('role', 'listitem');
  li.setAttribute('aria-label', `Привычка: ${habit.name}, Категория: ${habit.category || 'Другое'}`);
  
  // Habit content container
  const contentDiv = document.createElement('div');
  contentDiv.className = 'habit-content';
  
  // Habit header (name and category)
  const headerDiv = document.createElement('div');
  headerDiv.className = 'habit-header';
  
  const label = document.createElement('label');
  label.className = 'habit-name';
  label.title = habit.name; // Add tooltip for long names
  label.textContent = habit.name;
  
  // We don't need to show category in the card since we're grouping by category
  // const category = document.createElement('span');
  // category.className = 'habit-category';
  // category.textContent = habit.category || 'Другое';
  
  headerDiv.appendChild(label);
  // headerDiv.appendChild(category);
  
  // Streak visualization
  const streakDiv = document.createElement('div');
  streakDiv.className = 'streak-container';
  
  const streak = calculateStreak(habit);
  const streakCount = document.createElement('span');
  streakCount.className = 'streak-count';
  streakCount.textContent = `${streak} дн.`;
  
  const streakVisual = document.createElement('div');
  streakVisual.className = 'streak-visual';
  streakVisual.setAttribute('aria-label', `Серия из ${streak} дней`);
  streakVisual.setAttribute('role', 'img');
  
  // Create streak visualization (optimize by creating elements only once)
  const history = habit.history || [];
  const today = new Date();
  const streakDaysFragment = document.createDocumentFragment();
  
  // Limit to 10 days for more compact display
  const displayDays = Math.min(10, MAX_STREAK_DISPLAY);
  
  for (let i = 0; i < displayDays; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = formatDate(date);
    
    const day = document.createElement('div');
    day.className = 'streak-day';
    
    if (history.includes(dateStr)) {
      day.classList.add('completed');
    }
    
    streakDaysFragment.appendChild(day);
  }
  
  streakVisual.appendChild(streakDaysFragment);
  streakDiv.appendChild(streakCount);
  streakDiv.appendChild(streakVisual);
  
  // Actions container
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'habit-actions';
  
  // Checkbox for today
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'habit-checkbox';
  checkbox.checked = isCompletedToday(habit);
  checkbox.setAttribute('aria-label', `Отметить привычку ${habit.name} как выполненную сегодня`);
  
  // Use event delegation for better performance
  checkbox.dataset.index = index;
  checkbox.addEventListener('change', () => {
    toggleHabitCompletion(habit, allHabits);
  });
  
  // Action buttons container
  const actionButtons = document.createElement('div');
  actionButtons.className = 'action-buttons';
  
  // Edit button
  const editBtn = document.createElement('button');
  editBtn.className = 'edit-habit';
  editBtn.innerHTML = '✏️';
  editBtn.title = 'Редактировать привычку';
  editBtn.setAttribute('aria-label', `Редактировать привычку ${habit.name}`);
  
  // Use event delegation
  editBtn.dataset.index = index;
  editBtn.addEventListener('click', () => {
    editHabit(habit, index, allHabits);
  });
  
  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-habit';
  deleteBtn.innerHTML = '🗑️';
  deleteBtn.title = 'Удалить привычку';
  deleteBtn.setAttribute('aria-label', `Удалить привычку ${habit.name}`);
  
  // Use event delegation
  deleteBtn.dataset.index = index;
  deleteBtn.addEventListener('click', () => {
    if (confirm(`Удалить привычку "${habit.name}"?`)) {
      deleteHabit(index, allHabits);
    }
  });
  
  // Add buttons to action buttons container
  actionButtons.appendChild(editBtn);
  actionButtons.appendChild(deleteBtn);
  
  // Add checkbox and action buttons to actions div
  actionsDiv.appendChild(checkbox);
  actionsDiv.appendChild(actionButtons);
  
  // Assemble the habit item
  contentDiv.appendChild(headerDiv);
  contentDiv.appendChild(streakDiv);
  
  li.appendChild(contentDiv);
  li.appendChild(actionsDiv);
  
  // Add to container
  container.appendChild(li);
}

// Add a new habit
function addHabit() {
  const name = newHabitInput.value.trim();
  if (!name) return;
  
  const category = categorySelect.value;
  
  chrome.storage.local.get('habits', (result) => {
    const habits = result.habits || [];
    const newHabit = { 
      name, 
      category, 
      history: [], 
      createdAt: formatDate(new Date())
    };
    
    habits.push(newHabit);
    saveHabits(habits);
    newHabitInput.value = '';
    categorySelect.value = CATEGORIES[0];
    
    // Show success message
    showNotification('Привычка добавлена!');
  });
}

// Edit an existing habit
function editHabit(habit, index, allHabits) {
  const newName = prompt('Введите новое название привычки:', habit.name);
  if (!newName || newName.trim() === '') return;
  
  const newCategory = prompt('Введите категорию (Здоровье, Продуктивность, Обучение, Спорт, Другое):', habit.category);
  
  habit.name = newName.trim();
  habit.category = CATEGORIES.includes(newCategory) ? newCategory : 'Другое';
  
  saveHabits(allHabits);
  showNotification('Привычка обновлена!');
}

// Delete a habit
function deleteHabit(index, allHabits) {
  allHabits.splice(index, 1);
  saveHabits(allHabits);
  showNotification('Привычка удалена!');
}

// Toggle habit completion for today
function toggleHabitCompletion(habit, allHabits) {
  const today = formatDate(new Date());
  
  if (!habit.history) {
    habit.history = [];
  }
  
  const completedToday = habit.history.includes(today);
  
  if (completedToday) {
    habit.history = habit.history.filter(date => date !== today);
  } else {
    habit.history.push(today);
  }
  
  saveHabits(allHabits);
}

// Check if habit is completed today
function isCompletedToday(habit) {
  const today = formatDate(new Date());
  return habit.history && habit.history.includes(today);
}

// Calculate current streak
function calculateStreak(habit) {
  if (!habit.history || habit.history.length === 0) {
    return 0;
  }
  
  // Sort dates in descending order
  const sortedDates = [...habit.history].sort((a, b) => new Date(b) - new Date(a));
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let currentDate = new Date(today);
  let streak = 0;
  
  // Check if completed today
  if (sortedDates.includes(formatDate(currentDate))) {
    streak = 1;
  } else {
    return 0; // Streak broken if not completed today
  }
  
  // Check previous days
  for (let i = 1; i <= 100; i++) { // Limit to 100 days to avoid infinite loops
    currentDate.setDate(currentDate.getDate() - 1);
    const dateStr = formatDate(currentDate);
    
    if (sortedDates.includes(dateStr)) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

// Update statistics display
function updateStats(habits) {
  if (!statsContainer) return;
  
  statsContainer.innerHTML = '';
  
  if (habits.length === 0) {
    statsContainer.innerHTML = '<p>Добавьте привычки для отображения статистики</p>';
    return;
  }
  
  // Total habits
  const totalHabits = habits.length;
  
  // Habits completed today
  const today = formatDate(new Date());
  const completedToday = habits.filter(habit => 
    habit.history && habit.history.includes(today)
  ).length;
  
  // Completion rate
  const completionRate = totalHabits > 0 
    ? Math.round((completedToday / totalHabits) * 100) 
    : 0;
  
  // Longest streak
  let longestStreak = 0;
  let longestStreakHabit = '';
  
  habits.forEach(habit => {
    const streak = calculateStreak(habit);
    if (streak > longestStreak) {
      longestStreak = streak;
      longestStreakHabit = habit.name;
    }
  });
  
  // Create stats elements
  const statsHTML = `
    <div class="stat-item">
      <span class="stat-value">${totalHabits}</span>
      <span class="stat-label">Всего привычек</span>
    </div>
    <div class="stat-item">
      <span class="stat-value">${completedToday}</span>
      <span class="stat-label">Выполнено сегодня</span>
    </div>
    <div class="stat-item">
      <span class="stat-value">${completionRate}%</span>
      <span class="stat-label">Выполнено</span>
    </div>
    <div class="stat-item">
      <span class="stat-value">${longestStreak}</span>
      <span class="stat-label">Лучшая серия${longestStreakHabit ? ': ' + longestStreakHabit : ''}</span>
    </div>
  `;
  
  statsContainer.innerHTML = statsHTML;
}

// Export data to JSON file
function exportData() {
  chrome.storage.local.get('habits', (result) => {
    const habits = result.habits || [];
    
    const dataStr = JSON.stringify(habits, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `habit-tracker-export-${formatDate(new Date())}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showNotification('Данные экспортированы!');
  });
}

// Import data from JSON file
function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  
  reader.onload = function(e) {
    try {
      const habits = JSON.parse(e.target.result);
      
      if (!Array.isArray(habits)) {
        throw new Error('Неверный формат файла');
      }
      
      if (confirm(`Импортировать ${habits.length} привычек? Текущие данные будут заменены.`)) {
        saveHabits(habits);
        showNotification('Данные импортированы!');
      }
    } catch (error) {
      alert(`Ошибка импорта: ${error.message}`);
    }
    
    // Reset file input
    fileInput.value = '';
  };
  
  reader.readAsText(file);
}

// Toggle between light and dark theme
function toggleTheme() {
  const isDarkTheme = document.body.classList.toggle('dark-theme');
  themeToggle.textContent = isDarkTheme ? '☀️' : '🌙';
  
  chrome.storage.local.set({ theme: isDarkTheme ? 'dark' : 'light' });
}

// Toggle notifications on/off
function toggleNotifications() {
  const enabled = notificationsToggle.checked;
  
  chrome.storage.local.set({ notificationsEnabled: enabled }, () => {
    if (enabled) {
      // Request notification permission if needed
      if (Notification.permission !== 'granted') {
        Notification.requestPermission();
      }
      
      showNotification('Напоминания включены');
    } else {
      showNotification('Напоминания отключены');
    }
  });
}

// Show notification message
function showNotification(message) {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.classList.add('show');
  
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

// Save habits to storage with caching
function saveHabits(habits) {
  // Update the cache immediately for better responsiveness
  habitsCache = [...habits];
  
  // Debounced storage update
  if (saveHabits.timeoutId) {
    clearTimeout(saveHabits.timeoutId);
  }
  
  saveHabits.timeoutId = setTimeout(() => {
    chrome.storage.local.set({ habits }, () => {
      // Refresh the UI
      renderHabits(habitsCache);
    });
  }, 100); // Small delay to batch rapid changes
}

// Format date as YYYY-MM-DD
function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
