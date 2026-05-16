import { escapeHtml, formatPrice, getLastOrder, initCommon, isEnglish } from '../app.js';

initCommon('');

const container = document.getElementById('orderSuccess');
const params = new URLSearchParams(location.search);
const orderId = params.get('order');
const lastOrder = getLastOrder();
const cachedOrder = lastOrder && (!orderId || lastOrder.id === orderId) ? lastOrder : null;
const t = (ru, en) => (isEnglish() ? en : ru);
const BOT_USERNAME = 'VEAST_Order_Bot';
const SUPPORT_USERNAME = 'veast_support';

function renderEmpty() {
  container.innerHTML = `
    <p class="eyebrow">${t('заказ', 'success')}</p>
    <h1>${t('Заказ создан', 'Order created')}</h1>
    <p>${t('Заказ успешно отправлен. Мы свяжемся с вами для подтверждения деталей.', 'The order was submitted successfully. We will contact you to confirm the details.')}</p>
    <div class="inline-actions">
      <a class="button button-primary" href="catalog.html">${t('В каталог', 'Back to catalog')}</a>
      <a class="button button-ghost" href="account.html">${t('В кабинет', 'Account')}</a>
    </div>
  `;
}

function deliveryPointBlock(order) {
  const point = order.deliveryPoint;
  if (!point) return '';
  const title = [point.providerTitle || 'СДЭК', point.code ? `ПВЗ ${point.code}` : point.name].filter(Boolean).join(' · ');
  const details = [point.city, point.address, point.workTime ? `График: ${point.workTime}` : ''].filter(Boolean).join(' · ');
  return `
    <div class="telegram-order-card delivery-confirm-card">
      <p class="eyebrow">delivery point</p>
      <h2>${t('Пункт выдачи выбран', 'Pickup point selected')}</h2>
      <p><strong>${escapeHtml(title)}</strong></p>
      <p class="muted">${escapeHtml(details)}</p>
    </div>
  `;
}

function telegramBlock(order) {
  const code = order.telegramLinkToken || '';
  const botLink = order.telegramBotLink || (code ? `https://t.me/${BOT_USERNAME}?start=${encodeURIComponent(code)}` : '');

  if (!code) {
    return `
      <div class="telegram-order-card">
        <p class="eyebrow">order status</p>
        <h2>${t('Статус заказа', 'Order status')}</h2>
        <p>${t(`Если нужна помощь по заказу, напишите в поддержку @${SUPPORT_USERNAME}.`, `For order support, message @${SUPPORT_USERNAME}.`)}</p>
      </div>
    `;
  }

  return `
    <div class="telegram-order-card telegram-connect-card">
      <p class="eyebrow">order status</p>
      <h2>${t('Отслеживание в Telegram', 'Telegram tracking')}</h2>
      <p>${t('Подключите уведомления, чтобы получать статус заказа, трек-номер и обновления доставки.', 'Connect updates to receive order status, tracking number and delivery notifications.')}</p>
      ${botLink ? `<a class="button button-primary full" href="${escapeHtml(botLink)}" target="_blank" rel="noreferrer">${t('Открыть Telegram-бота', 'Open Telegram bot')}</a>` : ''}
      <div class="telegram-fallback-box">
        <strong>${t('Если кнопка не открывается', 'If the button does not open')}</strong>
        <p>${t(`Откройте Telegram вручную, найдите @${BOT_USERNAME} и отправьте код привязки:`, `Open Telegram manually, find @${BOT_USERNAME}, and send this link code:`)}</p>
        <div class="link-code-row">
          <code>${escapeHtml(code)}</code>
          <button class="button button-ghost" type="button" data-copy-code="${escapeHtml(code)}">${t('Скопировать код', 'Copy code')}</button>
        </div>
        <p class="muted">${t(`Поддержка: @${SUPPORT_USERNAME}`, `Support: @${SUPPORT_USERNAME}`)}</p>
      </div>
    </div>
  `;
}

function renderOrder(order) {
  container.innerHTML = `
    <p class="eyebrow">${t('заказ оформлен', 'order placed')}</p>
    <h1>${t('Заказ оформлен', 'Order placed')}</h1>
    <p>${t('Заказ принят. Проверьте состав заказа и подключите уведомления, чтобы получать обновления статуса.', 'The order has been placed. Review your order and connect updates to receive status notifications.')}</p>
    <div class="order-confirmation">
      <div><span>${t('Номер заказа', 'Order number')}</span><strong>${escapeHtml(order.id)}</strong></div>
      <div><span>${t('Статус', 'Status')}</span><strong>${escapeHtml(order.status || t('Заказ создан', 'New order'))}</strong></div>
      <div><span>${t('Сумма', 'Amount')}</span><strong>${formatPrice(order.total || 0)}</strong></div>
    </div>
    ${deliveryPointBlock(order)}
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

document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-copy-code]');
  if (!button) return;
  const code = button.dataset.copyCode || '';
  try {
    await navigator.clipboard.writeText(code);
    button.textContent = t('Код скопирован', 'Copied');
  } catch {
    button.textContent = t('Скопируйте вручную', 'Copy manually');
  }
});

init();
