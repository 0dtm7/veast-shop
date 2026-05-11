import {
  buildCartItems,
  calculateCart,
  clearCart,
  escapeHtml,
  formatPrice,
  getCart,
  getProductById,
  initCommon,
  isEnglish,
  localizeProduct,
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
const t = (ru, en) => (isEnglish() ? en : ru);

function renderSummary() {
  const cart = getCart();
  if (!cart.length) {
    summary.innerHTML = `
      <h3>${t('Заказ', 'Order')}</h3>
      <p class="muted">${t('Корзина пустая. Основной сценарий покупки начинается с выбора товара.', 'Your cart is empty. The main shopping flow starts with selecting a product.')}</p>
      <a class="button button-primary full" href="catalog.html">${t('В каталог', 'Go to catalog')}</a>
    `;
    submitButton.disabled = true;
    return;
  }

  submitButton.disabled = false;
  const total = calculateCart(cart);
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  summary.innerHTML = `
    <h3>${t('Состав заказа', 'Order summary')}</h3>
    <div class="checkout-steps">
      <span class="done">${t('1. Товар выбран', '1. Product selected')}</span>
      <span class="done">${t('2. Корзина собрана', '2. Cart ready')}</span>
      <span>${t('3. Данные покупателя', '3. Customer details')}</span>
      <span>${t('4. Подтверждение', '4. Confirmation')}</span>
    </div>
    ${cart.map((item) => {
      const rawProduct = getProductById(item.productId);
      const product = rawProduct ? localizeProduct(rawProduct) : null;
      return product ? `
        <div class="checkout-item">
          <img src="${product.cardImage || product.image}" alt="${escapeHtml(product.title)}" />
          <div>
            <strong>${escapeHtml(product.title)}</strong>
            <p class="muted">${t('Размер', 'Size')} ${escapeHtml(item.size)} · ${item.quantity} ${t('шт.', 'pc.')}</p>
            <p>${formatPrice(product.price * item.quantity)}</p>
          </div>
        </div>
      ` : '';
    }).join('')}
    <div class="total-row"><span>${t('Позиций', 'Items')}</span><strong>${count}</strong></div>
    <div class="total-row"><span>${t('Товары', 'Products')}</span><strong>${formatPrice(total)}</strong></div>
    <div class="total-row"><span>${t('Доставка', 'Shipping')}</span><strong>${t('2–5 дней', '2–5 days')}</strong></div>
    <div class="total-row"><span>${t('Оплата', 'Payment')}</span><strong>${t('после подтверждения', 'after confirmation')}</strong></div>
    <div class="total-row total-strong"><span>${t('Итого', 'Total')}</span><strong>${formatPrice(total)}</strong></div>
    <div class="mini-service-list">
      <span>${t('✓ Возврат 14 дней', '✓ 14-day returns')}</span>
      <span>${t('✓ Проверка заказа менеджером', '✓ Order review by manager')}</span>
      <span>${t('✓ Заказ сохраняется в backend API', '✓ Order saved in backend API')}</span>
    </div>
    <p class="muted">${t('При успешной отправке заказ появится в личном кабинете и в файле data/orders.json при запуске через Node.js.', 'After a successful submission, the order appears in the account page and in data/orders.json when the project runs via Node.js.')}</p>
  `;
}

function validateForm(formData) {
  const errors = {};
  const name = String(formData.name || '').trim();
  const phone = String(formData.phone || '').trim();
  const email = String(formData.email || '').trim();
  const city = String(formData.city || '').trim();
  const address = String(formData.address || '').trim();

  if (name.length < 2) errors.name = t('Введите имя минимум из 2 символов.', 'Enter a name with at least 2 characters.');
  if (phone.length < 5) errors.phone = t('Укажите телефон или Telegram для связи.', 'Enter a phone number or Telegram handle.');
  if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = t('Введите корректный email.', 'Enter a valid email address.');
  if (city.length < 2) errors.city = t('Укажите город доставки.', 'Enter the delivery city.');
  if (address.length < 6) errors.address = t('Укажите адрес или пункт выдачи.', 'Enter the address or pickup point.');
  if (!form.privacy.checked) errors.privacy = t('Нужно согласиться с пользовательским соглашением и политикой конфиденциальности.', 'You need to accept the terms and privacy policy.');

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
    status: t('Новая заявка', 'New order'),
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
  submitButton.textContent = t('Отправляем заказ...', 'Submitting order...');
  message.innerHTML = `<span class="api-alert api-alert-loading">${t('Создаём заказ через backend API: POST /api/orders...', 'Creating order via backend API: POST /api/orders...')}</span>`;

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
      throw new Error(`${status}: ${data.error || t('сервер не принял заказ', 'server rejected the order')}`);
    }
    savedOrder = { ...data.order, savedVia: 'backend API' };
    message.innerHTML = `<span class="api-alert api-alert-success">${t('Backend подтвердил заказ. Данные сохранены в data/orders.json.', 'Backend confirmed the order. Data was saved to data/orders.json.')}</span>`;
  } catch (error) {
    const readableError = error instanceof TypeError
      ? t('Сервер не отвечает. Для полной backend-демонстрации запусти pnpm dev.', 'The server is not responding. Run pnpm dev for the full backend demo.')
      : error.message;
    savedOrder = { ...order, savedVia: 'localStorage fallback', apiError: readableError };
    message.innerHTML = `<span class="api-alert api-alert-warning">${escapeHtml(readableError)} ${t('Заказ сохранён локально, чтобы пользовательский сценарий не оборвался.', 'The order was saved locally so the shopping flow is not interrupted.')}</span>`;
  }

  saveOrderLocally(savedOrder);
  saveLastOrder(savedOrder);
  clearCart();
  setTimeout(() => { location.href = `thanks.html?order=${encodeURIComponent(savedOrder.id)}`; }, 850);
});

renderSummary();
