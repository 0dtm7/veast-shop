import { escapeHtml, formatPrice, getFavorites, getLocalOrders, initCommon, saveLocalOrders } from '../app.js';

initCommon('account');

const ordersList = document.getElementById('ordersList');
const favoriteStat = document.getElementById('favoriteStat');
const orderStat = document.getElementById('orderStat');

favoriteStat.textContent = getFavorites().length;

async function loadOrders() {
  const localOrders = getLocalOrders();
  try {
    const response = await fetch('/api/orders');
    if (!response.ok) throw new Error(`GET /api/orders: HTTP ${response.status}`);
    const serverOrders = await response.json();
    const merged = [...localOrders];
    serverOrders.forEach((order) => {
      if (!merged.some((item) => item.id === order.id)) merged.push({ ...order, savedVia: 'backend API' });
    });
    saveLocalOrders(merged);
    return { orders: merged, apiStatus: 'backend API подключён' };
  } catch (error) {
    return { orders: localOrders, apiStatus: `backend недоступен, показаны локальные заказы: ${error.message}` };
  }
}

function renderOrders(payload) {
  const orders = Array.isArray(payload) ? payload : payload.orders;
  const apiStatus = Array.isArray(payload) ? '' : payload.apiStatus;
  orderStat.textContent = orders.length;
  const statusHtml = apiStatus ? `<div class="api-alert api-alert-inline">${escapeHtml(apiStatus)}</div>` : '';
  ordersList.innerHTML = statusHtml + (orders.length ? orders.slice().reverse().map((order) => `
    <article class="panel-card account-row">
      <div>
        <h3>${escapeHtml(order.id)}</h3>
        <p class="muted">${new Date(order.createdAt).toLocaleString('ru-RU')} · ${escapeHtml(order.status || 'Новая заявка')} · ${escapeHtml(order.savedVia || 'backend/local')}</p>
      </div>
      <strong>${formatPrice(order.total || 0)}</strong>
    </article>
  `).join('') : '<div class="empty-state"><h3>Заказов пока нет</h3><p>Оформи заказ, чтобы он появился в истории и подтвердил коммерческий сценарий.</p><a class="button button-primary" href="catalog.html">Перейти в каталог</a></div>');
}

ordersList.innerHTML = '<div class="empty-state"><h3>Загружаем историю заказов</h3><p>Проверяем localStorage и backend API.</p></div>';
loadOrders().then(renderOrders);
