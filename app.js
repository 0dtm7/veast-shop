import { categories, formatPrice, getProductById, products } from './data/products.js';

const CART_KEY = 'veast_course_cart_v1';
const FAVORITES_KEY = 'veast_course_favorites_v1';
const ORDERS_KEY = 'veast_course_orders_v1';
const LAST_ORDER_KEY = 'veast_course_last_order_v1';
const THEME_KEY = 'veast_course_theme_v1';

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
        <a class="${active === 'project' ? 'active' : ''}" href="project.html">Проект</a>
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
      <a class="${active === 'home' ? 'active' : ''}" href="index.html">Главная</a>
      <a class="${active === 'catalog' ? 'active' : ''}" href="catalog.html">Каталог</a>
      <a class="${active === 'favorites' ? 'active' : ''}" href="favorites.html">Избранное</a>
      <a class="${active === 'account' ? 'active' : ''}" href="account.html">Кабинет</a>
      <a class="${active === 'contacts' ? 'active' : ''}" href="contacts.html">Контакты</a>
      <a class="${active === 'project' ? 'active' : ''}" href="project.html">Проект</a>
    </nav>
    <nav class="mobile-bottom-nav" aria-label="Быстрая мобильная навигация">
      <a class="${active === 'home' ? 'active' : ''}" href="index.html" aria-label="Главная">
        <svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11.2 12 4l8 7.2V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-8.8Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>
        <span>Главная</span>
      </a>
      <a class="${active === 'catalog' ? 'active' : ''}" href="catalog.html" aria-label="Каталог">
        <svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h7v7H4V5Zm9 0h7v7h-7V5ZM4 14h7v5H4v-5Zm9 0h7v5h-7v-5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>
        <span>Каталог</span>
      </a>
      <a class="${active === 'favorites' ? 'active' : ''}" href="favorites.html" aria-label="Избранное">
        ${heartIcon}
        <span>Избранное</span>
        <em data-favorite-count>0</em>
      </a>
      <a href="cart.html" aria-label="Корзина">
        ${cartIcon}
        <span>Корзина</span>
        <em data-cart-count>0</em>
      </a>
      <a class="${active === 'account' ? 'active' : ''}" href="account.html" aria-label="Кабинет">
        <svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 9a7 7 0 0 0-14 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        <span>Кабинет</span>
      </a>
    </nav>
  `;
  bindHeader();
  updateHeaderCounters();
}

export function renderFooter() {
  const el = document.querySelector('[data-footer]');
  if (!el) return;
  const socialLinks = [
    {
      label: 'Telegram',
      href: 'https://t.me/veastshop',
      icon: '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 4.8 18 19.1c-.2 1-.8 1.2-1.7.7l-4.7-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.4-4.9L17.7 6c.4-.4-.1-.6-.6-.2L6 12.8l-4.8-1.5c-1-.3-1-1 .2-1.5L19.9 2.7c.9-.3 1.7.2 1.1 2.1Z" fill="currentColor"/></svg>',
    },
    {
      label: 'VK',
      href: 'https://vk.com/veastshop',
      icon: '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.2 7.2c.1 5.6 2.9 9 7.8 9.3h.3v-3.2c2 .2 3.5 1.6 4.1 3.2h2.9c-.8-2.4-2.6-3.9-3.7-4.5 1.1-.7 2.7-2.4 3.1-4.8H16c-.5 1.7-2.1 3.5-3.7 3.7V7.2H9.6v6.4C8 13.2 6.1 11.2 6 7.2H4.2Z" fill="currentColor"/></svg>',
    },
    {
      label: 'Instagram',
      href: 'https://instagram.com/veast.shop',
      icon: '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3.3" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17" cy="7" r="1.1" fill="currentColor"/></svg>',
    },
    {
      label: 'Pinterest',
      href: 'https://pinterest.com/veastshop',
      icon: '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12.1 3.5a8.3 8.3 0 0 0-3.2 16l.7-3.1c.1-.4.1-.7 0-1.1-.1-.4-.5-1.2-.5-2 0-1.8 1-3.1 2.3-3.1 1.1 0 1.6.8 1.6 1.8 0 1.1-.7 2.8-1.1 4.4-.3 1.3.7 2.4 2 2.4 2.4 0 4.2-2.5 4.2-6.1 0-3.2-2.3-5.4-5.6-5.4-3.8 0-6 2.9-6 5.8 0 1.1.4 2.3 1 3 .1.1.1.3.1.5l-.4 1.6c-.1.3-.3.4-.6.2-1.7-.8-2.8-3.2-2.8-5.2 0-4.2 3.1-8.1 8.9-8.1 4.7 0 8.3 3.3 8.3 7.8 0 4.6-2.9 8.3-7 8.3-1.4 0-2.7-.7-3.1-1.6l-.9 3.2c-.3 1.1-1.1 2.5-1.6 3.4" fill="currentColor"/></svg>',
    },
  ];
  const socials = socialLinks.map((item) => `
    <a class="social-link" href="${item.href}" target="_blank" rel="noreferrer" aria-label="VEAST в ${item.label}" title="${item.label}">${item.icon}<span>${item.label}</span></a>
  `).join('');

  el.innerHTML = `
    <footer class="site-footer">
      <div class="footer-grid footer-grid-clean container-wide">
        <div class="footer-about">
          <a class="brand footer-brand" href="index.html" aria-label="VEAST, главная"><span class="brand-mark"><img class="brand-logo" src="assets/veast-logo-mark.png" alt="" /></span><span>VEAST</span></a>
          <p>Интернет-магазин одежды в эстетике streetwear / Y2K / techwear. Собери образ, добавь товар в корзину и оформи заказ без лишних шагов.</p>
          <div class="footer-socials" aria-label="Социальные сети VEAST">
            <p class="socials-title">Соцсети</p>
            <div class="social-list">${socials}</div>
          </div>
        </div>
        <div>
          <h3>Магазин</h3>
          <a href="catalog.html">Каталог</a>
          <a href="catalog.html?category=hoodies">Худи</a>
          <a href="catalog.html?category=tshirts">Футболки</a>
          <a href="catalog.html?category=outerwear">Верхняя одежда</a>
          <a href="catalog.html?category=accessories">Аксессуары</a>
        </div>
        <div>
          <h3>Покупателю</h3>
          <a href="cart.html">Корзина</a>
          <a href="checkout.html">Оформление заказа</a>
          <a href="account.html">Личный кабинет</a>
          <a href="contacts.html">Контакты</a>
          <a href="privacy.html">Оферта и конфиденциальность</a>
        </div>
        <div class="footer-drop-note">
          <h3>VEAST Drop</h3>
          <p>Washed black, chrome graphics, relaxed fit. Минимум шума — максимум образа.</p>
          <a class="button button-ghost footer-cta" href="catalog.html">Смотреть каталог</a>
        </div>
      </div>
      <div class="footer-bottom container-wide">
        <span>© 2026 VEAST</span>
        <a href="privacy.html">Политика конфиденциальности</a>
        <a href="privacy.html">Публичная оферта</a>
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
