const tg = window.Telegram?.WebApp || null;
const state = {
  products: [],
  categories: [],
  activeCategory: 'all',
  query: '',
  view: 'drop',
  selectedProduct: null,
  selectedSize: '',
  loading: false,
  theme: 'dark',
};

const CART_KEY = 'veast_tg_cart';
const FAVORITES_KEY = 'veast_tg_favorites';
const LAST_ORDER_KEY = 'veast_tg_last_order';
const THEME_KEY = 'veast_tg_theme';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const money = (value) => `${Number(value || 0).toLocaleString('ru-RU')} ₽`;
const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  updateCounters();
}

function toast(message) {
  const node = $('[data-toast]');
  if (!node) return;
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove('show'), 2300);
}

function getTelegramUser() {
  const user = tg?.initDataUnsafe?.user || null;
  if (!user) return null;
  return {
    id: user.id ? String(user.id) : '',
    username: user.username || '',
    firstName: user.first_name || '',
    lastName: user.last_name || '',
    languageCode: user.language_code || '',
  };
}

function getStartParam() {
  const direct = new URLSearchParams(window.location.search).get('product');
  return direct || tg?.initDataUnsafe?.start_param || '';
}

function cart() { return read(CART_KEY, []); }
function saveCart(next) { write(CART_KEY, next); renderCart(); renderProducts(); renderFeatured(); }
function favorites() { return read(FAVORITES_KEY, []); }
function saveFavorites(next) { write(FAVORITES_KEY, next); renderFavorites(); renderProducts(); renderFeatured(); }
function productById(id) { return state.products.find((item) => item.id === id || item.slug === id); }

