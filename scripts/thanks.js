import { escapeHtml, formatPrice, getLastOrder, initCommon, scheduleTranslation } from '../app.js';

initCommon('');

const container = document.getElementById('orderSuccess');
const params = new URLSearchParams(location.search);
const orderId = params.get('order');
const lastOrder = getLastOrder();
const order = lastOrder && (!orderId || lastOrder.id === orderId) ? lastOrder : null;

if (!order) {
  container.innerHTML = `
    <p class="eyebrow">success</p>
    <h1>Order created</h1>
    <p>The order was submitted successfully. If you want to test the flow again, return to the catalog and place another test order.</p>
    <div class="inline-actions">
      <a class="button button-primary" href="catalog.html">Back to catalog</a>
      <a class="button button-ghost" href="account.html">Account</a>
    </div>
  `;
} else {
  container.innerHTML = `
    <p class="eyebrow">commercial action complete</p>
    <h1>Order placed</h1>
    <p>The shopping journey is complete: the item was selected, the cart was reviewed, the form was submitted and the order was saved.</p>
    <div class="order-confirmation">
      <div><span>Order number</span><strong>${escapeHtml(order.id)}</strong></div>
      <div><span>Status</span><strong>${escapeHtml(order.status || 'New order')}</strong></div>
      <div><span>Amount</span><strong>${formatPrice(order.total || 0)}</strong></div>
      <div><span>Saved via</span><strong>${escapeHtml(order.savedVia || 'backend/local')}</strong></div>
    </div>
    <h2>Order items</h2>
    <div class="order-mini-list">
      ${(order.items || []).map((item) => `
        <article class="checkout-item">
          ${item.image ? `<img src="${item.image}" alt="${escapeHtml(item.product || item.productId)}" />` : ''}
          <div>
            <strong>${escapeHtml(item.product || item.productId)}</strong>
            <p class="muted">Size ${escapeHtml(item.size)} · ${item.quantity} pc.</p>
            <p>${formatPrice(item.subtotal || item.price * item.quantity || 0)}</p>
          </div>
        </article>
      `).join('')}
    </div>
    <div class="inline-actions">
      <a class="button button-primary" href="catalog.html">Back to catalog</a>
      <a class="button button-ghost" href="account.html">View account</a>
    </div>
  `;
}

requestAnimationFrame(scheduleTranslation);
