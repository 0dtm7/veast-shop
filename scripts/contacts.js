import { initCommon } from '../app.js';

initCommon('contacts');

const form = document.getElementById('feedbackForm');
const message = document.getElementById('feedbackMessage');

function setMessage(text, type = '') {
  message.textContent = text;
  message.className = `form-message ${type}`.trim();
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  const payload = {
    id: `FB-${Date.now()}`,
    createdAt: new Date().toISOString(),
    name: String(data.name || '').trim(),
    contact: String(data.contact || '').trim(),
    orderId: String(data.orderId || '').trim(),
    topic: String(data.topic || 'other').trim(),
    message: String(data.message || '').trim(),
  };

  setMessage('Отправляем сообщение...', 'api-alert-loading');

  try {
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.error || 'Не удалось отправить сообщение');
    form.reset();
    setMessage('Сообщение отправлено. Мы ответим через указанный контакт.', 'api-alert-success');
  } catch (error) {
    setMessage(error.message || 'Не удалось отправить сообщение. Напишите нам в Telegram: @veast_support.', 'error-text');
  }
});
