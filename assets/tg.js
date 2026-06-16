const tg = window.Telegram?.WebApp || null;
const state = { products: [], categories: [], activeCategory: 'all', query: '', view: 'drop', selectedProduct: null, selectedSize: '', theme: 'dark', activeOrderId: '' };
const CART_KEY = 'veast_tg_cart';
const FAVORITES_KEY = 'veast_tg_favorites';
const LAST_ORDER_KEY = 'veast_tg_last_order';
const ORDER_HISTORY_KEY = 'veast_tg_order_history';
const THEME_KEY = 'veast_tg_theme';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const money = (value) => `${Number(value || 0).toLocaleString('ru-RU')} ₽`;
const escapeHtml = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const statusSteps = ['created', 'packed', 'shipped', 'in_transit', 'ready_for_pickup', 'delivered'];
const statusLabels = { created: 'Создан', packed: 'Собран', shipped: 'Передан', in_transit: 'В пути', ready_for_pickup: 'Получение', delivered: 'Получен' };

function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); updateCounters(); }
function cart() { return read(CART_KEY, []); }
function favorites() { return read(FAVORITES_KEY, []); }
function orderHistory() { return read(ORDER_HISTORY_KEY, []); }
function productById(id) { return state.products.find((item) => item.id === id || item.slug === id); }
function saveOrderHistory(next) { localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(next.slice(-20))); }
function toast(message) { const node = $('[data-toast]'); if (!node) return; node.textContent = message; node.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove('show'), 2300); }

