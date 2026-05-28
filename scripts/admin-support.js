import { escapeHtml, initCommon } from '../app.js';

initCommon('project');

const ADMIN_KEY_STORAGE = 'veast_admin_status_key_v1';
const adminKeyForm = document.getElementById('adminKeyForm');
const adminKeyInput = document.getElementById('adminKeyInput');
const adminMessage = document.getElementById('adminMessage');
const refreshSupport = document.getElementById('refreshSupport');
const supportStats = document.getElementById('supportStats');
const feedbackList = document.getElementById('feedbackList');

function getAdminKey() {
  return adminKeyInput.value.trim();
}

function setAdminMessage(text, type = '') {
  adminMessage.innerHTML = text ? `<span class="${type}">${escapeHtml(text)}</span>` : '';
}

function formatDate(value) {
  if (!value) return '—';
  try { return new Date(value).toLocaleString('ru-RU'); }
  catch { return String(value); }
}

function feedbackStatusLabel(status = 'new') {
  if (status === 'answered') return 'Отвечено';
  if (status === 'in_progress') return 'В работе';
  return 'Новое';
}

function feedbackTopicLabel(topic = '') {
  const topics = {
    order: 'Заказ',
    size: 'Размер',
    delivery: 'Доставка',
    return: 'Возврат',
    other: 'Другое',
    general: 'Общее',
  };
  return topics[topic] || 'Обращение';
}

function telegramContactLink(contact = '') {
  const value = String(contact || '').trim();
  if (!value.startsWith('@')) return '';
  const username = value.replace(/^@+/, '');
  return username ? `https://t.me/${encodeURIComponent(username)}` : '';
}

function renderStats(items = []) {
  const fresh = items.filter((item) => item.status === 'new').length;
  const progress = items.filter((item) => item.status === 'in_progress').length;
  const answered = items.filter((item) => item.status === 'answered').length;
  supportStats.innerHTML = `
    <article class="info-card"><h3>Всего</h3><p>${items.length}</p></article>
    <article class="info-card"><h3>Новые</h3><p>${fresh}</p></article>
    <article class="info-card"><h3>В работе</h3><p>${progress}</p></article>
    <article class="info-card"><h3>Отвечено</h3><p>${answered}</p></article>
  `;
}

function renderFeedback(items = []) {
  const sorted = items.slice().reverse();
  renderStats(items);
  feedbackList.innerHTML = sorted.length ? sorted.map((item) => {
    const link = telegramContactLink(item.contact);
    return `
      <article class="panel-card feedback-admin-card" data-feedback-id="${escapeHtml(item.id)}">
        <div class="account-row order-admin-head">
          <div>
            <p class="eyebrow">${escapeHtml(feedbackTopicLabel(item.topic))}</p>
            <h3>${escapeHtml(item.name || 'Покупатель')}</h3>
            <p class="muted">${escapeHtml(formatDate(item.createdAt))}${item.orderId ? ` · Заказ ${escapeHtml(item.orderId)}` : ''}</p>
            <p class="muted">Контакт: ${link ? `<a href="${escapeHtml(link)}" target="_blank" rel="noreferrer">${escapeHtml(item.contact)}</a>` : escapeHtml(item.contact || 'не указан')}</p>
          </div>
          <div class="order-admin-meta">
            <span class="status-pill ${item.status === 'answered' ? 'status-pill-ok' : ''}">${escapeHtml(feedbackStatusLabel(item.status))}</span>
          </div>
        </div>
        <div class="support-message-box">
          <p>${escapeHtml(item.message || '')}</p>
        </div>
        <form class="feedback-status-form" data-feedback-id="${escapeHtml(item.id)}">
          <div class="form-grid">
            <label class="field">
              <span>Статус</span>
              <select name="status">
                <option value="new" ${item.status === 'new' ? 'selected' : ''}>Новое</option>
                <option value="in_progress" ${item.status === 'in_progress' ? 'selected' : ''}>В работе</option>
                <option value="answered" ${item.status === 'answered' ? 'selected' : ''}>Отвечено</option>
              </select>
            </label>
            <label class="field full">
              <span>Заметка по ответу</span>
              <textarea name="adminReply" rows="3" placeholder="Например: ответили в Telegram">${escapeHtml(item.adminReply || '')}</textarea>
            </label>
          </div>
          <div class="inline-actions">
            ${link ? `<a class="button button-ghost" href="${escapeHtml(link)}" target="_blank" rel="noreferrer">Открыть Telegram</a>` : ''}
            <button class="button button-primary" type="submit">Сохранить</button>
          </div>
          <p class="form-message" data-feedback-message></p>
        </form>
      </article>
    `;
  }).join('') : '<div class="empty-state"><h3>Обращений пока нет</h3><p>Сообщения с формы контактов появятся здесь.</p></div>';
}

async function loadFeedback() {
  const adminKey = getAdminKey();
  if (!adminKey) {
    supportStats.innerHTML = '<article class="info-card"><h3>Доступ</h3><p>Нужен ключ</p></article>';
    feedbackList.innerHTML = '<div class="empty-state"><h3>Введите ключ</h3><p>После входа здесь появятся обращения покупателей.</p></div>';
    return;
  }

  supportStats.innerHTML = '<article class="info-card"><h3>Поддержка</h3><p>Загрузка</p></article>';
  feedbackList.innerHTML = '<div class="empty-state"><h3>Загружаем обращения</h3><p>Проверяем новые сообщения покупателей.</p></div>';

  try {
    const response = await fetch('/api/feedback', { headers: { 'x-admin-key': adminKey } });
    const data = await response.json().catch(() => []);
    if (!response.ok) throw new Error(data.error || 'Не удалось загрузить обращения');
    renderFeedback(Array.isArray(data) ? data : []);
  } catch (error) {
    feedbackList.innerHTML = `<div class="empty-state api-error-state"><h3>Не удалось загрузить обращения</h3><p>${escapeHtml(error.message)}</p></div>`;
  }
}

async function updateFeedbackStatus(form) {
  const feedbackId = form.dataset.feedbackId;
  const message = form.querySelector('[data-feedback-message]');
  const adminKey = getAdminKey();
  if (!adminKey) {
    message.innerHTML = '<span class="error-text">Сначала укажи ключ.</span>';
    return;
  }

  const formData = Object.fromEntries(new FormData(form).entries());
  message.innerHTML = '<span class="api-alert api-alert-loading">Сохраняем...</span>';
  try {
    const response = await fetch(`/api/feedback/${encodeURIComponent(feedbackId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify(formData),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || 'Не удалось сохранить обращение');
    message.innerHTML = '<span class="api-alert api-alert-success">Сохранено.</span>';
    await loadFeedback();
  } catch (error) {
    message.innerHTML = `<span class="error-text">${escapeHtml(error.message)}</span>`;
  }
}

adminKeyInput.value = localStorage.getItem(ADMIN_KEY_STORAGE) || '';

adminKeyForm.addEventListener('submit', (event) => {
  event.preventDefault();
  localStorage.setItem(ADMIN_KEY_STORAGE, getAdminKey());
  setAdminMessage('Ключ сохранён. Загружаем обращения.', 'api-alert api-alert-success');
  loadFeedback();
});

refreshSupport.addEventListener('click', loadFeedback);

document.addEventListener('submit', (event) => {
  const feedbackForm = event.target.closest('.feedback-status-form');
  if (!feedbackForm) return;
  event.preventDefault();
  updateFeedbackStatus(feedbackForm);
});

loadFeedback();
