// Viking Meal Tracker - Popup Script

document.addEventListener('DOMContentLoaded', init);

async function init() {
  setupTabs();
  setupSettings();
  await renderMealList();
  setupSearch();
}

// --- Tabs ---
function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
    });
  });
}

// --- Meal List ---
async function renderMealList() {
  const meals = await MealStorage.getAll();
  const list = document.getElementById('meal-list');
  const emptyState = document.getElementById('empty-state');

  // Only show meals the user has actually interacted with (rated or noted)
  const entries = Object.entries(meals).filter(([_, m]) => m.rating || m.notes);
  if (entries.length === 0) {
    list.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  list.style.display = 'block';
  emptyState.style.display = 'none';

  renderFiltered(entries);
}

function renderFiltered(entries) {
  const search = document.getElementById('search').value.toLowerCase();
  const ratingFilter = document.getElementById('filter-rating').value;
  const categoryFilter = document.getElementById('filter-category').value;
  const sortBy = document.getElementById('sort-by').value;

  let filtered = entries.filter(([_, meal]) => {
    if (search && !meal.name?.toLowerCase().includes(search) && !meal.notes?.toLowerCase().includes(search)) {
      return false;
    }
    if (categoryFilter && meal.category !== categoryFilter) return false;
    if (ratingFilter === '0' && meal.rating) return false;
    if (ratingFilter && ratingFilter !== '0' && (meal.rating || 0) < parseInt(ratingFilter)) return false;
    return true;
  });

  filtered.sort((a, b) => {
    const [, mealA] = a;
    const [, mealB] = b;
    switch (sortBy) {
      case 'rating-desc': return (mealB.rating || 0) - (mealA.rating || 0);
      case 'rating-asc': return (mealA.rating || 0) - (mealB.rating || 0);
      case 'date': return (mealB.lastUpdated || '').localeCompare(mealA.lastUpdated || '');
      default: return (mealA.name || '').localeCompare(mealB.name || '', 'pl');
    }
  });

  const list = document.getElementById('meal-list');
  list.innerHTML = '';

  for (const [id, meal] of filtered) {
    const item = document.createElement('div');
    item.className = 'meal-item';

    const stars = renderStarsHTML(meal.rating);
    const category = meal.category && meal.category !== 'alternative'
      ? `<span class="meal-category">${meal.category}</span>`
      : '';
    const notes = meal.notes
      ? `<div class="meal-notes">${escapeHtml(meal.notes)}</div>`
      : '';

    item.innerHTML = `
      <div class="meal-name">${escapeHtml(meal.name || id)}</div>
      <div class="meal-meta">
        <span class="meal-stars">${stars}</span>
        ${category}
        <span>${meal.lastUpdated || ''}</span>
      </div>
      ${notes}
    `;

    list.appendChild(item);
  }
}

function renderStarsHTML(rating) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    html += i <= (rating || 0)
      ? '★'
      : '<span class="empty">★</span>';
  }
  return html;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// --- Search & Filters ---
function setupSearch() {
  const handler = async () => {
    const meals = await MealStorage.getAll();
    renderFiltered(Object.entries(meals));
  };

  document.getElementById('search').addEventListener('input', handler);
  document.getElementById('filter-rating').addEventListener('change', handler);
  document.getElementById('filter-category').addEventListener('change', handler);
  document.getElementById('sort-by').addEventListener('change', handler);
}

// --- Settings ---
function setupSettings() {
  // Export
  document.getElementById('btn-export').addEventListener('click', async () => {
    const csv = await MealStorage.exportCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `viking-meals-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Import
  const fileInput = document.getElementById('file-import');
  document.getElementById('btn-import').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const count = await MealStorage.importCSV(text);
    document.getElementById('import-status').textContent = `Imported ${count} meals`;
    await renderMealList();
    setTimeout(() => {
      document.getElementById('import-status').textContent = '';
    }, 3000);
  });

  // Clear - two-step confirmation
  const btnClear = document.getElementById('btn-clear');
  let clearPending = false;
  btnClear.addEventListener('click', async () => {
    if (!clearPending) {
      clearPending = true;
      btnClear.textContent = 'Click again to confirm';
      btnClear.classList.add('btn-danger-confirm');
    } else {
      await MealStorage.clearAll();
      await renderMealList();
      clearPending = false;
      btnClear.textContent = 'Clear All Data';
      btnClear.classList.remove('btn-danger-confirm');
    }
  });
}
