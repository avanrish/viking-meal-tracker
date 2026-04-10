// Viking Meal Tracker - Storage Layer
const MealStorage = {
  async getAll() {
    const result = await chrome.storage.local.get('meals');
    return result.meals || {};
  },

  async get(mealId) {
    const meals = await this.getAll();
    return meals[mealId] || null;
  },

  async save(mealId, data) {
    const meals = await this.getAll();
    const existing = meals[mealId] || {};
    meals[mealId] = {
      ...existing,
      ...data,
      lastUpdated: new Date().toISOString().split('T')[0],
      firstRated: existing.firstRated || new Date().toISOString().split('T')[0]
    };
    await chrome.storage.local.set({ meals });
    return meals[mealId];
  },

  async remove(mealId) {
    const meals = await this.getAll();
    delete meals[mealId];
    await chrome.storage.local.set({ meals });
  },

  async clearAll() {
    await chrome.storage.local.remove('meals');
  },

  slugify(name) {
    return name
      .toLowerCase()
      .trim()
      .replace(/[ąà]/g, 'a').replace(/[ćč]/g, 'c').replace(/[ęè]/g, 'e')
      .replace(/[łl]/g, 'l').replace(/[ńñ]/g, 'n').replace(/[óò]/g, 'o')
      .replace(/[śš]/g, 's').replace(/[źżž]/g, 'z')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  },

  tokenize(name) {
    return name
      .toLowerCase().trim()
      .replace(/[ąà]/g, 'a').replace(/[ćč]/g, 'c').replace(/[ęè]/g, 'e')
      .replace(/[łl]/g, 'l').replace(/[ńñ]/g, 'n').replace(/[óò]/g, 'o')
      .replace(/[śš]/g, 's').replace(/[źżž]/g, 'z')
      .split(/[^a-z0-9]+/)
      .filter(t => t.length > 1);
  },

  findSimilar(mealName, allMeals, threshold) {
    threshold = threshold || 0.4;
    const tokens = this.tokenize(mealName);
    if (tokens.length === 0) return [];

    const results = [];

    for (const [id, meal] of Object.entries(allMeals)) {
      if (!meal.rating || meal.name === mealName) continue;
      const other = this.tokenize(meal.name || '');
      if (other.length === 0) continue;

      let matches = 0;
      const used = new Set();
      for (const a of tokens) {
        for (let j = 0; j < other.length; j++) {
          if (used.has(j)) continue;
          if (a === other[j] || (a.length >= 3 && other[j].length >= 3 &&
              (a.startsWith(other[j]) || other[j].startsWith(a)) &&
              Math.abs(a.length - other[j].length) <= 3)) {
            matches++;
            used.add(j);
            break;
          }
        }
      }

      const score = matches / (tokens.length + other.length - matches);
      if (score > threshold) {
        results.push({ ...meal, id, score });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  },

  async exportCSV() {
    const meals = await this.getAll();
    const rows = [['ID', 'Name', 'Category', 'Rating', 'Notes', 'First Rated', 'Last Updated']];
    for (const [id, meal] of Object.entries(meals)) {
      rows.push([
        id,
        meal.name || '',
        meal.category || '',
        meal.rating || '',
        (meal.notes || '').replace(/"/g, '""'),
        meal.firstRated || '',
        meal.lastUpdated || ''
      ]);
    }
    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  },

  async importCSV(csvText) {
    const lines = csvText.split('\n').filter(l => l.trim());
    if (lines.length < 2) return 0;

    const meals = await this.getAll();
    let count = 0;

    for (let i = 1; i < lines.length; i++) {
      const cells = [];
      let current = '';
      let inQuotes = false;
      for (const ch of lines[i]) {
        if (ch === '"') { inQuotes = !inQuotes; }
        else if (ch === ',' && !inQuotes) { cells.push(current); current = ''; }
        else { current += ch; }
      }
      cells.push(current);

      if (cells.length >= 5) {
        const id = cells[0].trim() || MealStorage.slugify(cells[1]);
        meals[id] = {
          name: cells[1].trim(),
          category: cells[2].trim(),
          rating: cells[3].trim() ? parseInt(cells[3]) : null,
          notes: cells[4].trim(),
          firstRated: cells[5]?.trim() || new Date().toISOString().split('T')[0],
          lastUpdated: cells[6]?.trim() || new Date().toISOString().split('T')[0]
        };
        count++;
      }
    }

    await chrome.storage.local.set({ meals });
    return count;
  }
};
