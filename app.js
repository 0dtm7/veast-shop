import { categories, formatPrice, getProductById, products } from './data/products.js';

const CART_KEY = 'veast_cart_v1';
const FAVORITES_KEY = 'veast_favorites_v1';
const ORDERS_KEY = 'veast_orders_v1';
const LAST_ORDER_KEY = 'veast_last_order_v1';
const THEME_KEY = 'veast_theme_v1';

export function readStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  updateHeaderCounters();
}

export function getCart() { return readStorage(CART_KEY, []); }
export function getFavorites() { return readStorage(FAVORITES_KEY, []); }
export function getLocalOrders() { return readStorage(ORDERS_KEY, []); }
export function getLastOrder() { return readStorage(LAST_ORDER_KEY, null); }
export function saveCart(cart) { writeStorage(CART_KEY, cart); }
export function saveFavorites(favorites) { writeStorage(FAVORITES_KEY, favorites); }
export function saveLocalOrders(orders) { writeStorage(ORDERS_KEY, orders); }
export function saveLastOrder(order) { writeStorage(LAST_ORDER_KEY, order); }

export function getTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {}
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme = getTheme()) {
  const normalized = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = normalized;
  document.documentElement.style.colorScheme = normalized;
  updateThemeButton(normalized);
  return normalized;
}

export function setTheme(theme) {
  const normalized = theme === 'dark' ? 'dark' : 'light';
  try { localStorage.setItem(THEME_KEY, normalized); } catch {}
  applyTheme(normalized);
  toast(normalized === 'dark' ? 'Включена тёмная тема VEAST' : 'Включена светлая тема VEAST');
}

export function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

applyTheme();

export function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function addToCart(productId, size = '', quantity = 1) {
  const product = getProductById(productId);
  if (!product) return;
  const normalizedSize = product.sizes.includes(size) ? size : product.sizes[0] || 'OS';
  const normalizedQuantity = Math.max(1, Number(quantity) || 1);
  const cart = getCart();
  const lineId = `${productId}-${normalizedSize}`;
  const existing = cart.find((item) => item.lineId === lineId);
  if (existing) existing.quantity += normalizedQuantity;
  else cart.push({ lineId, productId, size: normalizedSize, quantity: normalizedQuantity });
  saveCart(cart);
  toast(`Добавлено в корзину: ${product.title}, размер ${normalizedSize}`);
}

export function removeFromCart(lineId) {
  saveCart(getCart().filter((item) => item.lineId !== lineId));
}

export function changeCartQuantity(lineId, quantity) {
  const next = Number(quantity);
  if (next <= 0) return removeFromCart(lineId);
  saveCart(getCart().map((item) => item.lineId === lineId ? { ...item, quantity: next } : item));
}

export function clearCart() { saveCart([]); }

export function toggleFavorite(productId) {
  const product = getProductById(productId);
  const favorites = new Set(getFavorites());
  const wasActive = favorites.has(productId);
  wasActive ? favorites.delete(productId) : favorites.add(productId);
  saveFavorites([...favorites]);
  const active = favorites.has(productId);
  toast(active
    ? `Добавлено в избранное: ${product ? product.title : 'товар'}`
    : `Удалено из избранного: ${product ? product.title : 'товар'}`);
  return active;
}

export function calculateCart(cart = getCart()) {
  return cart.reduce((sum, item) => {
    const product = getProductById(item.productId);
    return sum + (product ? product.price * item.quantity : 0);
  }, 0);
}

export function buildCartItems(cart = getCart()) {
  return cart.map((item) => {
    const product = getProductById(item.productId);
    if (!product) return null;
    return {
      ...item,
      product: product.title,
      price: product.price,
      category: product.categoryTitle,
      image: product.cardImage || product.image,
      subtotal: product.price * item.quantity,
    };
  }).filter(Boolean);
}