function getTelegramUser() {
  const user = tg?.initDataUnsafe?.user || null;
  if (!user) return null;
  return { id: user.id ? String(user.id) : '', username: user.username || '', firstName: user.first_name || '', lastName: user.last_name || '', languageCode: user.language_code || '' };
}
function getStartParam() { return new URLSearchParams(window.location.search).get('product') || tg?.initDataUnsafe?.start_param || ''; }
function detectSystemTheme() { return (tg?.colorScheme === 'light' || tg?.colorScheme === 'dark') ? tg.colorScheme : (window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'); }
function updateThemeButton() { const icon = $('[data-theme-icon]'); if (icon) icon.textContent = state.theme === 'light' ? '☀︎' : '☾'; }
function setTheme(theme, persist = true) {
  state.theme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.classList.remove('theme-light', 'theme-dark');
  document.documentElement.classList.add(`theme-${state.theme}`);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', state.theme === 'light' ? '#f2f7ff' : '#08111d');
  updateThemeButton();
  try { tg?.setHeaderColor?.(state.theme === 'light' ? '#f2f7ff' : '#08111d'); tg?.setBackgroundColor?.(state.theme === 'light' ? '#f2f7ff' : '#08111d'); } catch {}
  if (persist) localStorage.setItem(THEME_KEY, state.theme);
}
function initTheme() { setTheme(localStorage.getItem(THEME_KEY) || detectSystemTheme(), false); }
function toggleTheme() { setTheme(state.theme === 'dark' ? 'light' : 'dark'); toast(state.theme === 'dark' ? 'Включена тёмная тема' : 'Включена светлая тема'); }

function saveCart(next) { write(CART_KEY, next); renderCart(); renderProducts(); renderFeatured(); renderProfile(); }
function saveFavorites(next) { write(FAVORITES_KEY, next); renderFavorites(); renderProducts(); renderFeatured(); renderProfile(); }
function buildCartItems() {
  return cart().map((item) => {
    const product = productById(item.productId);
    if (!product) return null;
    return { ...item, product: product.title, category: product.categoryTitle || product.category || '', price: Number(product.price || 0), subtotal: Number(product.price || 0) * Number(item.quantity || 1), image: product.cardImage || product.image || '' };
  }).filter(Boolean);
}
function cartTotal() { return buildCartItems().reduce((sum, item) => sum + item.subtotal, 0); }
function updateCounters() { const count = cart().reduce((sum, item) => sum + Number(item.quantity || 0), 0); $$('[data-cart-count]').forEach((n) => { n.textContent = String(count); }); $$('[data-cart-count-small]').forEach((n) => { n.textContent = count ? `· ${count}` : ''; }); }

function setView(view) {
  state.view = view;
  $$('[data-screen]').forEach((screen) => screen.classList.toggle('is-active', screen.dataset.screen === view));
  $$('[data-nav]').forEach((button) => button.classList.toggle('active', button.dataset.nav === view));
  if (view === 'checkout') prefillCheckout();
  if (view === 'profile') renderProfile();
  if (view === 'order') renderOrderDetail();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  renderTelegramButtons();
}
function renderTelegramButtons() {
  if (!tg) return;
  const canGoBack = !['drop'].includes(state.view);
  if (tg.BackButton) canGoBack ? tg.BackButton.show() : tg.BackButton.hide();
  if (!tg.MainButton) return;
  if (state.view === 'cart' && cart().length) { tg.MainButton.setText(`Оформить · ${money(cartTotal())}`); tg.MainButton.show(); }
  else tg.MainButton.hide();
}

function filteredProducts() {
  const query = state.query.trim().toLowerCase();
  return state.products.filter((product) => {
    const categoryOk = state.activeCategory === 'all' || product.category === state.activeCategory;
    const text = [product.title, product.description, product.collection, product.categoryTitle, product.fit].join(' ').toLowerCase();
    return categoryOk && (!query || text.includes(query));
  });
}
function productCard(product, compact = false) {
  const isFav = favorites().includes(product.id);
  return `<article class="tg-product-card" data-product-id="${escapeHtml(product.id)}"><div class="tg-product-media" data-open-product="${escapeHtml(product.id)}"><img src="${escapeHtml(product.cardImage || product.image || '')}" alt="${escapeHtml(product.title)}" loading="lazy" /><button class="tg-save ${isFav ? 'active' : ''}" type="button" data-toggle-favorite="${escapeHtml(product.id)}" aria-label="Добавить в избранное">${isFav ? '★' : '☆'}</button></div><div class="tg-product-info"><div class="tg-product-line"><span>${escapeHtml(product.categoryTitle || product.category || 'VEAST')}</span><span>${escapeHtml(product.status || '')}</span></div><div class="tg-product-title">${escapeHtml(product.title)}</div>${compact ? '' : `<div class="tg-product-price"><span>${money(product.price)}</span><button class="tg-link-button" type="button" data-quick-add="${escapeHtml(product.id)}">в корзину</button></div>`}</div></article>`;
}
function renderFeatured() { const node = $('[data-featured-products]'); if (node) node.innerHTML = state.products.length ? state.products.slice(0, 5).map((p) => productCard(p, true)).join('') : loadingSkeleton(); }
function renderCategories() { const node = $('[data-categories]'); if (!node) return; const categories = state.categories.length ? state.categories : [{ id: 'all', title: 'Все товары' }]; node.innerHTML = categories.map((c) => `<button class="tg-chip ${state.activeCategory === c.id ? 'active' : ''}" type="button" data-category="${escapeHtml(c.id)}">${escapeHtml(c.title)}</button>`).join(''); }
function renderProducts() { const node = $('[data-products]'); if (!node) return; const products = filteredProducts(); node.innerHTML = products.length ? products.map((p) => productCard(p)).join('') : `<div class="tg-empty"><strong>ничего не найдено</strong><span>поменяй поиск или категорию.</span></div>`; }
function renderFavorites() { const node = $('[data-favorites]'); if (!node) return; const favSet = new Set(favorites()); const items = state.products.filter((p) => favSet.has(p.id)); node.innerHTML = items.length ? items.map((p) => productCard(p)).join('') : `<div class="tg-empty"><strong>избранное пустое</strong><span>сохраняй вещи, чтобы быстро вернуться к ним.</span></div>`; }
function loadingSkeleton() { return Array.from({ length: 4 }, () => `<article class="tg-product-card"><div class="tg-product-media"></div><div class="tg-product-info"><div class="tg-product-title">загрузка...</div></div></article>`).join(''); }

function galleryMarkup(product) {
  const gallery = [product.image, product.cardImage, ...(product.gallery || [])].filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 4);
  const main = gallery[0] || product.cardImage || product.image || '';
  return `<div class="tg-premium-gallery"><img class="tg-premium-main" src="${escapeHtml(main)}" alt="${escapeHtml(product.title)}" />${gallery.length > 1 ? `<div class="tg-premium-thumbs">${gallery.slice(1).map((img) => `<img src="${escapeHtml(img)}" alt="${escapeHtml(product.title)} деталь" />`).join('')}</div>` : ''}</div>`;
}
function productSheet(product) {
  const isFav = favorites().includes(product.id);
  const sizes = (product.sizes || ['OS']).map((size) => `<button class="tg-size ${size === state.selectedSize ? 'active' : ''}" type="button" data-select-size="${escapeHtml(size)}">${escapeHtml(size)}</button>`).join('');
  const tags = (product.featureTags || []).slice(0, 4).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
  return `${galleryMarkup(product)}<div class="tg-sheet-body"><p class="tg-kicker">${escapeHtml(product.collection || 'VEAST')}</p><h2 class="tg-sheet-title">${escapeHtml(product.title)}</h2><p class="tg-sheet-description">${escapeHtml(product.description || '')}</p><div class="tg-premium-price"><span>Цена</span><strong>${money(product.price)}</strong></div>${tags ? `<div class="tg-premium-tags">${tags}</div>` : ''}<p class="tg-muted">Выбери размер</p><div class="tg-size-grid">${sizes}</div><div class="tg-detail-list"><div><strong>Посадка</strong>${escapeHtml(product.fit || 'VEAST fit')}</div><div><strong>Материал</strong>${escapeHtml(product.material || 'Материал уточняется')}</div><div><strong>Уход</strong>${escapeHtml(product.care || 'Деликатный уход')}</div></div><button class="tg-button tg-button-primary full" type="button" data-add-selected="${escapeHtml(product.id)}">Добавить в корзину</button><button class="tg-button full" type="button" data-toggle-favorite="${escapeHtml(product.id)}">${isFav ? 'Убрать из избранного' : 'Сохранить в избранное'}</button></div>`;
}
function openProduct(productId) { const product = productById(productId); if (!product) return; state.selectedProduct = product; state.selectedSize = product.sizes?.[0] || 'OS'; const sheet = $('[data-product-sheet]'); $('[data-sheet-panel]').innerHTML = productSheet(product); sheet.classList.add('is-open'); sheet.setAttribute('aria-hidden', 'false'); tg?.HapticFeedback?.impactOccurred?.('light'); }
function closeProduct() { const sheet = $('[data-product-sheet]'); sheet.classList.remove('is-open'); sheet.setAttribute('aria-hidden', 'true'); }
function addToCart(productId, size = '') { const product = productById(productId); if (!product) return; const selectedSize = size || product.sizes?.[0] || 'OS'; const lineId = `${product.id}-${selectedSize}`; const next = cart(); const existing = next.find((item) => item.lineId === lineId); if (existing) existing.quantity += 1; else next.push({ lineId, productId: product.id, size: selectedSize, quantity: 1 }); saveCart(next); toast(`${product.title} добавлен в корзину`); tg?.HapticFeedback?.notificationOccurred?.('success'); }
function toggleFavorite(productId) { const favSet = new Set(favorites()); favSet.has(productId) ? favSet.delete(productId) : favSet.add(productId); saveFavorites([...favSet]); if (state.selectedProduct?.id === productId) $('[data-sheet-panel]').innerHTML = productSheet(state.selectedProduct); }
function changeQuantity(lineId, delta) { saveCart(cart().map((item) => item.lineId === lineId ? { ...item, quantity: Number(item.quantity || 1) + delta } : item).filter((item) => item.quantity > 0)); }

function renderCart() {
  const list = $('[data-cart-list]'); const summary = $('[data-cart-summary]'); if (!list || !summary) return;
  const items = buildCartItems();
  if (!items.length) { list.innerHTML = `<div class="tg-empty"><strong>корзина пустая</strong><span>добавь вещь из каталога, чтобы оформить заказ.</span></div>`; summary.innerHTML = `<button class="tg-button tg-button-primary full" type="button" data-view="catalog">В каталог</button>`; renderTelegramButtons(); return; }
  list.innerHTML = items.map((item) => `<article class="tg-cart-item"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.product)}" /><div><p class="tg-cart-title">${escapeHtml(item.product)}</p><p class="tg-muted">Размер ${escapeHtml(item.size)} · ${money(item.price)}</p><div class="tg-cart-controls"><div class="tg-qty"><button type="button" data-qty="-1" data-line-id="${escapeHtml(item.lineId)}">−</button><span>${item.quantity}</span><button type="button" data-qty="1" data-line-id="${escapeHtml(item.lineId)}">+</button></div><button class="tg-link-button" type="button" data-remove-line="${escapeHtml(item.lineId)}">убрать</button></div></div></article>`).join('');
  summary.innerHTML = `<div class="tg-total-row"><span>Позиций</span><strong>${items.reduce((s, i) => s + i.quantity, 0)}</strong></div><div class="tg-total-row"><span>Товары</span><strong>${money(cartTotal())}</strong></div><div class="tg-total-row"><span>Оплата</span><strong>после подтверждения</strong></div><button class="tg-button tg-button-primary full" type="button" data-view="checkout">Оформить заказ</button>`;
  renderTelegramButtons();
}
function prefillCheckout() { const form = $('[data-checkout-form]'); if (!form) return; const user = getTelegramUser(); if (user) { const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim(); if (name && !form.elements.name.value) form.elements.name.value = name; if (user.username && !form.elements.phone.value) form.elements.phone.value = `@${user.username}`; } if (!form.elements.city.value) form.elements.city.value = 'Сургут'; }
function buildOrder(form) { const user = getTelegramUser(); const email = String(form.elements.email.value || '').trim() || `telegram-${user?.id || Date.now()}@veast.local`; const commentParts = [String(form.elements.comment.value || '').trim(), user?.username ? `Telegram: @${user.username}` : '', user?.id ? `Telegram ID: ${user.id}` : ''].filter(Boolean); return { customer: { name: form.elements.name.value, phone: form.elements.phone.value, email, city: form.elements.city.value, address: form.elements.address.value, delivery: form.elements.delivery.value, payment: 'После подтверждения', comment: commentParts.join('\n'), privacyAccepted: Boolean(form.elements.privacy.checked) }, items: buildCartItems(), total: cartTotal(), telegram: user }; }
function rememberOrder(order) { const publicOrder = { id: order.id, total: order.total, items: order.items || [], statusKey: order.statusKey || 'created', status: order.status || 'Заказ создан', statusText: order.statusText || 'Принят', createdAt: order.createdAt || new Date().toISOString() }; localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(publicOrder)); const history = orderHistory().filter((item) => item.id !== publicOrder.id); history.push(publicOrder); saveOrderHistory(history); state.activeOrderId = publicOrder.id; }
async function submitOrder(event) { event.preventDefault(); const form = event.currentTarget; if (!cart().length) { toast('Сначала добавь товар в корзину'); setView('catalog'); return; } const button = form.querySelector('button[type="submit"]'); const original = button.textContent; button.disabled = true; button.textContent = 'Отправляем...'; try { const response = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildOrder(form)) }); const data = await response.json().catch(() => ({})); if (!response.ok || !data.ok) throw new Error(data.error || `HTTP ${response.status}`); rememberOrder(data.order || {}); saveCart([]); $('[data-success-text]').textContent = `Заказ ${data.order?.id || ''} создан. VEAST свяжется с тобой для подтверждения.`; renderProfile(); setView('success'); tg?.HapticFeedback?.notificationOccurred?.('success'); } catch (error) { toast(error.message || 'Не удалось отправить заказ'); tg?.HapticFeedback?.notificationOccurred?.('error'); } finally { button.disabled = false; button.textContent = original; } }

