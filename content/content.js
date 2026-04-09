// Viking Meal Tracker - Content Script
// Injects rating stars and note controls onto Kuchnia Vikinga meal cards

(function () {
  'use strict';

  let activePopover = null;

  // --- DOM: find and process meal cards ---

  function processPage() {
    // Main dashboard meal list
    document.querySelectorAll('.dashboard-meals-list > li').forEach(li => {
      if (li.dataset.vmtProcessed) return;
      const nameEl = li.querySelector('.meal-header .name');
      const contentEl = li.querySelector('.meal-content span');
      if (!nameEl || !contentEl) return;

      const category = nameEl.textContent.trim();
      const mealName = contentEl.textContent.trim();
      if (!mealName) return;

      injectControls(li, mealName, category, contentEl);
    });

    // Swap/exchange meal cards (.exchange-meals-list .single-meal)
    document.querySelectorAll('.exchange-meals-list .single-meal').forEach(card => {
      if (card.dataset.vmtProcessed) return;
      const descEl = card.querySelector('.description');
      if (!descEl) return;
      const mealName = descEl.textContent.trim();
      if (!mealName) return;
      injectControlsExchange(card, mealName, descEl);
    });
  }

  // --- Inject our UI into a meal card ---

  async function injectControls(card, mealName, category, contentEl) {
    const mealId = slugify(mealName);
    card.dataset.vmtProcessed = 'true';

    // Only read — don't save until user actually rates or adds a note
    const meal = await MealStorage.get(mealId);

    const controls = document.createElement('div');
    controls.className = 'vmt-controls';
    controls.appendChild(createStars(mealId, meal?.rating, card, mealName, category.toLowerCase()));
    controls.appendChild(createNoteIcon(mealId, mealName, !!meal?.notes, category.toLowerCase()));

    const mealContent = card.querySelector('.meal-content');
    if (mealContent) {
      mealContent.appendChild(controls);
    } else {
      card.appendChild(controls);
    }

    updateCardBadge(card, meal?.rating);
  }

  // --- Inject controls into exchange/swap meal cards ---

  async function injectControlsExchange(card, mealName, descEl) {
    const mealId = slugify(mealName);
    card.dataset.vmtProcessed = 'true';

    const meal = await MealStorage.get(mealId);

    const controls = document.createElement('div');
    controls.className = 'vmt-controls';
    controls.appendChild(createStars(mealId, meal?.rating, card, mealName, ''));
    controls.appendChild(createNoteIcon(mealId, mealName, !!meal?.notes, ''));

    const section = descEl.closest('section') || descEl.parentElement;
    section.parentNode.insertBefore(controls, section.nextSibling);

    updateCardBadge(card, meal?.rating);
  }

  // --- Star rating ---

  function createStars(mealId, currentRating, card, mealName, category) {
    const container = document.createElement('span');
    container.className = 'vmt-rating';

    for (let i = 1; i <= 5; i++) {
      const star = document.createElement('span');
      star.className = 'vmt-star' + (i <= (currentRating || 0) ? ' filled' : '');
      star.textContent = '\u2605';
      star.dataset.value = i;

      star.addEventListener('mouseenter', () => {
        container.querySelectorAll('.vmt-star').forEach((s, idx) => {
          s.classList.toggle('hovered', idx < i);
        });
      });
      star.addEventListener('mouseleave', () => {
        container.querySelectorAll('.vmt-star').forEach(s => s.classList.remove('hovered'));
      });

      star.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        const meal = await MealStorage.get(mealId);
        const newRating = (meal?.rating === i) ? null : i;
        await MealStorage.save(mealId, { name: mealName, category, rating: newRating });
        updateStars(container, newRating);
        updateCardBadge(card, newRating);
      });

      container.appendChild(star);
    }
    return container;
  }

  function updateStars(container, rating) {
    container.querySelectorAll('.vmt-star').forEach((star, idx) => {
      star.classList.toggle('filled', idx < (rating || 0));
    });
  }

  // --- Note icon + popover ---

  function createNoteIcon(mealId, mealName, hasNote, category) {
    const btn = document.createElement('button');
    btn.className = 'vmt-note-icon' + (hasNote ? ' has-note' : '');
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>';
    btn.title = hasNote ? 'Edit note' : 'Add note';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      openNotePopover(mealId, mealName, btn, category);
    });
    return btn;
  }

  function openNotePopover(mealId, mealName, anchorEl, category) {
    closePopover();

    const popover = document.createElement('div');
    popover.className = 'vmt-popover';

    const rect = anchorEl.getBoundingClientRect();
    popover.style.top = `${rect.bottom + 6}px`;
    popover.style.left = `${Math.min(rect.left, window.innerWidth - 320)}px`;

    popover.innerHTML = `
      <div class="vmt-popover-title"></div>
      <textarea placeholder="Your notes about this meal..."></textarea>
      <div class="vmt-popover-footer">
        <span class="vmt-popover-saved"></span>
        <button class="vmt-popover-close">Close</button>
      </div>
    `;

    popover.querySelector('.vmt-popover-title').textContent = mealName;
    popover.querySelector('.vmt-popover-close').addEventListener('click', closePopover);

    document.body.appendChild(popover);
    activePopover = popover;

    const textarea = popover.querySelector('textarea');
    const savedLabel = popover.querySelector('.vmt-popover-saved');

    MealStorage.get(mealId).then(meal => {
      if (meal?.notes) textarea.value = meal.notes;
      textarea.focus();
    });

    let saveTimeout;
    textarea.addEventListener('input', () => {
      clearTimeout(saveTimeout);
      savedLabel.textContent = '';
      saveTimeout = setTimeout(async () => {
        await MealStorage.save(mealId, { name: mealName, category: category || '', notes: textarea.value });
        savedLabel.textContent = 'Saved';
        anchorEl.classList.toggle('has-note', textarea.value.trim().length > 0);
        setTimeout(() => { savedLabel.textContent = ''; }, 1500);
      }, 400);
    });

    setTimeout(() => {
      document.addEventListener('click', handleOutsideClick);
      document.addEventListener('keydown', handleEscKey);
    }, 0);
  }

  function handleOutsideClick(e) {
    if (activePopover && !activePopover.contains(e.target)) closePopover();
  }
  function handleEscKey(e) {
    if (e.key === 'Escape') closePopover();
  }

  function closePopover() {
    if (activePopover) {
      activePopover.remove();
      activePopover = null;
    }
    document.removeEventListener('click', handleOutsideClick);
    document.removeEventListener('keydown', handleEscKey);
  }

  // --- Card badge (left border color) ---

  function updateCardBadge(card, rating) {
    for (let i = 1; i <= 5; i++) card.classList.remove(`vmt-rating-${i}`);
    if (rating) card.classList.add(`vmt-rating-${rating}`);
  }

  // --- Helpers ---

  function slugify(name) {
    return name
      .toLowerCase().trim()
      .replace(/[ąà]/g, 'a').replace(/[ćč]/g, 'c').replace(/[ęè]/g, 'e')
      .replace(/[łl]/g, 'l').replace(/[ńñ]/g, 'n').replace(/[óò]/g, 'o')
      .replace(/[śš]/g, 's').replace(/[źżž]/g, 'z')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // --- Init + MutationObserver ---

  processPage();

  let debounceTimer;
  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(processPage, 300);
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
