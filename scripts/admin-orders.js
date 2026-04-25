import { escapeHtml, formatPrice, initCommon } from '../app.js';

initCommon('project');

const stats = document.getElementById('backendStats');
const list = document.getElementById('ordersApiList');
const refresh = document.getElementById('refreshOrders');

function renderLoading() {
  stats.innerHTML = '<article class="info-card"><h3>API</h3><p>Загрузка...</p></article>';
  list.innerHTML = '<div class="empty-state"><h3>Загружаем заказы</h3><p>Проверяем endpoint GET /api/orders.</p></div>';
}

function renderOrders(orders) {
  const total = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const last = orders.length ? new Date(orders[orders.length - 1].createdAt).toLocaleString('ru-RU') : 'нет заказов';
  stats.innerHTML = `
    <article class="info-card"><h3>Статус API</h3><p>Доступен</p></article>
    <article class="info-card"><h3>Заказов</h3><p>${orders.length}</p></article>
    <article class="info-card"><h3>Сумма</h3><p>${formatPrice(total)}</p></article>
    <article class="info-card"><h3>Последний заказ</h3><p>${escapeHtml(last)}</p></article>
  `;

  list.innerHTML = orders.length ? orders.slice().reverse().map((order) => `
    <article class="panel-card order-api-card">
      <div class="account-row">
        <div>
          <p class="eyebrow">${escapeHtml(order.status || 'Новая заявка')}</p>
          <h3>${escapeHtml(order.id)}</h3>
          <p class="muted">${new Date(order.createdAt).toLocaleString('ru-RU')} · ${escapeHtml(order.customer?.name || 'Покупатель')} · ${escapeHtml(order.customer?.city || 'город не указан')}</p>
        </div>
        <strong>${formatPrice(order.total || 0)}</strong>
      </div>
      <div class="order-mini-list">
        ${(order.items || []).map((item) => `
          <div class="checkout-item">
            ${item.image ? `<img src="${item.image}" alt="${escapeHtml(item.product || item.productId)}" />` : ''}
            <div><strong>${escapeHtml(item.product || item.productId)}</strong><p class="muted">Размер ${escapeHtml(item.size || 'OS')} · ${item.quantity} шт.</p></div>
          </div>
        `).join('')}
      </div>
    </article>
  `).join('') : '<div class="empty-state"><h3>Заказов пока нет</h3><p>Оформи тестовый заказ через checkout, затем обнови эту страницу.</p><a class="button button-primary" href="checkout.html">Создать заказ</a></div>';
}

function renderError(error) {
  stats.innerHTML = '<article class="info-card"><h3>Статус API</h3><p>Недоступен</p></article>';
  list.innerHTML = `
    <div class="empty-state api-error-state">
      <h3>Backend не запущен или endpoint недоступен</h3>
      <p><strong>Что произошло:</strong> ${escapeHtml(error.message)}.</p>
      <p><strong>Как исправить:</strong> запусти проект командой <code>npm start</code>, открой страницу заново и нажми «Обновить список».</p>
      <p><strong>Что проверяет эта страница:</strong> GET /api/orders, чтение data/orders.json и отображение заказов.</p>
      <div class="inline-actions"><button class="button button-primary" id="retryOrders" type="button">Повторить запрос</button><a class="button button-ghost" href="checkout.html">Создать заказ</a></div>
    </div>
  `;
}

async function loadOrders() {
  renderLoading();
  try {
    const response = await fetch('/api/orders');
    if (!response.ok) throw new Error('GET /api/orders вернул ошибку');
    const orders = await response.json();
    renderOrders(Array.isArray(orders) ? orders : []);
  } catch (error) {
    renderError(error);
  }
}

refresh.addEventListener('click', loadOrders);
document.addEventListener('click', (event) => { if (event.target.closest('#retryOrders')) loadOrders(); });
loadOrders();
