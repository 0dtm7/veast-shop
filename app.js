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
  ['Учебный коммерческий веб-продукт: каталог одежды, оформление заказа и backend API.', 'A commercial training web product: fashion catalog, checkout flow and backend API.'],
  ['Интернет-магазин одежды в минималистичной streetwear/Y2K-эстетике. Основной путь: выбрать товар, добавить в корзину и оформить заказ.', 'A fashion e-commerce store built around a minimalist streetwear / Y2K aesthetic. Main flow: choose a product, add it to cart and place an order.'],
  ['Перейти в каталог', 'Open catalog'],
  ['Быстрые разделы', 'Quick links'],
  ['Chrome-графика', 'Chrome graphics'],
  ['Основной визуальный акцент коллекции — холодный хромовый знак VEAST и орбитальные принты, которые создают ощущение технологичного бренда.', 'The key visual accent of the collection is the cold chrome VEAST symbol and orbital prints that create a clear techwear identity.'],
  ['Washed-фактуры', 'Washed textures'],
  ['Эффект выстиранной ткани делает вещи живыми и не слишком стерильными. За счёт этого коллекция выглядит как реальный streetwear-дроп, а не как набор макетов.', 'The washed fabric finish makes the pieces feel real and wearable. It helps the collection look like an actual streetwear drop rather than a set of mockups.'],
  ['Силуэты, палитра и графика соединяют streetwear-посадку, Y2K-вайб и лёгкий techwear-характер. Это удобно объясняет идею коллекции на защите.', 'Silhouettes, palette and graphics combine a streetwear fit, Y2K vibe and a light techwear attitude. It makes the collection concept easy to explain in a presentation.'],
  ['Путь к покупке за 4 шага', 'Purchase flow in 4 steps'],
  ['Пользователь открывает каталог через меню, поиск или быстрый раздел.', 'The user opens the catalog through the menu, search or a quick tile.'],
  ['Фильтрует товары по категории, размеру, цвету и цене.', 'They filter products by category, size, color and price.'],
  ['Карточка', 'Product page'],
  ['Проверяет фото, состав, размерную сетку, доставку и возврат.', 'They check photos, fabric, size guide, shipping and returns.'],
  ['Добавляет товар в корзину, заполняет форму, получает подтверждение.', 'They add the item to cart, fill out the form and get confirmation.'],
  ['Товары VEAST', 'VEAST products'],
  ['Смотреть все', 'View all'],
  ['Открыть дроп', 'Open drop'],
  ['Первая капсула VEAST собрана вокруг тёмных washed-фактур, свободных силуэтов и холодной chrome-графики.', 'The first VEAST capsule is built around dark washed textures, relaxed silhouettes and cold chrome graphics.'],
  ['Это вещи для повседневного образа: худи, верхний слой, лонгсливы, брюки и аксессуары в одном визуальном языке.', 'These are everyday outfit pieces: hoodies, outerwear, longsleeves, pants and accessories in one visual language.'],
  ['Выстиранные фактуры, мягкий визуал и ощущение уже любимой вещи.', 'Washed textures, a softer visual feel and the mood of a piece you already wear every day.'],
  ['Холодные логотипы, orbital-элементы и графика VEAST на деталях.', 'Cold logos, orbital elements and VEAST graphics on the details.'],
  ['Свободная посадка, streetwear-объём и удобство для ежедневной носки.', 'Relaxed fit, streetwear volume and comfort for daily wear.'],
  ['Собери образ VEAST', 'Build a VEAST look'],
  ['Готовая связка из одного дропа: объёмный верх, широкие брюки, чистая база и chrome-детали.', 'A ready outfit from one drop: voluminous top layer, wide pants, clean base and chrome details.'],
  ['Все позиции сочетаются между собой, поэтому можно быстро собрать полный образ без лишнего выбора.', 'Every item works together, so you can build a full look without overthinking it.'],
  ['Смотреть каталог', 'Shop catalog'],
  ['Открыть образ', 'Open the look'],
  ['Как оформить заказ', 'How to order'],
  ['Выбери товар', 'Choose an item'],
  ['Открой каталог и выбери нужную позицию.', 'Open the catalog and choose the piece you need.'],
  ['Укажи размер', 'Choose size'],
  ['Проверь фото, описание, размер и количество.', 'Check the photos, description, size and quantity.'],
  ['Добавь в корзину', 'Add to cart'],
  ['Собери заказ и проверь итоговую сумму.', 'Build your order and check the final total.'],
  ['Отправь заявку', 'Send request'],
  ['Заполни форму, после этого заказ попадёт в обработку.', 'Fill out the form and the order will go into processing.'],
  ['Сервис VEAST', 'VEAST service'],
  ['По России, сроки уточняются после подтверждения заказа.', 'Shipping across Russia; timing is confirmed after the order is approved.'],
  ['Возврат', 'Returns'],
  ['Возврат доступен в течение 14 дней при сохранении товарного вида.', 'Returns are available within 14 days if the item keeps its original condition.'],
  ['Оплата', 'Payment'],
  ['После подтверждения заказа менеджером.', 'After the order is confirmed by a manager.'],
  ['Поддержка', 'Support'],
  ['Связь через Telegram и контактную форму.', 'Contact us through Telegram or the contact form.'],
  ['Да. Достаточно выбрать товар, добавить его в корзину и заполнить форму оформления.', 'Yes. Just choose an item, add it to the cart and fill out the checkout form.'],
  ['Когда со мной свяжутся после заявки?', 'When will you contact me after the request?'],
  ['После отправки заказа менеджер проверит наличие, детали доставки и способ оплаты.', 'After you send the order, a manager will check availability, delivery details and payment method.'],
  ['Сайт покажет пустое состояние и предложит вернуться в каталог.', 'The site will show an empty state and offer to return to the catalog.'],
  ['Почему можно оформить заказ', 'Why checkout feels trustworthy'],
  ['Понятный товар', 'Clear product info'],
  ['В карточке есть цена, размеры, состав, уход, доставка и возврат.', 'Each product page includes price, sizes, fabric, care, shipping and returns.'],
  ['Контроль заказа', 'Order control'],
  ['Корзина показывает количество, размер, стоимость позиции и итоговую сумму.', 'The cart shows quantity, size, line price and total amount.'],
  ['Backend-процесс', 'Backend flow'],
  ['Форма заказа отправляет данные в API, где выполняется валидация и сохранение.', 'The checkout form sends data to the API, where it is validated and saved.'],
  ['Приватность', 'Privacy'],
  ['Пользователь видит оферту и политику конфиденциальности до отправки контактных данных.', 'The user sees the public offer and privacy policy before submitting contact details.'],
  ['Один дроп — один визуальный язык', 'One drop — one visual language'],
  ['VEAST ORBIT DROP собран вокруг тёмных washed-фактур, холодной chrome-графики и свободных streetwear-силуэтов. Поэтому каталог, карточки товара и главная страница выглядят как единая коллекция, а не как набор случайных позиций.', 'VEAST ORBIT DROP is built around dark washed textures, cold chrome graphics and relaxed streetwear silhouettes. That is why the catalog, product pages and home page feel like one coherent collection instead of a random set of items.'],
  ['В каталоге пользователь видит чистый товар, а внутри карточки — модель, детали и полный визуал. Такой подход делает сайт ближе к настоящему fashion-магазину и помогает быстрее понять вещь перед покупкой.', 'In the catalog the user sees a clean product image, while inside the product page they get the model shot, details and the full visual context. This makes the site feel closer to a real fashion store and helps users understand the item before buying.'],
  ['Частые вопросы', 'Frequently asked questions'],
  ['Можно ли оформить заказ без регистрации?', 'Can I place an order without registration?'],
  ['Да. Для основного сценария достаточно корзины и формы оформления заказа.', 'Yes. The main flow only requires the cart and the checkout form.'],
  ['Что происходит после отправки формы?', 'What happens after I submit the form?'],
  ['Frontend отправляет заказ в backend API. Сервер проверяет данные и сохраняет заказ в JSON-файл.', 'The frontend sends the order to the backend API. The server validates the data and saves the order to a JSON file.'],
  ['Что будет, если корзина пустая?', 'What happens if the cart is empty?'],
  ['Сайт показывает пустое состояние и ведёт пользователя обратно в каталог.', 'The site shows an empty state and takes the user back to the catalog.'],
  ['Корзина пуста', 'Your cart is empty'],
  ['Добавь товар из каталога, чтобы продолжить основной коммерческий сценарий VEAST.', 'Add a product from the catalog to continue the main VEAST shopping flow.'],
  ['В каталог', 'Go to catalog'],
  ['Посмотреть избранное', 'View favorites'],
  ['Итого', 'Summary'],
  ['Товары', 'Products'],
  ['Checkout станет доступен после добавления товара.', 'Checkout becomes available after you add a product.'],
  ['Выбрать товар', 'Choose a product'],
  ['Позиций', 'Items'],
  ['Доставка', 'Shipping'],
  ['после заявки', 'after confirmation'],
  ['К оплате', 'Total due'],
  ['Следующий шаг — оформление заказа. Это основное измеримое целевое действие сайта.', 'Next step: checkout. This is the main measurable conversion action of the site.'],
  ['Оформить заказ', 'Proceed to checkout'],
  ['Продолжить покупки', 'Continue shopping'],
  ['Очистить корзину', 'Clear cart'],
  ['Целевое действие проекта', 'Core project action'],
  ['После отправки формы создаётся заказ: frontend передаёт данные в backend, сервер валидирует поля и сохраняет заявку.', 'After the form is submitted, an order is created: the frontend sends data to the backend, the server validates the fields and saves the order.'],
  ['Условия заказа', 'Order terms'],
  ['СДЭК, Почта России или самовывоз. Срок 2–5 дней.', 'Courier delivery, local post or pickup. Estimated time: 2–5 days.'],
  ['Оплата', 'Payment'],
  ['После подтверждения или картой при получении.', 'After confirmation or by card upon delivery.'],
  ['Возврат', 'Returns'],
  ['14 дней при сохранении товарного вида.', '14 days if the item remains in original condition.'],
  ['Имя', 'Name'],
  ['Например, Даня', 'For example, Daniel'],
  ['Минимум 2 символа.', 'At least 2 characters.'],
  ['Телефон / Telegram', 'Phone / Telegram'],
  ['Нужно для подтверждения заказа.', 'Needed to confirm the order.'],
  ['На него можно отправить подтверждение.', 'A confirmation can be sent there.'],
  ['Город', 'City'],
  ['Москва', 'New York'],
  ['Адрес доставки', 'Shipping address'],
  ['Улица, дом, квартира или пункт выдачи', 'Street, building, apartment or pickup point'],
  ['СДЭК', 'Courier'],
  ['Почта России', 'Post'],
  ['Самовывоз', 'Pickup'],
  ['После подтверждения', 'After confirmation'],
  ['Картой при получении', 'Card on delivery'],
  ['Комментарий к заказу', 'Order note'],
  ['Например: нужна консультация по размеру', 'For example: I need help with sizing'],
  ['Я согласен с', 'I agree with the VEAST'],
  ['пользовательским соглашением и политикой конфиденциальности', 'terms and privacy policy'],
  ['и понимаю, что данные используются для обработки заказа.', 'and understand that the data is used to process the order.'],
  ['Отправить заказ', 'Submit order'],
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
  toast(isEnglish() ? (normalized === 'dark' ? 'VEAST dark theme enabled' : 'VEAST light theme enabled') : (normalized === 'dark' ? 'Включена тёмная тема VEAST' : 'Включена светлая тема VEAST'));
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
    new: isEnglish() ? 'New' : 'Новинка',
    sale: 'Sale',
    limited: 'Limited',
    bestseller: isEnglish() ? 'Bestseller' : 'Хит',
    drop: 'Orbit Drop',
  };
  const badges = [...product.badges.map((badge) => badgeMap[badge] || badge), discount ? '-' + discount + '%' : ''].filter(Boolean);
  const badgeHtml = badges.map((badge) => '<span>' + escapeHtml(badge) + '</span>').join('');
  const sizesHtml = product.sizes.map((size) => '<span>' + escapeHtml(size) + '</span>').join('');
  const featureTagsHtml = (product.featureTags || []).slice(0, 4).map((tag) => '<span>' + escapeHtml(tag) + '</span>').join('');
  const heartIcon = '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.9a5.4 5.4 0 0 0-7.6 0L12 6.1l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21.3l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  return [
    '<article class="product-card" data-product-card="' + product.id + '">',
      '<a class="product-media" href="product.html?id=' + product.id + '" aria-label="' + (isEnglish() ? 'Open product page ' : 'Открыть карточку товара ') + escapeHtml(product.title) + '">',
        '<img class="product-img product-img-front" src="' + (product.cardImage || product.image) + '" alt="' + escapeHtml(product.title) + '" loading="lazy" />',
        '<img class="product-img product-img-back" src="' + (product.cardImageAlt || product.cardImage || product.imageAlt || product.image) + '" alt="' + escapeHtml(product.title) + (isEnglish() ? ', alternate view' : ', второй вид') + '" loading="lazy" />',
        '<div class="badge-row">' + badgeHtml + '</div>',
        '<div class="media-quick-view">' + (isEnglish() ? 'Details' : 'Подробнее') + '</div>',
      '</a>',
      '<div class="product-info">',
        '<div class="product-line"><span>' + escapeHtml(product.categoryTitle) + '</span><span>' + escapeHtml(product.status) + '</span></div>',
        '<a class="product-title" href="product.html?id=' + product.id + '">' + escapeHtml(product.title) + '</a>',
        '<p class="product-collection">' + escapeHtml(product.collection) + ' · ' + escapeHtml(product.fit) + '</p>',
        '<p class="product-description">' + escapeHtml(product.description) + '</p>',
        '<div class="mini-tag-row" aria-label="' + (isEnglish() ? 'Product highlights' : 'Коммерческие теги товара') + '">' + featureTagsHtml + '</div>',
        '<div class="price-line"><strong>' + formatPrice(product.price) + '</strong>' + (product.oldPrice ? '<s>' + formatPrice(product.oldPrice) + '</s>' : '') + '</div>',
        '<div class="sizes-line" aria-label="' + (isEnglish() ? 'Available sizes' : 'Доступные размеры') + '">' + sizesHtml + '</div>',
        '<div class="card-actions card-actions-shop">',
          '<button class="button button-dark" type="button" data-add-to-cart="' + product.id + '">' + (isEnglish() ? 'Add to cart' : 'В корзину') + '</button>',
          '<button class="square-button favorite-action ' + (favorites.has(product.id) ? 'active' : '') + '" type="button" data-favorite="' + product.id + '" aria-label="Добавить в избранное" aria-pressed="' + favorites.has(product.id) + '">' + heartIcon + '</button>',
        '</div>',
        '<a class="card-detail-link" href="product.html?id=' + product.id + '">' + (isEnglish() ? 'Sizes, fabric and shipping' : 'Размеры, состав и доставка') + '</a>',
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
    button.setAttribute('title', isEnglish() ? (isDark ? 'Switch to light theme' : 'Switch to dark theme') : (isDark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'));
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