function renderProfile() {
  const profile = $('[data-profile-card]'); const historyNode = $('[data-order-history]'); if (!profile || !historyNode) return;
  const user = getTelegramUser(); const history = orderHistory(); const initials = (user?.firstName?.[0] || user?.username?.[0] || 'V').toUpperCase(); const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.username || 'Гость VEAST'; const username = user?.username ? `@${user.username}` : 'username не указан'; const totalSpent = history.reduce((sum, order) => sum + Number(order.total || 0), 0);
  profile.innerHTML = `<div class="tg-profile-head"><div class="tg-avatar">${escapeHtml(initials)}</div><div><p class="tg-profile-name">${escapeHtml(displayName)}</p><p class="tg-profile-meta">${escapeHtml(username)}${user?.id ? ` · ID ${escapeHtml(user.id)}` : ''}</p></div></div><div class="tg-profile-stats"><div class="tg-stat"><strong>${history.length}</strong><span>заказов</span></div><div class="tg-stat"><strong>${favorites().length}</strong><span>в избранном</span></div><div class="tg-stat"><strong>${money(totalSpent)}</strong><span>сумма</span></div></div><div class="tg-profile-actions"><button class="tg-link-button" type="button" data-view="catalog">перейти в каталог</button><button class="tg-link-button" type="button" data-view="favorites">моё избранное</button></div>`;
  historyNode.innerHTML = history.length ? history.slice().reverse().map((order) => historyCard(order)).join('') : `<div class="tg-empty"><strong>история пока пустая</strong><span>после первого заказа он появится здесь.</span></div>`;
}
function historyCard(order) { const items = Array.isArray(order.items) ? order.items : []; const itemText = items.length ? items.slice(0, 2).map((item) => `${item.product || item.title || 'Товар'} × ${item.quantity || 1}`).join(', ') : 'Состав заказа недоступен'; const statusText = order.statusText || order.status || 'Принят'; return `<article class="tg-history-card"><div class="tg-history-top"><div><p class="tg-history-id">${escapeHtml(order.id || 'Заказ')}</p><div class="tg-history-date">${escapeHtml(formatDate(order.createdAt || Date.now()))}</div></div><span class="tg-history-status">${escapeHtml(statusText)}</span></div><p class="tg-history-items"><strong>${money(order.total || 0)}</strong> · ${escapeHtml(itemText)}</p><button class="tg-link-button" type="button" data-open-order="${escapeHtml(order.id || '')}">открыть заказ</button></article>`; }
function localOrderById(id) { return orderHistory().find((order) => String(order.id) === String(id)) || read(LAST_ORDER_KEY, null); }
function renderOrderDetail(order = localOrderById(state.activeOrderId)) {
  const node = $('[data-order-detail]'); if (!node) return;
  if (!order || !order.id) { node.innerHTML = `<div class="tg-empty"><strong>заказ не выбран</strong><span>открой заказ из истории профиля.</span></div>`; return; }
  const key = order.statusKey || 'created'; const activeIndex = Math.max(0, statusSteps.indexOf(key)); const items = Array.isArray(order.items) ? order.items : [];
  node.innerHTML = `<article class="tg-order-card"><p class="tg-kicker">${escapeHtml(order.id)}</p><h2>мой заказ</h2><div class="tg-premium-price"><span>Сумма</span><strong>${money(order.total || 0)}</strong></div><p class="tg-muted">${escapeHtml(order.statusText || order.status || 'Заказ принят VEAST.')}</p><div class="tg-status-flow">${statusSteps.map((step, index) => `<div class="tg-status-step ${index <= activeIndex ? 'done' : ''}"><span></span><div><strong>${statusLabels[step]}</strong><small>${index <= activeIndex ? 'активно' : 'ожидает'}</small></div></div>`).join('')}</div><div class="tg-order-items">${items.length ? items.map((item) => `<div><span>${escapeHtml(item.product || 'Товар')} · ${escapeHtml(item.size || 'OS')} × ${item.quantity || 1}</span><strong>${money(item.subtotal || item.price || 0)}</strong></div>`).join('') : '<div><span>Состав заказа пока недоступен</span></div>'}</div><button class="tg-button full" type="button" data-refresh-order="${escapeHtml(order.id)}">обновить статус</button></article>`;
}
async function openOrder(id) { state.activeOrderId = id; setView('order'); await refreshOrderStatus(id); }
async function refreshOrderStatus(id = state.activeOrderId) { if (!id) return; try { const response = await fetch(`/api/orders/${encodeURIComponent(id)}/status`); if (!response.ok) return; const status = await response.json(); const history = orderHistory(); const index = history.findIndex((order) => order.id === id); if (index >= 0) { history[index] = { ...history[index], ...status, statusKey: status.statusKey || history[index].statusKey, statusText: status.statusText || history[index].statusText }; saveOrderHistory(history); renderProfile(); renderOrderDetail(history[index]); } } catch {} }
function openLastOrder() { const last = read(LAST_ORDER_KEY, null); if (last?.id) openOrder(last.id); else setView('profile'); }

