import { escapeHtml, formatPrice, getFavorites, getLocalOrders, initCommon, isEnglish } from '../app.js';

initCommon('account');

const ordersList = document.getElementById('ordersList');
const favoriteStat = document.getElementById('favoriteStat');
const orderStat = document.getElementById('orderStat');

const t = (ru, en) => (isEnglish() ? en : ru);

favoriteStat.textContent = getFavorites().length;

function formatDate(value) {
  if (!value) return '—';
  try { return new Date(value).toLocaleString(isEnglish() ? 'en-US' : 'ru-RU'); }
  catch { return String(value); }
}

function renderOrders() {
  const orders = getLocalOrders();
  orderStat.textContent = orders.length;

  ordersList.innerHTML = orders.length ? orders.slice().reverse().map((order) => `
    <article class="panel-card account-row">
      <div>
        <h3>${escapeHtml(order.id)}</h3>
        <p class="muted">${formatDate(order.createdAt)} · ${escapeHtml(order.status || t('Заказ создан', 'Order created'))}</p>
        <p class="muted">${t('Показываются только заказы, оформленные в этом браузере.', 'Only orders placed in this browser are shown here.')}</p>
      </div>
      <strong>${formatPrice(order.total || 0)}</strong>
    </article>
  `).join('') : `
    <div class="empty-state">
      <h3>${t('Заказов пока нет', 'No orders yet')}</h3>
      <p>${t('Здесь будут только ваши заказы из этого браузера. Чужие backend-заказы больше не выводятся в личном кабинете.', 'Only your orders from this browser will appear here. Other backend orders are no longer shown in the account page.')}</p>
      <a class="button button-primary" href="catalog.html">${t('В каталог', 'Go to catalog')}</a>
    </div>
  `;
}

ordersList.innerHTML = `<div class="empty-state"><h3>${t('Загружаем историю заказов', 'Loading order history')}</h3><p>${t('Проверяем локальные заказы этого браузера.', 'Checking local orders from this browser.')}</p></div>`;
renderOrders();
