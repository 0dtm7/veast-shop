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
      <h3>Order</h3>
      <p class="muted">Your cart is empty. The main shopping flow starts with selecting a product.</p>
      <a class="button button-primary full" href="catalog.html">Go to catalog</a>
    `;
    submitButton.disabled = true;
    return;
  }

  submitButton.disabled = false;
  const total = calculateCart(cart);
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  summary.innerHTML = `
    <h3>Order summary</h3>
    <div class="checkout-steps">
      <span class="done">1. Product selected</span>
      <span class="done">2. Cart ready</span>
      <span>3. Customer details</span>
      <span>4. Confirmation</span>
    </div>
    ${cart.map((item) => {
      const product = getProductById(item.productId);
      return product ? `
        <div class="checkout-item">
          <img src="${product.cardImage || product.image}" alt="${escapeHtml(product.title)}" />
          <div>
            <strong>${escapeHtml(product.title)}</strong>
            <p class="muted">Size ${escapeHtml(item.size)} · ${item.quantity} pc.</p>
            <p>${formatPrice(product.price * item.quantity)}</p>
          </div>
        </div>
      ` : '';
    }).join('')}
    <div class="total-row"><span>Items</span><strong>${count}</strong></div>
    <div class="total-row"><span>Products</span><strong>${formatPrice(total)}</strong></div>
    <div class="total-row"><span>Shipping</span><strong>2–5 days</strong></div>
    <div class="total-row"><span>Payment</span><strong>after confirmation</strong></div>
    <div class="total-row total-strong"><span>Total</span><strong>${formatPrice(total)}</strong></div>
    <div class="mini-service-list">
      <span>✓ 14-day returns</span>
      <span>✓ Order review by manager</span>
      <span>✓ Order saved in backend API</span>
    </div>
    <p class="muted">After a successful submission, the order appears in the account page and in data/orders.json when the project runs via Node.js.</p>
  `;
}

function validateForm(formData) {
  const errors = {};
  const name = String(formData.name || '').trim();
  const phone = String(formData.phone || '').trim();
  const email = String(formData.email || '').trim();
  const city = String(formData.city || '').trim();
  const address = String(formData.address || '').trim();

  if (name.length < 2) errors.name = 'Enter a name with at least 2 characters.';
  if (phone.length < 5) errors.phone = 'Enter a phone number or Telegram handle.';
  if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Enter a valid email address.';
  if (city.length < 2) errors.city = 'Enter the delivery city.';
  if (address.length < 6) errors.address = 'Enter the address or pickup point.';
  if (!form.privacy.checked) errors.privacy = 'You need to accept the terms and privacy policy.';

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
    status: 'New order',
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
  submitButton.textContent = 'Submitting order...';
  message.innerHTML = '<span class="api-alert api-alert-loading">Creating order via backend API: POST /api/orders...</span>';

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
      throw new Error(`${status}: ${data.error || 'server rejected the order'}`);
    }
    savedOrder = { ...data.order, savedVia: 'backend API' };
    message.innerHTML = '<span class="api-alert api-alert-success">Backend confirmed the order. Data was saved to data/orders.json.</span>';
  } catch (error) {
    const readableError = error instanceof TypeError
      ? 'The server is not responding. Run pnpm dev for the full backend demo.'
      : error.message;
    savedOrder = { ...order, savedVia: 'localStorage fallback', apiError: readableError };
    message.innerHTML = `<span class="api-alert api-alert-warning">${escapeHtml(readableError)} The order was saved locally so the shopping flow is not interrupted.</span>`;
  }

  saveOrderLocally(savedOrder);
  saveLastOrder(savedOrder);
  clearCart();
  setTimeout(() => { location.href = `thanks.html?order=${encodeURIComponent(savedOrder.id)}`; }, 850);
});

renderSummary();