export function productCard(product) {
  const favorites = new Set(getFavorites());
  const discount = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;
  const badgeMap = {
    new: 'Новинка',
    sale: 'Sale',
    limited: 'Limited',
    bestseller: 'Хит',
    drop: 'Orbit Drop',
  };
  const badges = [...product.badges.map((badge) => badgeMap[badge] || badge), discount ? '-' + discount + '%' : ''].filter(Boolean);
  const badgeHtml = badges.map((badge) => '<span>' + escapeHtml(badge) + '</span>').join('');
  const sizesHtml = product.sizes.map((size) => '<span>' + escapeHtml(size) + '</span>').join('');
  const featureTagsHtml = (product.featureTags || []).slice(0, 4).map((tag) => '<span>' + escapeHtml(tag) + '</span>').join('');
  const heartIcon = '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.9a5.4 5.4 0 0 0-7.6 0L12 6.1l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21.3l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  return [
    '<article class="product-card" data-product-card="' + product.id + '">',
      '<a class="product-media" href="product.html?id=' + product.id + '" aria-label="Открыть карточку товара ' + escapeHtml(product.title) + '">',
        '<img class="product-img product-img-front" src="' + (product.cardImage || product.image) + '" alt="' + escapeHtml(product.title) + '" loading="lazy" />',
        '<img class="product-img product-img-back" src="' + (product.cardImageAlt || product.cardImage || product.imageAlt || product.image) + '" alt="' + escapeHtml(product.title) + ', второй вид" loading="lazy" />',
        '<div class="badge-row">' + badgeHtml + '</div>',
        '<div class="media-quick-view">Подробнее</div>',
      '</a>',
      '<div class="product-info">',
        '<div class="product-line"><span>' + escapeHtml(product.categoryTitle) + '</span><span>' + escapeHtml(product.status) + '</span></div>',
        '<a class="product-title" href="product.html?id=' + product.id + '">' + escapeHtml(product.title) + '</a>',
        '<p class="product-collection">' + escapeHtml(product.collection) + ' · ' + escapeHtml(product.fit) + '</p>',
        '<p class="product-description">' + escapeHtml(product.description) + '</p>',
        '<div class="mini-tag-row" aria-label="Коммерческие теги товара">' + featureTagsHtml + '</div>',
        '<div class="price-line"><strong>' + formatPrice(product.price) + '</strong>' + (product.oldPrice ? '<s>' + formatPrice(product.oldPrice) + '</s>' : '') + '</div>',
        '<div class="sizes-line" aria-label="Доступные размеры">' + sizesHtml + '</div>',
        '<div class="card-actions card-actions-shop">',
          '<button class="button button-dark" type="button" data-add-to-cart="' + product.id + '">В корзину</button>',
          '<button class="square-button favorite-action ' + (favorites.has(product.id) ? 'active' : '') + '" type="button" data-favorite="' + product.id + '" aria-label="Добавить в избранное" aria-pressed="' + favorites.has(product.id) + '">' + heartIcon + '</button>',
        '</div>',
        '<a class="card-detail-link" href="product.html?id=' + product.id + '">Размеры, состав и доставка</a>',
      '</div>',
    '</article>',
  ].join('');
}

export function renderHeader(active = '') {
  const main = document.querySelector('main');
  if (main && !main.id) main.id = 'mainContent';
  const el = document.querySelector('[data-header]');
  if (!el) return;
  const heartIcon = '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.9a5.4 5.4 0 0 0-7.6 0L12 6.1l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21.3l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const cartIcon = '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.2 8.4h11.6l-.8 10.1a2 2 0 0 1-2 1.8H9a2 2 0 0 1-2-1.8L6.2 8.4Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 8.4V7a3 3 0 0 1 6 0v1.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  el.innerHTML = `
    <a class="skip-link" href="#mainContent">Перейти к содержимому</a>
    <header class="site-header">
      <a class="brand" href="index.html" aria-label="VEAST, главная">
        <span class="brand-mark"><img class="brand-logo" src="assets/veast-logo-mark.png" alt="" /></span>
        <span>VEAST</span>
      </a>
      <nav class="desktop-nav" aria-label="Основная навигация">
        <a class="${active === 'home' ? 'active' : ''}" href="index.html">Главная</a>
        <a class="${active === 'catalog' ? 'active' : ''}" href="catalog.html">Каталог</a>
        <a class="${active === 'favorites' ? 'active' : ''}" href="favorites.html">Избранное</a>
        <a class="${active === 'account' ? 'active' : ''}" href="account.html">Кабинет</a>
        <a class="${active === 'contacts' ? 'active' : ''}" href="contacts.html">Контакты</a>
      </nav>
      <div class="header-actions">
        <form class="search-box" action="catalog.html" method="get">
          <label class="visually-hidden" for="globalSearch">Поиск по каталогу</label>
          <input id="globalSearch" name="q" type="search" placeholder="Поиск" autocomplete="off" />
        </form>
        <button class="icon-button theme-toggle" data-theme-toggle type="button" aria-label="Переключить тему" aria-pressed="false"><span data-theme-icon>☾</span></button>
        <a class="icon-button icon-link" href="favorites.html" aria-label="Избранное">${heartIcon}<span data-favorite-count>0</span></a>
        <a class="icon-button icon-link" href="cart.html" aria-label="Корзина">${cartIcon}<span data-cart-count>0</span></a>
        <button class="menu-toggle" data-menu-toggle type="button" aria-label="Меню" aria-expanded="false"><span></span><span></span><span></span></button>
      </div>
    </header>
    <nav class="mobile-nav" data-mobile-nav aria-label="Мобильная навигация">
      <a href="index.html">Главная</a>
      <a href="catalog.html">Каталог</a>
      <a href="favorites.html">Избранное</a>
      <a href="account.html">Кабинет</a>
      <a href="contacts.html">Контакты</a>
    </nav>
  `;
  bindHeader();
  updateHeaderCounters();
}

