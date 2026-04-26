import { escapeHtml, formatPrice, getLastOrder, initCommon } from '../app.js';

initCommon('');

const container = document.getElementById('orderSuccess');
const params = new URLSearchParams(location.search);
const orderId = params.get('order');
const lastOrder = getLastOrder();
const order = lastOrder && (!orderId || lastOrder.id === orderId) ? lastOrder : null;

if (!order) {
  container.innerHTML = `
    <p class="eyebrow">заказ принят</p>
    <h1>Заказ создан</h1>
    <p>Заказ успешно отправлен. Если нужно проверить путь повторно, вернись в каталог и оформи тестовый заказ.</p>
    <div class="inline-actions">
      <a class="button button-primary" href="catalog.html">Вернуться в каталог</a>
      <a class="button button-ghost" href="account.html">Личный кабинет</a>
    </div>
  `;
} else {
  container.innerHTML = `
    <p class="eyebrow">заказ оформлен</p>
    <h1>Заказ оформлен</h1>
    <p>Покупательский сценарий завершён: товар выбран, корзина проверена, форма отправлена, заказ сохранён.</p>
    <div class="order-confirmation">
      <div><span>Номер заказа</span><strong>${escapeHtml(order.id)}</strong></div>
      <div><span>Статус</span><strong>${escapeHtml(order.status || 'Новая заявка')}</strong></div>
      <div><span>Сумма</span><strong>${formatPrice(order.total || 0)}</strong></div>
      <div><span>Сохранение</span><strong>${escapeHtml(order.savedVia || 'backend/local')}</strong></div>
    </div>
    <h2>Состав заказа</h2>
    <div class="order-mini-list">
      ${(order.items || []).map((item) => `
        <article class="checkout-item">
          ${item.image ? `<img src="${item.image}" alt="${escapeHtml(item.product || item.productId)}" />` : ''}
          <div>
            <strong>${escapeHtml(item.product || item.productId)}</strong>
            <p class="muted">Размер ${escapeHtml(item.size)} · ${item.quantity} шт.</p>
            <p>${formatPrice(item.subtotal || item.price * item.quantity || 0)}</p>
          </div>
        </article>
      `).join('')}
    </div>
    <div class="inline-actions">
      <a class="button button-primary" href="catalog.html">Вернуться в каталог</a>
      <a class="button button-ghost" href="account.html">Посмотреть кабинет</a>
    </div>
  `;
}
