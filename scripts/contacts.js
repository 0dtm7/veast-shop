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
    if (!response.ok) throw new Error('API недоступен');
    message.textContent = 'Сообщение отправлено. Мы свяжемся с вами по указанному email.';
  } catch {
    const local = JSON.parse(localStorage.getItem('veast_feedback_v1') || '[]');
    local.push(payload);
    localStorage.setItem('veast_feedback_v1', JSON.stringify(local));
    message.textContent = 'Сообщение сохранено локально. Backend будет работать при запуске через Node.js.';
  }
  form.reset();
});
