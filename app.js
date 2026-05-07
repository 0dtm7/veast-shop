import { categories, formatPrice as formatRubPrice, getProductById, products } from './data/products.js';

const CART_KEY = 'veast_course_cart_v1';
const FAVORITES_KEY = 'veast_course_favorites_v1';
const ORDERS_KEY = 'veast_course_orders_v1';
const LAST_ORDER_KEY = 'veast_course_last_order_v1';
const THEME_KEY = 'veast_course_theme_v1';
const LANGUAGE_KEY = 'veast_course_language_v1';

const I18N_REPLACEMENTS = [
  ['Перейти к содержимому', 'Skip to content'],
  ['Главная', 'Home'],
  ['Каталог', 'Catalog'],
  ['Избранное', 'Favorites'],
  ['Кабинет', 'Account'],
  ['Контакты', 'Contacts'],
  ['Проект', 'Project'],
  ['Поиск', 'Search'],
  ['Все товары', 'All items'],
  ['Все позиции', 'All items'],
  ['Все категории', 'All categories'],
  ['Худи', 'Hoodies'],
  ['Футболки', 'T-Shirts'],
  ['Лонгсливы', 'Longsleeves'],
  ['Верхняя одежда', 'Outerwear'],
  ['Брюки', 'Pants'],
  ['Аксессуары', 'Accessories'],
  ['В наличии', 'In stock'],
  ['Новинка', 'New'],
  ['Хит', 'Bestseller'],
  ['Подробнее', 'Details'],
  ['В корзину', 'Add to cart'],
  ['Добавить в корзину', 'Add to cart'],
  ['Размеры, состав и доставка', 'Size, fabric and shipping'],
  ['Цена', 'Price'],
  ['Цвет', 'Color'],
  ['Наличие', 'Availability'],
  ['Размер', 'Size'],
  ['Количество', 'Quantity'],
  ['Материал', 'Fabric'],
  ['Посадка', 'Fit'],
  ['Уход', 'Care'],
  ['Размерная сетка', 'Size guide'],
  ['Что важно перед покупкой', 'Before you buy'],
  ['Материал и тактильность', 'Fabric and feel'],
  ['Доставка и возврат', 'Shipping and returns'],
  ['С чем носить', 'Wear it with'],
  ['Похожие товары', 'More from the drop'],
  ['Оформление заказа', 'Checkout'],
  ['Оформление', 'Checkout'],
  ['Корзина', 'Cart'],
  ['Личный кабинет', 'Account'],
  ['Обратная связь', 'Feedback'],
  ['Оферта и конфиденциальность', 'Terms and privacy'],
  ['Политика конфиденциальности', 'Privacy policy'],
  ['Публичная оферта', 'Public offer'],
  ['Смотреть каталог', 'Shop catalog'],
  ['Интернет-магазин одежды', 'Fashion e-commerce store'],
  ['Собери образ', 'Build your outfit'],
  ['добавь товар в корзину', 'add items to cart'],
  ['оформи заказ', 'place an order'],
  ['без лишних шагов', 'without extra steps'],
  ['Свободные cargo-брюки с объёмными карманами и washed-фактурой. Базовый низ для худи, футболок и курток VEAST.', 'Loose cargo pants with roomy pockets and a washed texture. A base layer for VEAST hoodies, tees and jackets.'],
  ['Хлопок / нейлон средней плотности.', 'Mid-weight cotton / nylon blend.'],
  ['Стирка при 30°C, сушить на вешалке.', 'Wash at 30°C and hang dry.'],
  ['S: талия 38 / длина 103, M: 40 / 105, L: 42 / 107 см.', 'S: waist 38 / length 103, M: 40 / 105, L: 42 / 107 cm.'],
  ['Свободные cargo-брюки', 'Loose cargo pants'],
  ['Базовый низ', 'A base layer'],
  ['Коммерческий fashion-проект', 'Commercial fashion project'],
  ['Коммерческий fashion продукт', 'Commercial fashion product'],
  ['Распродажа', 'Sale'],
  ['Финальный акцент', 'Final touch'],
  ['Выбор', 'Selection'],
  ['Заказ', 'Order'],
  ['коммерческий fashion-проект', 'Commercial fashion project'],
  ['В минималистичной streetwear/Y2K-эстетике. Основной путь: выбрать товар, добавить в корзину и оформить заказ.', 'built in a minimalist streetwear / Y2K aesthetic. Main flow: choose a product, add it to cart and place an order.'],
  ['в минималистичной streetwear/Y2K-эстетике. Основной путь: выбрать товар, добавить в корзину и оформить заказ.', 'built in a minimalist streetwear / Y2K aesthetic. Main flow: choose a product, add it to cart and place an order.'],
  ['Основной путь: выбрать товар, добавить в корзину и оформить заказ.', 'Main flow: choose a product, add it to cart and place an order.'],
  ['Открыть проект', 'Open project'],
  ['Скидки', 'Discounts'],
  ['Слой сверху', 'Top layer'],
  ['Финиш образа', 'Final touch'],
  ['Например: hoodie, cargo, cap', 'For example: hoodie, cargo, cap'],
];

