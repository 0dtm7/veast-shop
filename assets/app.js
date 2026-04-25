const formatPrice = value => new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
const cartKey = 'veast_cart';
let productsCache = [];

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(cartKey)) || [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(cartKey, JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const count = getCart().reduce((sum, item) => sum + item.quantity, 0);
  document.querySelectorAll('[data-cart-count]').forEach(node => { node.textContent = count; });
}

async function loadProducts() {
  if (productsCache.length) return productsCache;
  const response = await fetch('/api/products');
  productsCache = await response.json();
  return productsCache;
}

function createProductCard(product) {
  return `
    <article class="product-card">
      <a href="/product.html?id=${product.id}" class="product-art" aria-label="Открыть ${product.name}">
        <div class="shape"></div>
      </a>
      <div class="product-info">
        <span class="badge">${product.badge}</span>
        <div class="product-title-row">
          <h3>${product.name}</h3>
          <span class="price">${formatPrice(product.price)}</span>
        </div>
        <p>${product.description}</p>
        <div class="card-actions">
          <a class="btn" href="/product.html?id=${product.id}">Подробнее</a>
          <button class="btn primary" data-add="${product.id}">В корзину</button>
        </div>
      </div>
    </article>`;
}

async function renderProducts(selector = '[data-products]', limit) {
  const node = document.querySelector(selector);
  if (!node) return;
  const products = await loadProducts();
  const visible = typeof limit === 'number' ? products.slice(0, limit) : products;
  node.innerHTML = visible.map(createProductCard).join('');
}

function addToCart(productId, size = 'M', quantity = 1) {
  const cart = getCart();
  const existing = cart.find(item => item.id === productId && item.size === size);
  if (existing) {
    existing.quantity = Math.min(existing.quantity + quantity, 20);
  } else {
    cart.push({ id: productId, size, quantity });
  }
  saveCart(cart);
}

function bindAddButtons() {
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-add]');
    if (!button) return;
    addToCart(button.dataset.add, button.dataset.size || 'M', 1);
    button.textContent = 'Добавлено';
    setTimeout(() => { button.textContent = button.dataset.label || 'В корзину'; }, 900);
  });
}

async function renderCatalog() {
  const catalog = document.querySelector('[data-catalog]');
  if (!catalog) return;
  const searchInput = document.querySelector('[data-search]');
  const categorySelect = document.querySelector('[data-category]');
  const products = await loadProducts();
  const categories = ['Все категории', ...new Set(products.map(product => product.category))];

  categorySelect.innerHTML = categories.map(category => `<option value="${category}">${category}</option>`).join('');

  function applyFilters() {
    const query = searchInput.value.trim().toLowerCase();
    const category = categorySelect.value;
    const filtered = products.filter(product => {
      const matchesQuery = [product.name, product.description, product.category].join(' ').toLowerCase().includes(query);
      const matchesCategory = category === 'Все категории' || product.category === category;
      return matchesQuery && matchesCategory;
    });
    catalog.innerHTML = filtered.length ? filtered.map(createProductCard).join('') : '<p class="muted">Товары не найдены.</p>';
  }

  searchInput.addEventListener('input', applyFilters);
  categorySelect.addEventListener('change', applyFilters);
  applyFilters();
}

async function renderProductPage() {
  const root = document.querySelector('[data-product-page]');
  if (!root) return;
  const params = new URLSearchParams(location.search);
  const id = params.get('id') || 'vst-eclipse-zip-hoodie';
  const products = await loadProducts();
  const product = products.find(item => item.id === id) || products[0];
  const initialSize = product.sizes[0] || 'OS';

  document.title = `${product.name} — VEAST`;
  root.innerHTML = `
    <div class="product-art"><div class="shape"></div></div>
    <section class="product-detail panel">
      <span class="badge">${product.category} / ${product.badge}</span>
      <h1><span class="chrome-text">${product.name}</span></h1>
      <p class="lead">${product.description}</p>
      <ul class="meta-list">
        <li><span>Цена</span><strong>${formatPrice(product.price)}</strong></li>
        <li><span>Цвет</span><strong>${product.color}</strong></li>
        <li><span>Артикул</span><strong>${product.id}</strong></li>
      </ul>
      <h3>Размер</h3>
      <div class="size-row" data-size-row>
        ${product.sizes.map((size, index) => `<button class="size-btn ${index === 0 ? 'active' : ''}" data-size="${size}">${size}</button>`).join('')}
      </div>
      <div class="actions">
        <button class="btn primary" data-product-add>Добавить в корзину</button>
        <a class="btn" href="/checkout.html">Перейти к оформлению</a>
      </div>
      <h3 style="margin-top: 26px;">Детали</h3>
      <ul class="meta-list">
        ${product.details.map(detail => `<li><span>${detail}</span><strong>VEAST</strong></li>`).join('')}
      </ul>
    </section>`;

  let selectedSize = initialSize;
  root.querySelectorAll('[data-size]').forEach(button => {
    button.addEventListener('click', () => {
      selectedSize = button.dataset.size;
      root.querySelectorAll('[data-size]').forEach(item => item.classList.remove('active'));
      button.classList.add('active');
    });
  });
  root.querySelector('[data-product-add]').addEventListener('click', event => {
    addToCart(product.id, selectedSize, 1);
    event.currentTarget.textContent = 'Добавлено';
    setTimeout(() => { event.currentTarget.textContent = 'Добавить в корзину'; }, 900);
  });
}