function detectSystemTheme() {
  const telegramTheme = tg?.colorScheme;
  if (telegramTheme === 'light' || telegramTheme === 'dark') return telegramTheme;
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function updateThemeButton() {
  const icon = $('[data-theme-icon]');
  if (!icon) return;
  icon.textContent = state.theme === 'light' ? '☀︎' : '☾';
}

function setTheme(theme, persist = true) {
  state.theme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.classList.remove('theme-light', 'theme-dark');
  document.documentElement.classList.add(`theme-${state.theme}`);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', state.theme === 'light' ? '#eef2f5' : '#0b0d0f');
  updateThemeButton();

  if (tg) {
    try {
      if (tg.setHeaderColor) tg.setHeaderColor(state.theme === 'light' ? '#eef2f5' : '#0b0d0f');
      if (tg.setBackgroundColor) tg.setBackgroundColor(state.theme === 'light' ? '#eef2f5' : '#0b0d0f');
    } catch {}
  }

  if (persist) localStorage.setItem(THEME_KEY, state.theme);
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  setTheme(saved || detectSystemTheme(), false);
}

function toggleTheme() {
  setTheme(state.theme === 'dark' ? 'light' : 'dark');
  toast(state.theme === 'dark' ? 'Включена тёмная тема' : 'Включена светлая тема');
}

function buildCartItems() {
  return cart().map((item) => {
    const product = productById(item.productId);
    if (!product) return null;
    return {
      ...item,
      product: product.title,
      category: product.categoryTitle || product.category || '',
      price: Number(product.price || 0),
      subtotal: Number(product.price || 0) * Number(item.quantity || 1),
      image: product.cardImage || product.image || '',
    };
  }).filter(Boolean);
}

function cartTotal() {
  return buildCartItems().reduce((sum, item) => sum + item.subtotal, 0);
}

function updateCounters() {
  const count = cart().reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  $$('[data-cart-count]').forEach((node) => { node.textContent = String(count); });
  $$('[data-cart-count-small]').forEach((node) => { node.textContent = count ? `· ${count}` : ''; });
}

function setView(view) {
  state.view = view;
  $$('[data-screen]').forEach((screen) => screen.classList.toggle('is-active', screen.dataset.screen === view));
  $$('[data-nav]').forEach((button) => button.classList.toggle('active', button.dataset.nav === view));
  window.scrollTo({ top: 0, behavior: 'smooth' });
  renderTelegramButtons();
}

function renderTelegramButtons() {
  if (!tg) return;
  const canGoBack = !['drop'].includes(state.view);
  if (tg.BackButton) {
    canGoBack ? tg.BackButton.show() : tg.BackButton.hide();
  }
  if (!tg.MainButton) return;
  if (state.view === 'cart' && cart().length) {
    tg.MainButton.setText(`Оформить · ${money(cartTotal())}`);
    tg.MainButton.show();
  } else {
    tg.MainButton.hide();
  }
}

function filteredProducts() {
  const query = state.query.trim().toLowerCase();
  return state.products.filter((product) => {
    const categoryOk = state.activeCategory === 'all' || product.category === state.activeCategory;
    const text = [product.title, product.description, product.collection, product.categoryTitle, product.fit].join(' ').toLowerCase();
    const queryOk = !query || text.includes(query);
    return categoryOk && queryOk;
  });
}

function productCard(product, compact = false) {
  const favs = new Set(favorites());
  const isFav = favs.has(product.id);
  return `
    <article class="tg-product-card" data-product-id="${escapeHtml(product.id)}">
      <div class="tg-product-media" data-open-product="${escapeHtml(product.id)}">
        <img src="${escapeHtml(product.cardImage || product.image || '')}" alt="${escapeHtml(product.title)}" loading="lazy" />
        <button class="tg-save ${isFav ? 'active' : ''}" type="button" data-toggle-favorite="${escapeHtml(product.id)}" aria-label="Добавить в избранное">${isFav ? '★' : '☆'}</button>
      </div>
      <div class="tg-product-info">
        <div class="tg-product-line"><span>${escapeHtml(product.categoryTitle || product.category || 'VEAST')}</span><span>${escapeHtml(product.status || '')}</span></div>
        <div class="tg-product-title">${escapeHtml(product.title)}</div>
        ${compact ? '' : `<div class="tg-product-price"><span>${money(product.price)}</span><button class="tg-link-button" type="button" data-quick-add="${escapeHtml(product.id)}">в корзину</button></div>`}
      </div>
    </article>
  `;
}

function renderFeatured() {
  const node = $('[data-featured-products]');
  if (!node) return;
  const featured = state.products.slice(0, 5);
  node.innerHTML = featured.length ? featured.map((product) => productCard(product, true)).join('') : loadingSkeleton();
}

function renderCategories() {
  const node = $('[data-categories]');
  if (!node) return;
  const categories = state.categories.length ? state.categories : [{ id: 'all', title: 'Все товары' }];
  node.innerHTML = categories.map((category) => `
    <button class="tg-chip ${state.activeCategory === category.id ? 'active' : ''}" type="button" data-category="${escapeHtml(category.id)}">${escapeHtml(category.title)}</button>
  `).join('');
}

function renderProducts() {
  const node = $('[data-products]');
  if (!node) return;
  const products = filteredProducts();
  node.innerHTML = products.length
    ? products.map((product) => productCard(product)).join('')
    : `<div class="tg-empty"><strong>ничего не найдено</strong><span>поменяй поиск или категорию.</span></div>`;
}

function renderFavorites() {
  const node = $('[data-favorites]');
  if (!node) return;
  const favSet = new Set(favorites());
  const items = state.products.filter((product) => favSet.has(product.id));
  node.innerHTML = items.length
    ? items.map((product) => productCard(product)).join('')
    : `<div class="tg-empty"><strong>избранное пустое</strong><span>сохраняй вещи, чтобы быстро вернуться к ним.</span></div>`;
}

function loadingSkeleton() {
  return Array.from({ length: 4 }, () => `
    <article class="tg-product-card">
      <div class="tg-product-media"></div>
      <div class="tg-product-info"><div class="tg-product-title">загрузка...</div></div>
    </article>
  `).join('');
}

function openProduct(productId) {
  const product = productById(productId);
  if (!product) return;
  state.selectedProduct = product;
  state.selectedSize = product.sizes?.[0] || 'OS';
  const sheet = $('[data-product-sheet]');
  const panel = $('[data-sheet-panel]');
  panel.innerHTML = productSheet(product);
  sheet.classList.add('is-open');
  sheet.setAttribute('aria-hidden', 'false');
  if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
}

function closeProduct() {
  const sheet = $('[data-product-sheet]');
  sheet.classList.remove('is-open');
  sheet.setAttribute('aria-hidden', 'true');
}

function productSheet(product) {
  const favSet = new Set(favorites());
  const sizes = (product.sizes || ['OS']).map((size) => `
    <button class="tg-size ${size === state.selectedSize ? 'active' : ''}" type="button" data-select-size="${escapeHtml(size)}">${escapeHtml(size)}</button>
  `).join('');
  return `
    <img class="tg-sheet-image" src="${escapeHtml(product.image || product.cardImage || '')}" alt="${escapeHtml(product.title)}" />
    <div class="tg-sheet-body">
      <p class="tg-kicker">${escapeHtml(product.collection || 'VEAST')}</p>
      <h2 class="tg-sheet-title">${escapeHtml(product.title)}</h2>
      <p class="tg-sheet-description">${escapeHtml(product.description || '')}</p>
      <div class="tg-total-row"><span>Цена</span><strong>${money(product.price)}</strong></div>
      <div class="tg-size-grid">${sizes}</div>
      <div class="tg-detail-list">
        <div><strong>Посадка</strong>${escapeHtml(product.fit || 'VEAST fit')}</div>
        <div><strong>Материал</strong>${escapeHtml(product.material || 'Материал уточняется')}</div>
        <div><strong>Уход</strong>${escapeHtml(product.care || 'Деликатный уход')}</div>
      </div>
      <button class="tg-button tg-button-primary full" type="button" data-add-selected="${escapeHtml(product.id)}">Добавить в корзину</button>
      <button class="tg-button full" type="button" data-toggle-favorite="${escapeHtml(product.id)}">${favSet.has(product.id) ? 'Убрать из избранного' : 'Сохранить в избранное'}</button>
    </div>
  `;
}

function addToCart(productId, size = '') {
  const product = productById(productId);
  if (!product) return;
  const selectedSize = size || product.sizes?.[0] || 'OS';
  const lineId = `${product.id}-${selectedSize}`;
  const next = cart();
  const existing = next.find((item) => item.lineId === lineId);
  if (existing) existing.quantity += 1;
  else next.push({ lineId, productId: product.id, size: selectedSize, quantity: 1 });
  saveCart(next);
  toast(`${product.title} добавлен в корзину`);
  if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
}

function changeQuantity(lineId, delta) {
  const next = cart().map((item) => item.lineId === lineId ? { ...item, quantity: Number(item.quantity || 1) + delta } : item)
    .filter((item) => item.quantity > 0);
  saveCart(next);
}

function toggleFavorite(productId) {
  const favSet = new Set(favorites());
  favSet.has(productId) ? favSet.delete(productId) : favSet.add(productId);
  saveFavorites([...favSet]);
  if (state.selectedProduct?.id === productId) openProduct(productId);
}

function renderCart() {
  const list = $('[data-cart-list]');
  const summary = $('[data-cart-summary]');
  if (!list || !summary) return;
  const items = buildCartItems();
  if (!items.length) {
    list.innerHTML = `<div class="tg-empty"><strong>корзина пустая</strong><span>добавь вещь из каталога, чтобы оформить заказ.</span></div>`;
    summary.innerHTML = `<button class="tg-button tg-button-primary full" type="button" data-view="catalog">В каталог</button>`;
    renderTelegramButtons();
    return;
  }
  list.innerHTML = items.map((item) => `
    <article class="tg-cart-item">
      <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.product)}" />
      <div>
        <p class="tg-cart-title">${escapeHtml(item.product)}</p>
        <p class="tg-muted">Размер ${escapeHtml(item.size)} · ${money(item.price)}</p>
        <div class="tg-cart-controls">
          <div class="tg-qty">
            <button type="button" data-qty="-1" data-line-id="${escapeHtml(item.lineId)}">−</button>
            <span>${item.quantity}</span>
            <button type="button" data-qty="1" data-line-id="${escapeHtml(item.lineId)}">+</button>
          </div>
          <button class="tg-link-button" type="button" data-remove-line="${escapeHtml(item.lineId)}">убрать</button>
        </div>
      </div>
    </article>
  `).join('');
  summary.innerHTML = `
    <div class="tg-total-row"><span>Позиций</span><strong>${items.reduce((sum, item) => sum + item.quantity, 0)}</strong></div>
    <div class="tg-total-row"><span>Товары</span><strong>${money(cartTotal())}</strong></div>
    <div class="tg-total-row"><span>Оплата</span><strong>после подтверждения</strong></div>
    <button class="tg-button tg-button-primary full" type="button" data-view="checkout">Оформить заказ</button>
  `;
  renderTelegramButtons();
}

function prefillCheckout() {
  const form = $('[data-checkout-form]');
  if (!form) return;
  const user = getTelegramUser();
  if (user) {
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    if (name && !form.elements.name.value) form.elements.name.value = name;
    if (user.username && !form.elements.phone.value) form.elements.phone.value = `@${user.username}`;
  }
  if (!form.elements.city.value) form.elements.city.value = 'Сургут';
}

function buildOrder(form) {
  const items = buildCartItems();
  const user = getTelegramUser();
  const email = String(form.elements.email.value || '').trim()
    || `telegram-${user?.id || Date.now()}@veast.local`;
  const commentParts = [
    String(form.elements.comment.value || '').trim(),
    user?.username ? `Telegram: @${user.username}` : '',
    user?.id ? `Telegram ID: ${user.id}` : '',
  ].filter(Boolean);

  return {
    customer: {
      name: form.elements.name.value,
      phone: form.elements.phone.value,
      email,
      city: form.elements.city.value,
      address: form.elements.address.value,
      delivery: form.elements.delivery.value,
      payment: 'После подтверждения',
      comment: commentParts.join('\n'),
      privacyAccepted: Boolean(form.elements.privacy.checked),
    },
    items,
    total: cartTotal(),
    telegram: user,
  };
}

async function submitOrder(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!cart().length) {
    toast('Сначала добавь товар в корзину');
    setView('catalog');
    return;
  }
  const button = form.querySelector('button[type="submit"]');
  const original = button.textContent;
  button.disabled = true;
  button.textContent = 'Отправляем...';

  try {
    const order = buildOrder(form);
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || `HTTP ${response.status}`);
    localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(data.order));
    saveCart([]);
    $('[data-success-text]').textContent = `Заказ ${data.order?.id || ''} создан. VEAST свяжется с тобой для подтверждения.`;
    setView('success');
    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
  } catch (error) {
    toast(error.message || 'Не удалось отправить заказ');
    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

async function loadProducts() {
  state.loading = true;
  $('[data-products]').innerHTML = loadingSkeleton();
  $('[data-featured-products]').innerHTML = loadingSkeleton();
  try {
    const response = await fetch('/api/products', { headers: { Accept: 'application/json' } });
    const data = await response.json();
    state.products = Array.isArray(data.products) ? data.products : [];
    state.categories = Array.isArray(data.categories) ? data.categories : [{ id: 'all', title: 'Все товары' }];
    renderAll();

    const start = getStartParam();
    if (start) {
      const product = productById(start.replace(/^product_/, ''));
      if (product) setTimeout(() => openProduct(product.id), 250);
    }
  } catch (error) {
    $('[data-products]').innerHTML = `<div class="tg-empty"><strong>каталог не загрузился</strong><span>${escapeHtml(error.message)}</span></div>`;
    toast('Каталог временно не загрузился');
  } finally {
    state.loading = false;
  }
}

function renderAll() {
  renderCategories();
  renderProducts();
  renderFeatured();
  renderFavorites();
  renderCart();
  updateCounters();
}

function bindEvents() {
  document.addEventListener('click', (event) => {
    const target = event.target.closest('button, [data-open-product]');
    if (!target) return;

    if (target.dataset.view) {
      setView(target.dataset.view);
      if (target.dataset.view === 'checkout') prefillCheckout();
    }
    if (target.dataset.nav) setView(target.dataset.nav);
    if (target.dataset.openCart !== undefined) setView('cart');
    if (target.dataset.refresh !== undefined) loadProducts();
    if (target.dataset.category) {
      state.activeCategory = target.dataset.category;
      renderCategories();
      renderProducts();
    }
    if (target.dataset.openProduct) openProduct(target.dataset.openProduct);
    if (target.dataset.closeSheet !== undefined) closeProduct();
    if (target.dataset.selectSize) {
      state.selectedSize = target.dataset.selectSize;
      if (state.selectedProduct) $('[data-sheet-panel]').innerHTML = productSheet(state.selectedProduct);
    }
    if (target.dataset.addSelected) {
      addToCart(target.dataset.addSelected, state.selectedSize);
      closeProduct();
    }
    if (target.dataset.quickAdd) addToCart(target.dataset.quickAdd);
    if (target.dataset.toggleFavorite) toggleFavorite(target.dataset.toggleFavorite);
    if (target.dataset.qty) changeQuantity(target.dataset.lineId, Number(target.dataset.qty));
    if (target.dataset.removeLine) changeQuantity(target.dataset.removeLine, -9999);
    if (target.dataset.clearCart !== undefined) saveCart([]);
    if (target.dataset.themeToggle !== undefined) toggleTheme();
  });

  $('[data-search]')?.addEventListener('input', (event) => {
    state.query = event.currentTarget.value;
    renderProducts();
  });

  $('[data-checkout-form]')?.addEventListener('submit', submitOrder);

  if (tg?.BackButton) {
    tg.BackButton.onClick(() => {
      if (state.view === 'checkout') setView('cart');
      else if (state.view !== 'drop') setView('drop');
    });
  }
  if (tg?.MainButton) {
    tg.MainButton.onClick(() => {
      if (state.view === 'cart' && cart().length) {
        setView('checkout');
        prefillCheckout();
      }
    });
  }
}

function initTelegram() {
  if (!tg) return;
  tg.ready();
  tg.expand();
  document.documentElement.classList.add('is-telegram');
}

initTheme();
initTelegram();
bindEvents();
updateCounters();
loadProducts();
