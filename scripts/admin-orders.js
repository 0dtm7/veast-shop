import { escapeHtml, formatPrice, initCommon, isEnglish } from '../app.js';

initCommon('project');

const stats = document.getElementById('backendStats');
const list = document.getElementById('ordersApiList');
const refresh = document.getElementById('refreshOrders');
const webhookButton = document.getElementById('setupTelegramWebhook');
const ordersJsonLink = document.getElementById('openOrdersJson');
const adminKeyForm = document.getElementById('adminKeyForm');
const adminKeyInput = document.getElementById('adminKeyInput');
const adminMessage = document.getElementById('adminMessage');
const ADMIN_KEY_STORAGE = 'veast_admin_status_key_v1';

const t = (ru, en) => (isEnglish() ? en : ru);

const STATUS_OPTIONS = [
  ['created', 'Заказ создан'],
  ['packed', 'Заказ собран'],
  ['shipped', 'Передан в доставку'],
  ['in_transit', 'В пути'],
  ['ready_for_pickup', 'Ожидает получения'],
  ['delivered', 'Заказ получен'],
];

const DEFAULT_TEXT = {
  created: 'Мы получили заказ и скоро передадим его в обработку.',
  packed: 'Заказ собран и готовится к передаче в доставку.',
  shipped: 'Заказ передан в службу доставки.',
  in_transit: 'Заказ находится в пути.',
  ready_for_pickup: 'Заказ ожидает получения в пункте выдачи.',
  delivered: 'Спасибо за покупку в VEAST.',
};

function getAdminKey() {
  return adminKeyInput.value.trim();
}

function updateOrdersJsonLink() {
  const key = getAdminKey();
  if (!ordersJsonLink) return;
  ordersJsonLink.href = key ? `/api/orders?key=${encodeURIComponent(key)}` : '#';
  ordersJsonLink.setAttribute('aria-disabled', key ? 'false' : 'true');
}

function setAdminMessage(text, type = '') {
  adminMessage.innerHTML = text ? `<span class="${type}">${escapeHtml(text)}</span>` : '';
}

function renderLoading() {
  stats.innerHTML = '<article class="info-card"><h3>API</h3><p>Загружаем...</p></article>';
  list.innerHTML = '<div class="empty-state"><h3>Загружаем заказы</h3><p>Проверяем защищённый GET /api/orders.</p></div>';
}

function formatDate(value) {
  if (!value) return '—';
  try { return new Date(value).toLocaleString(isEnglish() ? 'en-US' : 'ru-RU'); }
  catch { return String(value); }
}