const PRODUCT_EN = {
  'vst-eclipse-zip-hoodie': {
    description: 'A cropped zip hoodie with a washed finish and bold VEAST chrome graphic. Works as a statement top layer for a streetwear outfit.',
    material: 'Heavy cotton fleece, around 420 g/m².',
    fit: 'Oversize / boxy fit',
    care: 'Wash at 30°C inside out. Do not tumble dry.',
    measurements: 'S: 62/64, M: 64/66, L: 66/68, XL: 68/70. Width / length in cm.',
  },
  'vst-orbit-puffer-jacket': {
    description: 'A voluminous VEAST puffer with Orbit graphics on the chest and back. The key outer layer for the cold season.',
    material: 'Dense insulated polyester with a smooth lining.',
    fit: 'Relaxed puffer fit',
    care: 'Delicate wash or dry clean. Do not overheat while drying.',
    measurements: 'S: 63/67, M: 65/69, L: 67/71, XL: 69/73. Width / length in cm.',
    status: 'Low stock',
  },
  'vst-core-cap': {
    description: 'A washed cap with a chrome VEAST logo and adjustable closure. A clean finishing piece for the full drop outfit.',
    material: '100% cotton with metal hardware.',
    fit: 'Adjustable fit',
    care: 'Dry clean or spot clean by hand.',
    measurements: 'One size, adjustable from 54–60 cm.',
  },
  'vst-signal-tee': {
    description: 'A washed everyday tee with a small VEAST mark on the front and a large Signal print on the back. The most accessible piece in the drop.',
    material: '100% cotton, 240 g/m².',
    fit: 'Loose tee fit',
    care: 'Wash at 30°C inside out.',
    measurements: 'S: 56/69, M: 58/71, L: 60/73, XL: 62/75. Width / length in cm.',
  },
  'vst-signal-track-jacket': {
    description: 'A lightweight track jacket with a straight silhouette, contrast lines and Signal graphics on the back. Built for layered outfits.',
    material: 'Nylon / polyester blend.',
    fit: 'Regular relaxed fit',
    care: 'Delicate wash. Do not iron over the print.',
    measurements: 'S: 60/66, M: 62/68, L: 64/70, XL: 66/72. Width / length in cm.',
  },
  'vst-orbit-hoodie': {
    description: 'A washed hoodie with a clean front logo and a large orbital mark on the back. A versatile daily streetwear layer.',
    material: 'Heavy cotton fleece, around 430 g/m².',
    fit: 'Oversize',
    care: 'Wash separately at 30°C and air dry.',
    measurements: 'S: 63/67, M: 65/69, L: 67/71, XL: 69/73. Width / length in cm.',
  },
  'vst-chrome-cargo-pants': {
    description: 'Loose cargo pants with roomy pockets and a washed texture. A base layer for VEAST hoodies, tees and jackets.',
    material: 'Mid-weight cotton / nylon blend.',
    fit: 'Loose cargo fit',
    care: 'Wash at 30°C and hang dry.',
    measurements: 'S: waist 38 / length 103, M: 40 / 105, L: 42 / 107 cm.',
  },
  'vst-void-longsleeve': {
    description: 'A washed longsleeve with a small chest logo and a large VEAST chrome graphic on the back. Works as a first layer under jackets and hoodies.',
    material: '100% cotton, 230 g/m².',
    fit: 'Relaxed fit',
    care: 'Wash at 30°C. Do not wring and do not iron over the print.',
    measurements: 'S: 55/70, M: 57/72, L: 59/74, XL: 61/76. Width / length in cm.',
  },
  'vst-metro-jacket': {
    description: 'A clean Metro jacket with a chrome VEAST mark and statement branding on the back. A main outer layer for the capsule.',
    material: 'Dense nylon with lining.',
    fit: 'Relaxed fit',
    care: 'Hand wash or delicate wash without bleach.',
    measurements: 'S: 60/68, M: 62/70, L: 64/72, XL: 66/74. Width / length in cm.',
    status: 'Low stock',
  },
};
const CATEGORY_EN = {
  'Все товары': 'All items',
  'Худи': 'Hoodies',
  'Футболки': 'T-Shirts',
  'Лонгсливы': 'Longsleeves',
  'Верхняя одежда': 'Outerwear',
  'Брюки': 'Pants',
  'Аксессуары': 'Accessories',
  'В наличии': 'In stock',
};

