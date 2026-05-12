import { escapeHtml, formatPrice, getLastOrder, initCommon, isEnglish } from '../app.js';

initCommon('');

const container = document.getElementById('orderSuccess');
const params = new URLSearchParams(location.search);
const orderId = params.get('order');
const lastOrder = getLastOrder();
const cachedOrder = lastOrder && (!orderId || lastOrder.id === orderId) ? lastOrder : null;
const t = (ru, en) => (isEnglish() ? en : ru);

function renderEmpty() {
  container.innerHTML = `
    <p class="eyebrow">${t('заказ', 'success')}</p>
    <h1>${t('Заказ создан', 'Order created')}</h1>
    <p>${t('Заказ был успешно отправлен. Чтобы проверить сценарий ещё раз, вернитесь в каталог и оформите новый тестовый заказ.', 'The order was submitted successfully. If you want to test the flow again, return to the catalog and place another test order.')}</p>
    <div class="inline-actions">
      <a class="button button-primary" href="catalog.html">${t('В каталог', 'Back to catalog')}</a>
      <a class="button button-ghost" href="account.html">${t('В кабинет', 'Account')}</a>
    </div>
  `;
}

function telegramBlock(order) {
  if (!order.telegramBotLink) {
    return `
      <div class="telegram-order-card">
        <p class="eyebrow">telegram status</p>
        <h2>${t('Статус в Telegram', 'Telegram order status')}</h2>
        <p>${t('Telegram-ссылка появится для заказов, сохранённых через backend API. Если заказ сохранился локально, запусти сервер и оформи заказ ещё раз.', 'The Telegram link appears for orders saved through the backend API. If the order was saved locally, run the server and place the order again.')}</p>
      </div>
    `;
  }

  return `
    <div class="telegram-order-card">
      <p class="eyebrow">telegram status</p>
      <h2>${t('Статус заказа в Telegram', 'Order status in Telegram')}</h2>
      <p>${t('Нажмите кнопку, чтобы бот VEAST присылал статус заказа, трек-номер и обновления доставки.', 'Open the bot to receive order status, tracking number and delivery updates.')}</p>
      <a class="button button-primary full" href="${escapeHtml(order.telegramBotLink)}" target="_blank" rel="noreferrer">${t('Получать статус в Telegram', 'Get Telegram status')}</a>
      <p class="muted">${t('После привязки в боте команда /status покажет текущий статус заказа.', 'After linking, the /status command will show the current order status.')}</p>
    </div>
  `;
}

function renderOrder(order) {
  container.innerHTML = `
    <p class="eyebrow">${t('заказ оформлен', 'commercial action complete')}</p>
    <h1>${t('Заказ оформлен', 'Order placed')}</h1>
    <p>${t('Путь покупки завершён: товар выбран, корзина проверена, форма отправлена, заказ сохранён.', 'The shopping journey is complete: the item was selected, the cart was reviewed, the form was submitted and the order was saved.')}</p>
    <div class="order-confirmation">
      <div><span>${t('Номер заказа', 'Order number')}</span><strong>${escapeHtml(order.id)}</strong></div>
      <div><span>${t('Статус', 'Status')}</span><strong>${escapeHtml(order.status || t('Заказ создан', 'New order'))}</strong></div>
      <div><span>${t('Сумма', 'Amount')}</span><strong>${formatPrice(order.total || 0)}</strong></div>
      <div><span>${t('Сохранено через', 'Saved via')}</span><strong>${escapeHtml(order.savedVia || 'backend API')}</strong></div>
    </div>
    ${telegramBlock(order)}
    <h2>${t('Состав заказа', 'Order items')}</h2>
    <div class="order-mini-list">
      ${(order.items || []).map((item) => `
        <article class="checkout-item">
          ${item.image ? `<img src="${item.image}" alt="${escapeHtml(item.product || item.productId)}" />` : ''}
          <div>
            <strong>${escapeHtml(item.product || item.productId)}</strong>
            <p class="muted">${t('Размер', 'Size')} ${escapeHtml(item.size)} · ${item.quantity} ${t('шт.', 'pc.')}</p>
            <p>${formatPrice(item.subtotal || item.price * item.quantity || 0)}</p>
          </div>
        </article>
      `).join('')}
    </div>
    <div class="inline-actions">
      <a class="button button-primary" href="catalog.html">${t('В каталог', 'Back to catalog')}</a>
      <a class="button button-ghost" href="account.html">${t('В кабинет', 'View account')}</a>
    </div>
  `;
}

async function loadFreshOrder() {
  if (!orderId) return cachedOrder;
  try {
    const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}`);
    if (!response.ok) return cachedOrder;
    return await response.json();
  } catch {
    return cachedOrder;
  }
}

async function init() {
  const freshOrder = await loadFreshOrder();
  if (!freshOrder) renderEmpty();
  else renderOrder(freshOrder);
}

init();