async function renderCheckout() {
  const cartNode = document.querySelector('[data-checkout-cart]');
  const form = document.querySelector('[data-checkout-form]');
  if (!cartNode || !form) return;
  const products = await loadProducts();
  const productById = new Map(products.map(product => [product.id, product]));

  function renderCart() {
    const cart = getCart();
    if (!cart.length) {
      cartNode.innerHTML = '<p class="muted">Корзина пуста. Добавьте товар из каталога.</p><a class="btn" href="/catalog.html">В каталог</a>';
      return;
    }

    const rows = cart.map((item, index) => {
      const product = productById.get(item.id);
      if (!product) return '';
      return `<div class="cart-item">
        <div>
          <strong>${product.name}</strong>
          <div class="muted">Размер: ${item.size} · ${formatPrice(product.price)}</div>
          <div class="qty-controls" style="margin-top: 10px;">
            <button class="btn" data-qty="${index}" data-delta="-1">−</button>
            <span>${item.quantity}</span>
            <button class="btn" data-qty="${index}" data-delta="1">+</button>
            <button class="btn danger" data-remove="${index}">Удалить</button>
          </div>
        </div>
        <strong>${formatPrice(product.price * item.quantity)}</strong>
      </div>`;
    }).join('');

    const total = cart.reduce((sum, item) => {
      const product = productById.get(item.id);
      return sum + (product ? product.price * item.quantity : 0);
    }, 0);

    cartNode.innerHTML = `${rows}<div class="total-row"><span>Итого</span><span>${formatPrice(total)}</span></div>`;
  }

  cartNode.addEventListener('click', event => {
    const cart = getCart();
    const qtyButton = event.target.closest('[data-qty]');
    const removeButton = event.target.closest('[data-remove]');

    if (qtyButton) {
      const index = Number(qtyButton.dataset.qty);
      const delta = Number(qtyButton.dataset.delta);
      cart[index].quantity += delta;
      if (cart[index].quantity < 1) cart.splice(index, 1);
      saveCart(cart);
      renderCart();
    }

    if (removeButton) {
      cart.splice(Number(removeButton.dataset.remove), 1);
      saveCart(cart);
      renderCart();
    }
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const status = document.querySelector('[data-order-status]');
    const formData = new FormData(form);
    const payload = {
      customer: Object.fromEntries(formData.entries()),
      items: getCart()
    };

    status.className = 'status';
    status.textContent = 'Отправляем заказ...';

    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();

    if (!response.ok) {
      status.className = 'status error';
      status.textContent = (result.errors || ['Не удалось оформить заказ.']).join(' ');
      return;
    }

    localStorage.removeItem(cartKey);
    updateCartCount();
    location.href = `/confirmation.html?order=${encodeURIComponent(result.order.id)}`;
  });

  renderCart();
}

async function renderAdminOrders() {
  const node = document.querySelector('[data-admin-orders]');
  if (!node) return;
  const response = await fetch('/api/orders');
  const orders = await response.json();
  if (!orders.length) {
    node.innerHTML = '<p class="muted">Пока заказов нет. data/orders.json содержит пустой массив.</p>';
    return;
  }
  node.innerHTML = orders.slice().reverse().map(order => `
    <article class="admin-order">
      <div>
        <strong>${order.id}</strong>
        <div class="muted">${new Date(order.createdAt).toLocaleString('ru-RU')} · ${order.customer.name} · ${order.customer.email}</div>
        <div class="muted">${order.items.map(item => `${item.name} × ${item.quantity}`).join(', ')}</div>
      </div>
      <strong>${formatPrice(order.total)}</strong>
    </article>`).join('');
}

function renderConfirmation() {
  const node = document.querySelector('[data-confirmation]');
  if (!node) return;
  const order = new URLSearchParams(location.search).get('order');
  node.innerHTML = order
    ? `<p class="lead">Заказ <strong>${order}</strong> успешно оформлен. Backend VEAST проверил данные и сохранил заказ в <code>data/orders.json</code>.</p>`
    : '<p class="lead">Заказ успешно оформлен.</p>';
}

async function boot() {
  updateCartCount();
  bindAddButtons();
  await renderProducts('[data-products]', document.querySelector('[data-products]')?.dataset.limit ? Number(document.querySelector('[data-products]').dataset.limit) : undefined);
  await renderCatalog();
  await renderProductPage();
  await renderCheckout();
  await renderAdminOrders();
  renderConfirmation();
}

boot().catch(error => {
  console.error(error);
});
