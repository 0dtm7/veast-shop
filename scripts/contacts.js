import { initCommon } from '../app.js';
initCommon('contacts');
const form = document.getElementById('feedbackForm');
const message = document.getElementById('feedbackMessage');
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  const payload = { id: `FB-${Date.now()}`, createdAt: new Date().toISOString(), ...data };
  try {
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Не удалось отправить сообщение');
    message.textContent = 'Сообщение отправлено. Мы ответим в ближайшее время.';
  } catch {
    const local = JSON.parse(localStorage.getItem('veast_feedback_v1') || '[]');
    local.push(payload);
    localStorage.setItem('veast_feedback_v1', JSON.stringify(local));
    message.textContent = 'Не удалось отправить сообщение. Попробуйте позже или напишите нам в Telegram.';
  }
  form.reset();
});