export function renderFooter() {
  const el = document.querySelector('[data-footer]');
  if (!el) return;
  el.innerHTML = `
    <footer class="site-footer">
      <div class="footer-grid container-wide">
        <div>
          <a class="brand footer-brand" href="index.html"><span class="brand-mark"><img class="brand-logo" src="assets/veast-logo-mark.png" alt="" /></span><span>VEAST</span></a>
          <p>Интернет-магазин одежды в эстетике streetwear, Y2K, techwear и chrome. Каталог, корзина и оформление заказа собраны в один понятный сценарий.</p>
        </div>
        <div>
          <h3>Магазин</h3>
          ${categories.filter((item) => item.id !== 'all').slice(0, 5).map((item) => `<a href="catalog.html?category=${item.id}">${item.title}</a>`).join('')}
        </div>
        <div>
          <h3>Сервис</h3>
          <a href="cart.html">Корзина</a>
          <a href="checkout.html">Оформление</a>
          <a href="account.html">Личный кабинет</a>
          <a href="contacts.html">Обратная связь</a>
          <a class="telegram-link" href="https://t.me/veastshop" target="_blank" rel="noreferrer">Telegram VEAST</a>
          <a href="privacy.html">Оферта и конфиденциальность</a>
        </div>
        <div>
          <h3>Информация</h3>
          <p>Сервисные страницы и материалы проекта доступны отдельно.</p>
          <a href="admin-orders.html">Панель заказов</a>
          <a href="project.html">Документация</a>
          <a href="prototype.html">Прототип</a>
          <a href="https://www.figma.com/design/u3CLNOluVqsUsrbXidVjXQ/Untitled?node-id=1-15&t=k76jAOBQJ0oYwSoI-1" target="_blank" rel="noreferrer">Figma</a>
        </div>
      </div>
    </footer>
  `;
}

export function initCommon(active) {
  renderHeader(active);
  renderFooter();
  bindGlobalActions();
}

function bindHeader() {
  const toggle = document.querySelector('[data-menu-toggle]');
  const nav = document.querySelector('[data-mobile-nav]');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  const themeToggle = document.querySelector('[data-theme-toggle]');
  if (themeToggle) {
    updateThemeButton(getTheme());
    themeToggle.addEventListener('click', toggleTheme);
  }
}

function bindGlobalActions() {
  document.addEventListener('click', (event) => {
    const addBtn = event.target.closest('[data-add-to-cart]');
    const favoriteBtn = event.target.closest('[data-favorite]');

    if (addBtn) {
      event.preventDefault();
      addToCart(addBtn.dataset.addToCart);
    }
    if (favoriteBtn) {
      event.preventDefault();
      const active = toggleFavorite(favoriteBtn.dataset.favorite);
      favoriteBtn.classList.toggle('active', active);
      favoriteBtn.setAttribute('aria-pressed', String(active));
      favoriteBtn.classList.add('action-pulse');
      setTimeout(() => favoriteBtn.classList.remove('action-pulse'), 360);
    }
  });
}

function updateThemeButton(theme = getTheme()) {
  document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    const isDark = theme === 'dark';
    button.setAttribute('aria-pressed', String(isDark));
    button.setAttribute('title', isDark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему');
  });
  document.querySelectorAll('[data-theme-icon]').forEach((icon) => {
    icon.textContent = theme === 'dark' ? '☀' : '☾';
  });
}

function updateHeaderCounters() {
  const cartCount = getCart().reduce((sum, item) => sum + item.quantity, 0);
  document.querySelectorAll('[data-cart-count]').forEach((el) => { el.textContent = String(cartCount); });
  document.querySelectorAll('[data-favorite-count]').forEach((el) => { el.textContent = String(getFavorites().length); });
}

export function toast(message) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.append(el);
  }
  el.innerHTML = `<span class="toast-dot" aria-hidden="true"></span><span>${escapeHtml(message)}</span>`;
  el.classList.remove('visible');
  requestAnimationFrame(() => el.classList.add('visible'));
  window.clearTimeout(window.__toastTimer);
  window.__toastTimer = window.setTimeout(() => el.classList.remove('visible'), 2400);
}

export function getUrlParams() {
  return Object.fromEntries(new URLSearchParams(window.location.search));
}

export { formatPrice, getProductById, products, categories };