export function getLanguage() {
  try {
    const stored = localStorage.getItem(LANGUAGE_KEY);
    if (stored === 'en' || stored === 'ru') return stored;
  } catch {}
  return 'ru';
}

export function setLanguage(language) {
  const normalized = language === 'en' ? 'en' : 'ru';
  try { localStorage.setItem(LANGUAGE_KEY, normalized); } catch {}
  document.documentElement.lang = normalized;
  location.reload();
}

export function toggleLanguage() {
  setLanguage(getLanguage() === 'en' ? 'ru' : 'en');
}

export function isEnglish() {
  return getLanguage() === 'en';
}

export function formatPrice(value) {
  const price = Number(value) || 0;
  if (isEnglish()) {
    const dollars = Math.max(0, Math.round(price / 100));
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(dollars);
  }
  return formatRubPrice(price);
}

export function localizeProduct(product) {
  if (!product || !isEnglish()) return product;
  const translated = PRODUCT_EN[product.id] || {};
  return {
    ...product,
    ...translated,
    categoryTitle: CATEGORY_EN[product.categoryTitle] || product.categoryTitle,
    status: translated.status || CATEGORY_EN[product.status] || product.status,
    featureTags: (product.featureTags || []).map((tag) => tag
      .replace('limited drop', 'limited drop')
      .replace('washed cotton', 'washed cotton')
      .replace('chrome print', 'chrome print')
      .replace('oversize fit', 'oversize fit')
      .replace('chrome embroidery', 'chrome embroidery')
      .replace('loose fit', 'loose fit')),
  };
}

export function translateText(value = '') {
  if (!isEnglish()) return value;
  let output = String(value);
  I18N_REPLACEMENTS.forEach(([ru, en]) => {
    output = output.split(ru).join(en);
  });
  return output;
}

export function translateStaticPage() {
  if (!isEnglish() || !document.body) return;
  document.documentElement.lang = 'en';
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    const next = translateText(node.nodeValue);
    if (next !== node.nodeValue) node.nodeValue = next;
  });
  document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach((el) => {
    el.setAttribute('placeholder', translateText(el.getAttribute('placeholder') || ''));
  });
}