function statusOptionsHtml(active = 'created') {
  return STATUS_OPTIONS.map(([key, label]) => `<option value="${key}" ${key === active ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('');
}

function providerOptionsHtml(active = '') {
  const providers = ['', 'СДЭК', 'Почта России', 'Самовывоз'];
  return providers.map((provider) => `<option value="${escapeHtml(provider)}" ${provider === active ? 'selected' : ''}>${provider ? escapeHtml(provider) : 'Не выбрано'}</option>`).join('');
}

function deliveryPointHtml(order) {
  const point = order.deliveryPoint;
  if (!point) return '';
  const title = [point.providerTitle || 'СДЭК', point.code ? `ПВЗ ${point.code}` : point.name].filter(Boolean).join(' · ');
  const details = [point.city, point.address, point.workTime ? `График: ${point.workTime}` : ''].filter(Boolean).join(' · ');
  return `
    <div class="delivery-point-admin">
      <span>Пункт выдачи</span>
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(details || 'Адрес не указан')}</p>
    </div>
  `;
}

function historyHtml(order) {
  const history = Array.isArray(order.statusHistory) ? order.statusHistory.slice().reverse() : [];
  if (!history.length) return '<p class="muted">История статусов пока пустая.</p>';
  return `
    <div class="status-history">
      ${history.map((entry) => `
        <div class="status-history-item">
          <strong>${escapeHtml(entry.status || entry.statusKey || 'Статус')}</strong>
          <span>${escapeHtml(formatDate(entry.date))}</span>
          <p>${escapeHtml(entry.text || '')}</p>
          ${(entry.currentLocation || entry.trackingNumber) ? `<p class="muted">${entry.currentLocation ? `Где: ${escapeHtml(entry.currentLocation)}` : ''}${entry.currentLocation && entry.trackingNumber ? ' · ' : ''}${entry.trackingNumber ? `Трек: ${escapeHtml(entry.trackingNumber)}` : ''}</p>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

function renderOrders(orders) {
  const total = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const last = orders.length ? formatDate(orders[orders.length - 1].createdAt) : 'заказов нет';
  const linked = orders.filter((order) => order.telegramChatId).length;

  stats.innerHTML = `
    <article class="info-card"><h3>API</h3><p>Доступен</p></article>
    <article class="info-card"><h3>Заказы</h3><p>${orders.length}</p></article>
    <article class="info-card"><h3>Telegram</h3><p>${linked} привязано</p></article>
    <article class="info-card"><h3>Сумма</h3><p>${formatPrice(total)}</p></article>
  `;

  list.innerHTML = orders.length ? orders.slice().reverse().map((order) => {
    const statusKey = order.statusKey || 'created';
    const statusText = order.statusText || DEFAULT_TEXT[statusKey] || '';
    const provider = order.deliveryProvider || order.customer?.delivery || '';
    return `
      <article class="panel-card order-api-card order-admin-card" data-order-card="${escapeHtml(order.id)}">
        <div class="account-row order-admin-head">
          <div>
            <p class="eyebrow">${escapeHtml(order.status || 'Заказ создан')}</p>
            <h3>${escapeHtml(order.id)}</h3>
            <p class="muted">${formatDate(order.createdAt)} · ${escapeHtml(order.customer?.name || 'Клиент')} · ${escapeHtml(order.customer?.city || 'город не указан')}</p>
            <p class="muted">${escapeHtml(order.customer?.phone || '')}${order.customer?.email ? ` · ${escapeHtml(order.customer.email)}` : ''}</p>
          </div>
          <div class="order-admin-meta">
            <strong>${formatPrice(order.total || 0)}</strong>
            <span class="status-pill ${order.telegramChatId ? 'status-pill-ok' : ''}">${order.telegramChatId ? 'Telegram привязан' : 'Telegram не привязан'}</span>
          </div>
        </div>

        <div class="order-mini-list">
          ${(order.items || []).map((item) => `
            <div class="checkout-item">
              ${item.image ? `<img src="${item.image}" alt="${escapeHtml(item.product || item.productId)}" />` : ''}
              <div><strong>${escapeHtml(item.product || item.productId)}</strong><p class="muted">Размер ${escapeHtml(item.size || 'OS')} · ${item.quantity} шт.</p></div>
            </div>
          `).join('')}
        </div>

        ${deliveryPointHtml(order)}

        ${order.telegramBotLink ? `
          <div class="telegram-admin-line">
            <span>Ссылка для клиента:</span>
            <a href="${escapeHtml(order.telegramBotLink)}" target="_blank" rel="noreferrer">${escapeHtml(order.telegramBotLink)}</a>
          </div>
        ` : ''}

        <form class="order-status-form" data-order-id="${escapeHtml(order.id)}">
          <div class="form-grid">
            <label class="field">
              <span>Статус</span>
              <select name="statusKey">${statusOptionsHtml(statusKey)}</select>
            </label>
            <label class="field">
              <span>Служба доставки</span>
              <select name="deliveryProvider">${providerOptionsHtml(provider)}</select>
            </label>
            <label class="field">
              <span>Трек-номер</span>
              <input name="trackingNumber" value="${escapeHtml(order.trackingNumber || '')}" placeholder="Например, 1234567890" />
            </label>
            <label class="field">
              <span>Где сейчас</span>
              <input name="currentLocation" value="${escapeHtml(order.currentLocation || '')}" placeholder="Например, Москва, сортировочный центр" />
            </label>
            <label class="field full">
              <span>Сообщение клиенту</span>
              <textarea name="statusText" rows="3">${escapeHtml(statusText)}</textarea>
            </label>
          </div>
          <div class="inline-actions">
            <button class="button button-primary" type="submit">Обновить статус и отправить в Telegram</button>
          </div>
          <p class="form-message" data-order-message></p>
        </form>

        <details class="status-details">
          <summary>История статусов</summary>
          ${historyHtml(order)}
        </details>
      </article>
    `;
  }).join('') : '<div class="empty-state"><h3>Заказов пока нет</h3><p>Оформи тестовый заказ через checkout, затем обнови страницу.</p><a class="button button-primary" href="checkout.html">Создать заказ</a></div>';
}

function renderError(error) {
  stats.innerHTML = '<article class="info-card"><h3>API</h3><p>Недоступен</p></article>';
  list.innerHTML = `
    <div class="empty-state api-error-state">
      <h3>Backend не запущен или endpoint недоступен</h3>
      <p><strong>Что произошло:</strong> ${escapeHtml(error.message)}.</p>
      <p><strong>Как исправить:</strong> запусти проект через <code>pnpm dev</code>, обнови страницу и нажми “Обновить список”.</p>
      <div class="inline-actions"><button class="button button-primary" id="retryOrders" type="button">Повторить запрос</button><a class="button button-ghost" href="checkout.html">Создать заказ</a></div>
    </div>
  `;
}

async function loadOrders() {
  updateOrdersJsonLink();
  const adminKey = getAdminKey();
  if (!adminKey) {
    stats.innerHTML = '<article class="info-card"><h3>API</h3><p>Нужен ключ</p></article>';
    list.innerHTML = '<div class="empty-state"><h3>Введите ADMIN_STATUS_KEY</h3><p>Список заказов закрыт от обычных посетителей. Введите ключ администратора и нажмите “Сохранить ключ”.</p></div>';
    return;
  }

  renderLoading();
  try {
    const response = await fetch('/api/orders', { headers: { 'x-admin-key': adminKey } });
    const data = await response.json().catch(() => []);
    if (!response.ok) throw new Error(data.error || 'GET /api/orders вернул ошибку');
    renderOrders(Array.isArray(data) ? data : []);
  } catch (error) {
    renderError(error);
  }
}

async function updateOrderStatus(form) {
  const orderId = form.dataset.orderId;
  const message = form.querySelector('[data-order-message]');
  const adminKey = getAdminKey();

  if (!adminKey) {
    message.innerHTML = '<span class="error-text">Сначала укажи ADMIN_STATUS_KEY.</span>';
    return;
  }

  const formData = Object.fromEntries(new FormData(form).entries());
  message.innerHTML = '<span class="api-alert api-alert-loading">Обновляем статус...</span>';

  try {
    const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': adminKey,
      },
      body: JSON.stringify(formData),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);

    const telegramText = data.telegram?.ok
      ? 'Сообщение отправлено в Telegram.'
      : (data.telegram?.skipped ? 'Статус сохранён. Telegram пока не привязан к заказу.' : 'Статус сохранён, но Telegram не подтвердил отправку.');
    message.innerHTML = `<span class="api-alert api-alert-success">${escapeHtml(telegramText)}</span>`;
    await loadOrders();
  } catch (error) {
    message.innerHTML = `<span class="error-text">${escapeHtml(error.message)}</span>`;
  }
}

async function setupWebhook() {
  const adminKey = getAdminKey();
  if (!adminKey) {
    setAdminMessage('Сначала укажи ADMIN_STATUS_KEY.', 'error-text');
    return;
  }

  setAdminMessage('Подключаем Telegram webhook...', 'api-alert api-alert-loading');
  try {
    const response = await fetch('/api/telegram/set-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify({}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      const details = [data.error, data.telegram?.description, data.telegram?.code, data.telegram?.hint].filter(Boolean).join(' — ');
      throw new Error(details || 'Telegram webhook не подключился');
    }
    setAdminMessage(`Webhook подключён: ${data.webhookUrl}`, 'api-alert api-alert-success');
  } catch (error) {
    const text = error.message === 'Failed to fetch'
      ? 'Админка не смогла достучаться до backend. Проверь, что сайт задеплоился и открылся именно через https://veast-shop-nsdh.onrender.com/admin-orders.html.'
      : error.message;
    setAdminMessage(text, 'error-text');
  }
}

const savedKey = localStorage.getItem(ADMIN_KEY_STORAGE) || '';
adminKeyInput.value = savedKey;
updateOrdersJsonLink();

adminKeyForm.addEventListener('submit', (event) => {
  event.preventDefault();
  localStorage.setItem(ADMIN_KEY_STORAGE, getAdminKey());
  updateOrdersJsonLink();
  setAdminMessage('Ключ сохранён в этом браузере. Загружаем заказы.', 'api-alert api-alert-success');
  loadOrders();
});

refresh.addEventListener('click', loadOrders);
webhookButton.addEventListener('click', setupWebhook);

document.addEventListener('click', (event) => {
  if (event.target.closest('#retryOrders')) loadOrders();
});

document.addEventListener('change', (event) => {
  const select = event.target.closest('select[name="statusKey"]');
  if (!select) return;
  const form = select.closest('form');
  const textarea = form?.querySelector('textarea[name="statusText"]');
  if (textarea && (!textarea.value.trim() || Object.values(DEFAULT_TEXT).includes(textarea.value.trim()))) {
    textarea.value = DEFAULT_TEXT[select.value] || '';
  }
});

document.addEventListener('submit', (event) => {
  const form = event.target.closest('.order-status-form');
  if (!form) return;
  event.preventDefault();
  updateOrderStatus(form);
});

loadOrders();
