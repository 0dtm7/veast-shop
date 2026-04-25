import {
  buildCartItems,
  calculateCart,
  clearCart,
  escapeHtml,
  formatPrice,
  getCart,
  getProductById,
  initCommon,
  saveLastOrder,
  saveLocalOrders,
  getLocalOrders,
} from '../app.js';

initCommon('');

const summary = document.getElementById('checkoutSummary');
const form = document.getElementById('checkoutForm');
const message = document.getElementById('formMessage');
const submitButton = form.querySelector('button[type="submit"]');
const fields = ['name', 'phone', 'email', 'city', 'address'];

function renderSummary() {
  const cart = getCart();
  if (!cart.length) {
    summary.innerHTML = `
      <h3>Заказ</h3>
      <p class="muted">Корзина пустая. Основной сценарий покупки начинается с выбора товара.</p>
      <a class="button button-primary full" href="catalog.html">В каталог</a>
    `;
    submitButton.disabled = true;
    return;
  }

  submitButton.disabled = false;
  const total = calculateCart(cart);
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  summary.innerHTML = `
    <h3>Состав заказа</h3>
    <div class="checkout-steps">
      <span class="done">1. Товар выбран</span>
      <span class="done">2. Корзина собрана</span>
      <span>3. Данные покупателя</span>
      <span>4. Подтверждение</span>
    </div>
    ${cart.map((item) => {
      const product = getProductById(item.productId);
      return product ? `
        <div class="checkout-item">
          <img src="${product.cardImage || product.image}" alt="${escapeHtml(product.title)}" />
          <div>
            <strong>${escapeHtml(product.title)}</strong>
            <p class="muted">Размер ${escapeHtml(item.size)} · ${item.quantity} шт.</p>
            <p>${formatPrice(product.price * item.quantity)}</p>
          </div>
        </div>
      ` : '';
    }).join('')}
    <div class="total-row"><span>Позиций</span><strong>${count}</strong></div>
    <div class="total-row"><span>Товары</span><strong>${formatPrice(total)}</strong></div>
    <div class="total-row"><span>Доставка</span><strong>2–5 дней</strong></div>
    <div class="total-row"><span>Оплата</span><strong>после подтверждения</strong></div>
    <div class="total-row total-strong"><span>Итого</span><strong>${formatPrice(total)}</strong></div>
    <div class="mini-service-list">
      <span>✓ Возврат 14 дней</span>
      <span>✓ Проверка заказа менеджером</span>
      <span>✓ Заказ проходит серверную проверку</span>
    </div>
    <p class="muted">При успешной отправке заказ появится в личном кабинете и в файле data/orders.json при запуске через Node.js.</p>
  `;
}

function validateForm(formData) {
  const errors = {};
  const name = String(formData.name || '').trim();
  const phone = String(formData.phone || '').trim();
  const email = String(formData.email || '').trim();
  const city = String(formData.city || '').trim();
  const address = String(formData.address || '').trim();

  if (name.length < 2) errors.name = 'Введите имя минимум из 2 символов.';
  if (phone.length < 5) errors.phone = 'Укажите телефон или Telegram для связи.';
  if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Введите корректный email.';
  if (city.length < 2) errors.city = 'Укажите город доставки.';
  if (address.length < 6) errors.address = 'Укажите адрес или пункт выдачи.';
  if (!form.privacy.checked) errors.privacy = 'Нужно согласиться с пользовательским соглашением и политикой конфиденциальности.';

  return errors;
}

function clearErrors() {
  form.querySelectorAll('.field-error').forEach((node) => node.remove());
  form.querySelectorAll('.invalid').forEach((node) => node.classList.remove('invalid'));
}

function showErrors(errors) {
  clearErrors();
  fields.forEach((name) => {
    if (!errors[name]) return;
    const input = form.elements[name];
    input.classList.add('invalid');
    const error = document.createElement('small');
    error.className = 'field-error';
    error.textContent = errors[name];
    input.closest('.field').append(error);
  });
  if (errors.privacy) form.privacy.closest('.policy-check').classList.add('invalid');
  const list = Object.values(errors).map(escapeHtml).join('<br>');
  message.innerHTML = `<span class="error-text">${list}</span>`;
}

function saveOrderLocally(order) {
  const localOrders = getLocalOrders();
  if (!localOrders.some((entry) => entry.id === order.id)) {
    localOrders.push(order);
    saveLocalOrders(localOrders);
  }
}

form.addEventListener('input', () => {
  clearErrors();
  message.textContent = '';
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const cart = getCart();
  if (!cart.length) return;

  const formData = Object.fromEntries(new FormData(form).entries());
  const errors = validateForm(formData);
  if (Object.keys(errors).length) {
    showErrors(errors);
    return;
  }

  const order = {
    id: `VST-${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: 'Новая заявка',
    customer: {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      city: formData.city.trim(),
      address: formData.address.trim(),
      delivery: formData.delivery,
      payment: formData.payment,
      comment: formData.comment?.trim() || '',
      privacyAccepted: Boolean(form.privacy.checked),
    },
    items: buildCartItems(cart),
    total: calculateCart(cart),
  };

  submitButton.disabled = true;
  submitButton.textContent = 'Отправляем заказ...';
  message.innerHTML = '<span class="api-alert api-alert-loading">Проверяем данные и создаём заказ...</span>';

  let savedOrder = { ...order, savedVia: 'localStorage fallback' };
  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const status = response.status ? `HTTP ${response.status}` : 'HTTP error';
      throw new Error(`${status}: ${data.error || 'сервер не принял заказ'}`);
    }
    savedOrder = { ...data.order, savedVia: 'сервер' };
    message.innerHTML = '<span class="api-alert api-alert-success">Backend подтвердил заказ. Данные сохранены в data/orders.json.</span>';
  } catch (error) {
    const readableError = error instanceof TypeError
      ? 'Сервер не отвечает. Запусти проект командой npm start и попробуй снова.'
      : error.message;
    savedOrder = { ...order, savedVia: 'localStorage fallback', apiError: readableError };
    message.innerHTML = `<span class="api-alert api-alert-warning">${escapeHtml(readableError)} Заказ сохранён локально, чтобы пользовательский сценарий не оборвался.</span>`;
  }

  saveOrderLocally(savedOrder);
  saveLastOrder(savedOrder);
  clearCart();
  setTimeout(() => { location.href = `thanks.html?order=${encodeURIComponent(savedOrder.id)}`; }, 850);
});

renderSummary();