export function scheduleTranslation() {
  if (!isEnglish()) return;
  translateStaticPage();
  requestAnimationFrame(translateStaticPage);
  window.setTimeout(translateStaticPage, 80);
  window.setTimeout(translateStaticPage, 300);
}

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
  toast(isEnglish() ? `Added to cart: ${product.title}, size ${normalizedSize}` : `Добавлено в корзину: ${product.title}, размер ${normalizedSize}`);
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
    ? (isEnglish() ? `Added to favorites: ${product ? product.title : 'item'}` : `Добавлено в избранное: ${product ? product.title : 'товар'}`)
    : (isEnglish() ? `Removed from favorites: ${product ? product.title : 'item'}` : `Удалено из избранного: ${product ? product.title : 'товар'}`));
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
  product = localizeProduct(product);
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
  const lang = getLanguage();
  const labels = lang === 'en'
    ? { skip: 'Skip to content', home: 'Home', catalog: 'Catalog', favorites: 'Favorites', account: 'Account', contacts: 'Contacts', project: 'Project', search: 'Search', theme: 'Switch theme', menu: 'Menu' }
    : { skip: 'Перейти к содержимому', home: 'Главная', catalog: 'Каталог', favorites: 'Избранное', account: 'Кабинет', contacts: 'Контакты', project: 'Проект', search: 'Поиск', theme: 'Переключить тему', menu: 'Меню' };
  const heartIcon = '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.9a5.4 5.4 0 0 0-7.6 0L12 6.1l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21.3l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const cartIcon = '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.2 8.4h11.6l-.8 10.1a2 2 0 0 1-2 1.8H9a2 2 0 0 1-2-1.8L6.2 8.4Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 8.4V7a3 3 0 0 1 6 0v1.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  el.innerHTML = `
    <a class="skip-link" href="#mainContent">${labels.skip}</a>
    <header class="site-header">
      <a class="brand" href="index.html" aria-label="VEAST">
        <span class="brand-mark"><img class="brand-logo" src="assets/veast-logo-mark-strong.png" alt="" /></span>
        <span>VEAST</span>
      </a>
      <nav class="desktop-nav" aria-label="Main navigation">
        <a class="${active === 'home' ? 'active' : ''}" href="index.html">${labels.home}</a>
        <a class="${active === 'catalog' ? 'active' : ''}" href="catalog.html">${labels.catalog}</a>
        <a class="${active === 'favorites' ? 'active' : ''}" href="favorites.html">${labels.favorites}</a>
        <a class="${active === 'account' ? 'active' : ''}" href="account.html">${labels.account}</a>
        <a class="${active === 'contacts' ? 'active' : ''}" href="contacts.html">${labels.contacts}</a>
      </nav>
      <div class="header-actions">
        <form class="search-box" action="catalog.html" method="get">
          <label class="visually-hidden" for="globalSearch">${labels.search}</label>
          <input id="globalSearch" name="q" type="search" placeholder="${labels.search}" autocomplete="off" />
        </form>
        <button class="icon-button lang-toggle" data-lang-toggle type="button" aria-label="Switch language">${lang === 'en' ? 'RU' : 'EN'}</button>
        <button class="icon-button theme-toggle" data-theme-toggle type="button" aria-label="${labels.theme}" aria-pressed="false"><span data-theme-icon>☾</span></button>
        <a class="icon-button icon-link" href="favorites.html" aria-label="${labels.favorites}">${heartIcon}<span data-favorite-count>0</span></a>
        <a class="icon-button icon-link" href="cart.html" aria-label="${lang === 'en' ? 'Cart' : 'Корзина'}">${cartIcon}<span data-cart-count>0</span></a>
        <button class="menu-toggle" data-menu-toggle type="button" aria-label="${labels.menu}" aria-expanded="false"><span></span><span></span><span></span></button>
      </div>
    </header>
    <nav class="mobile-nav" data-mobile-nav aria-label="Mobile navigation">
      <a href="index.html">${labels.home}</a>
      <a href="catalog.html">${labels.catalog}</a>
      <a href="favorites.html">${labels.favorites}</a>
      <a href="account.html">${labels.account}</a>
      <a href="contacts.html">${labels.contacts}</a>
    </nav>
  `;
  bindHeader();
  updateHeaderCounters();
}