async function loadProducts() { $('[data-products]').innerHTML = loadingSkeleton(); $('[data-featured-products]').innerHTML = loadingSkeleton(); try { const response = await fetch('/api/products', { headers: { Accept: 'application/json' } }); const data = await response.json(); state.products = Array.isArray(data.products) ? data.products : []; state.categories = Array.isArray(data.categories) ? data.categories : [{ id: 'all', title: 'Все товары' }]; renderAll(); const start = getStartParam(); if (start) { const product = productById(start.replace(/^product_/, '')); if (product) setTimeout(() => openProduct(product.id), 250); } } catch (error) { $('[data-products]').innerHTML = `<div class="tg-empty"><strong>каталог не загрузился</strong><span>${escapeHtml(error.message)}</span></div>`; toast('Каталог временно не загрузился'); } }
function renderAll() { renderCategories(); renderProducts(); renderFeatured(); renderFavorites(); renderCart(); renderProfile(); updateCounters(); }
function formatDate(value) { try { return new Date(value).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return 'дата неизвестна'; } }
function bindEvents() {
  document.addEventListener('click', (event) => { const target = event.target.closest('button, [data-open-product]'); if (!target) return; if (target.dataset.view) setView(target.dataset.view); if (target.dataset.nav) setView(target.dataset.nav); if (target.dataset.openCart !== undefined) setView('cart'); if (target.dataset.refresh !== undefined) loadProducts(); if (target.dataset.category) { state.activeCategory = target.dataset.category; renderCategories(); renderProducts(); } if (target.dataset.openProduct) openProduct(target.dataset.openProduct); if (target.dataset.closeSheet !== undefined) closeProduct(); if (target.dataset.selectSize) { state.selectedSize = target.dataset.selectSize; if (state.selectedProduct) $('[data-sheet-panel]').innerHTML = productSheet(state.selectedProduct); } if (target.dataset.addSelected) { addToCart(target.dataset.addSelected, state.selectedSize); closeProduct(); } if (target.dataset.quickAdd) addToCart(target.dataset.quickAdd); if (target.dataset.toggleFavorite) toggleFavorite(target.dataset.toggleFavorite); if (target.dataset.qty) changeQuantity(target.dataset.lineId, Number(target.dataset.qty)); if (target.dataset.removeLine) changeQuantity(target.dataset.removeLine, -9999); if (target.dataset.clearCart !== undefined) saveCart([]); if (target.dataset.themeToggle !== undefined) toggleTheme(); if (target.dataset.openOrder) openOrder(target.dataset.openOrder); if (target.dataset.openLastOrder !== undefined) openLastOrder(); if (target.dataset.refreshOrder) refreshOrderStatus(target.dataset.refreshOrder); });
  $('[data-search]')?.addEventListener('input', (event) => { state.query = event.currentTarget.value; renderProducts(); }); $('[data-checkout-form]')?.addEventListener('submit', submitOrder);
  tg?.BackButton?.onClick(() => { if (state.view === 'checkout') setView('cart'); else if (state.view === 'order') setView('profile'); else if (state.view !== 'drop') setView('drop'); });
  tg?.MainButton?.onClick(() => { if (state.view === 'cart' && cart().length) setView('checkout'); });
}
function initTelegram() { if (!tg) return; tg.ready(); tg.expand(); document.documentElement.classList.add('is-telegram'); }
initTheme(); initTelegram(); bindEvents(); updateCounters(); loadProducts();
