import { escapeHtml, formatPrice, initCommon } from '../app.js';

initCommon('project');

const stats = document.getElementById('backendStats');
const list = document.getElementById('ordersApiList');
const refresh = document.getElementById('refreshOrders');

function renderLoading() {
  stats.innerHTML = '<article class="info-card"><h3>API</h3><p>Loading...</p></article>';
  list.innerHTML = '<div class="empty-state"><h3>Loading orders</h3><p>Checking GET /api/orders endpoint.</p></div>';
}

function renderOrders(orders) {
  const total = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const last = orders.length ? new Date(orders[orders.length - 1].createdAt).toLocaleString('en-US') : 'no orders';
  stats.innerHTML = `
    <article class="info-card"><h3>API status</h3><p>Available</p></article>
    <article class="info-card"><h3>Orders</h3><p>${orders.length}</p></article>
    <article class="info-card"><h3>Total value</h3><p>${formatPrice(total)}</p></article>
    <article class="info-card"><h3>Last order</h3><p>${escapeHtml(last)}</p></article>
  `;

  list.innerHTML = orders.length ? orders.slice().reverse().map((order) => `
    <article class="panel-card order-api-card">
      <div class="account-row">
        <div>
          <p class="eyebrow">${escapeHtml(order.status || 'New order')}</p>
          <h3>${escapeHtml(order.id)}</h3>
          <p class="muted">${new Date(order.createdAt).toLocaleString('en-US')} · ${escapeHtml(order.customer?.name || 'Customer')} · ${escapeHtml(order.customer?.city || 'city not specified')}</p>
        </div>
        <strong>${formatPrice(order.total || 0)}</strong>
      </div>
      <div class="order-mini-list">
        ${(order.items || []).map((item) => `
          <div class="checkout-item">
            ${item.image ? `<img src="${item.image}" alt="${escapeHtml(item.product || item.productId)}" />` : ''}
            <div><strong>${escapeHtml(item.product || item.productId)}</strong><p class="muted">Size ${escapeHtml(item.size || 'OS')} · ${item.quantity} pc.</p></div>
          </div>
        `).join('')}
      </div>
    </article>
  `).join('') : '<div class="empty-state"><h3>No orders yet</h3><p>Place a test order via checkout, then refresh this page.</p><a class="button button-primary" href="checkout.html">Create order</a></div>';
}

function renderError(error) {
  stats.innerHTML = '<article class="info-card"><h3>API status</h3><p>Unavailable</p></article>';
  list.innerHTML = `
    <div class="empty-state api-error-state">
      <h3>Backend is not running or the endpoint is unavailable</h3>
      <p><strong>What happened:</strong> ${escapeHtml(error.message)}.</p>
      <p><strong>How to fix it:</strong> run the project with <code>pnpm dev</code>, reload the page and click “Refresh list”.</p>
      <p><strong>What this page verifies:</strong> GET /api/orders, reading data/orders.json and displaying orders for the project demo.</p>
      <div class="inline-actions"><button class="button button-primary" id="retryOrders" type="button">Retry request</button><a class="button button-ghost" href="checkout.html">Create order</a></div>
    </div>
  `;
}

async function loadOrders() {
  renderLoading();
  try {
    const response = await fetch('/api/orders');
    if (!response.ok) throw new Error('GET /api/orders returned an error');
    const orders = await response.json();
    renderOrders(Array.isArray(orders) ? orders : []);
  } catch (error) {
    renderError(error);
  }
}

refresh.addEventListener('click', loadOrders);
document.addEventListener('click', (event) => { if (event.target.closest('#retryOrders')) loadOrders(); });
loadOrders();