export function renderFooter() {
  const el = document.querySelector('[data-footer]');
  if (!el) return;
  const lang = getLanguage();
  const labels = lang === 'en'
    ? {
        about: 'A streetwear / Y2K / techwear store built around a fast shopping flow: catalog, product card, cart and checkout.',
        shop: 'Shop',
        customer: 'Customer',
        socials: 'Socials',
        catalog: 'Catalog',
        hoodies: 'Hoodies',
        tees: 'T-Shirts',
        outerwear: 'Outerwear',
        pants: 'Pants',
        cart: 'Cart',
        checkout: 'Checkout',
        account: 'Account',
        contacts: 'Contacts',
        privacy: 'Privacy policy',
        offer: 'Public offer',
        tg: 'Telegram',
        vk: 'VK',
        ctaTitle: 'VEAST Drop',
        ctaText: 'Washed black, chrome graphics and relaxed fits. Less noise — more silhouette.',
        cta: 'Shop catalog',
      }
    : {
        about: 'Интернет-магазин одежды в эстетике streetwear / Y2K / techwear. Собери образ, добавь товар в корзину и оформи заказ без лишних шагов.',
        shop: 'Магазин',
        customer: 'Покупателю',
        socials: 'Соцсети',
        catalog: 'Каталог',
        hoodies: 'Худи',
        tees: 'Футболки',
        outerwear: 'Верхняя одежда',
        pants: 'Брюки',
        cart: 'Корзина',
        checkout: 'Оформление заказа',
        account: 'Личный кабинет',
        contacts: 'Контакты',
        privacy: 'Политика конфиденциальности',
        offer: 'Публичная оферта',
        tg: 'Telegram',
        vk: 'VK',
        ctaTitle: 'VEAST Drop',
        ctaText: 'Выстиранный чёрный, хромовая графика и свободная посадка. Меньше шума — больше образа.',
        cta: 'Смотреть каталог',
      };

  el.innerHTML = `
    <footer class="site-footer clean-footer">
      <div class="footer-grid container-wide">
        <div class="footer-about">
          <a class="brand footer-brand" href="index.html"><span class="brand-mark"><img class="brand-logo" src="assets/veast-logo-mark-strong.png" alt="" /></span><span>VEAST</span></a>
          <p>${labels.about}</p>
          <div class="footer-socials" aria-label="${labels.socials}">
            <a href="https://t.me/veastshop" target="_blank" rel="noreferrer">${labels.tg}</a>
            <a href="https://vk.com/veastshop" target="_blank" rel="noreferrer">${labels.vk}</a>
          </div>
        </div>
        <div class="footer-column">
          <h3>${labels.shop}</h3>
          <a href="catalog.html">${labels.catalog}</a>
          <a href="catalog.html?category=hoodie">${labels.hoodies}</a>
          <a href="catalog.html?category=tee">${labels.tees}</a>
          <a href="catalog.html?category=outerwear">${labels.outerwear}</a>
          <a href="catalog.html?category=pants">${labels.pants}</a>
        </div>
        <div class="footer-column">
          <h3>${labels.customer}</h3>
          <a href="cart.html">${labels.cart}</a>
          <a href="checkout.html">${labels.checkout}</a>
          <a href="account.html">${labels.account}</a>
          <a href="contacts.html">${labels.contacts}</a>
          <a href="privacy.html">${labels.privacy}</a>
        </div>
        <div class="footer-cta">
          <p class="eyebrow">${labels.ctaTitle}</p>
          <p>${labels.ctaText}</p>
          <a class="button button-ghost full footer-cta-button" href="catalog.html">${labels.cta}</a>
        </div>
      </div>
      <div class="footer-bottom container-wide">
        <span>© 2026 VEAST</span>
        <a href="privacy.html">${labels.privacy}</a>
        <a href="privacy.html">${labels.offer}</a>
      </div>
    </footer>
  `;
}

export function initCommon(active) {
  document.documentElement.lang = getLanguage();
  renderHeader(active);
  renderFooter();
  bindGlobalActions();
  scheduleTranslation();
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

  const langToggle = document.querySelector('[data-lang-toggle]');
  if (langToggle) {
    langToggle.addEventListener('click', toggleLanguage);
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

export { getProductById, products, categories };
