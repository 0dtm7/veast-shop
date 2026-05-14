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
const deliverySelect = document.getElementById('delivery');
const cityInput = document.getElementById('city');
const addressInput = document.getElementById('address');
const pickupField = document.getElementById('pickupField');
const pickupPayloadInput = document.getElementById('pickupPointPayload');
const pickupTitle = document.getElementById('pickupPointTitle');
const pickupText = document.getElementById('pickupPointText');
const pickupCard = document.getElementById('pickupSelectCard');
const cdekButton = document.getElementById('openCdekWidget');
const cdekMessage = document.getElementById('cdekWidgetMessage');
const fields = ['name', 'phone', 'email', 'city', 'address'];
const t = (ru, en) => (isEnglish() ? en : ru);

let selectedPickupPoint = null;
let cdekWidget = null;
let cdekConfig = null;
let cdekConfigLoading = false;

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
    <div class="total-row"><span>${t('Доставка', 'Shipping')}</span><strong>${t('ПВЗ по России', 'Pickup point')}</strong></div>
    <div class="total-row"><span>${t('Оплата', 'Payment')}</span><strong>${t('после подтверждения', 'after confirmation')}</strong></div>
    <div class="total-row total-strong"><span>${t('Итого', 'Total')}</span><strong>${formatPrice(total)}</strong></div>
    <div class="mini-service-list">
      <span>${t('✓ Возврат 14 дней', '✓ 14-day returns')}</span>
      <span>${t('✓ Выбор пункта СДЭК на карте', '✓ CDEK pickup map')}</span>
      <span>${t('✓ Статус заказа в Telegram', '✓ Telegram order status')}</span>
    </div>
    <p class="muted">${t('Выберите пункт выдачи на карте, затем оформите заказ. Выбранный ПВЗ сохранится в backend API и будет виден в админке.', 'Choose a pickup point on the map, then place the order. The selected point will be saved in the backend API and visible in admin.')}</p>
  `;
}

function isCdekDelivery() {
  return deliverySelect?.value === 'СДЭК';
}

function normalizePickupPoint(type, tariff, point) {
  if (!point || typeof point !== 'object') return null;
  const location = point.location || {};
  const address = point.address || location.address || [location.city, location.address_full].filter(Boolean).join(', ');
  const city = location.city || point.city || '';
  const title = point.name || point.code || 'Пункт выдачи СДЭК';

  return {
    provider: 'cdek',
    providerTitle: 'СДЭК',
    type: type || 'office',
    tariffCode: tariff?.tariff_code || tariff?.tariffCode || tariff?.code || null,
    tariffName: tariff?.tariff_name || tariff?.tariffName || tariff?.name || '',
    code: point.code || point.uuid || '',
    name: title,
    address,
    city,
    region: location.region || '',
    postalCode: location.postal_code || '',
    latitude: Number(location.latitude || point.latitude || 0) || null,
    longitude: Number(location.longitude || point.longitude || 0) || null,
    workTime: point.work_time || point.workTime || '',
    phones: Array.isArray(point.phones) ? point.phones.map((phone) => phone.number || phone).filter(Boolean) : [],
  };
}

function setPickupPoint(point) {
  selectedPickupPoint = point;
  pickupPayloadInput.value = point ? JSON.stringify(point) : '';

  if (!point) {
    pickupTitle.textContent = t('Пункт выдачи не выбран', 'Pickup point not selected');
    pickupText.textContent = t('Выберите пункт СДЭК на карте, чтобы не вводить адрес вручную.', 'Choose a CDEK pickup point on the map.');
    pickupCard?.classList.remove('pickup-select-card-active');
    return;
  }

  pickupTitle.textContent = `${point.providerTitle} · ${point.code || point.name}`;
  pickupText.textContent = [point.city, point.address, point.workTime ? `График: ${point.workTime}` : ''].filter(Boolean).join(' · ');
  pickupCard?.classList.add('pickup-select-card-active');
  if (point.city) cityInput.value = point.city;
  if (point.address) addressInput.value = point.address;
}

function setCdekMessage(text, type = '') {
  cdekMessage.textContent = text;
  cdekMessage.className = type || '';
}

function syncDeliveryUi() {
  const cdek = isCdekDelivery();
  pickupField.hidden = !cdek;
  if (cdek) {
    addressInput.readOnly = true;
    addressInput.placeholder = t('Выберите пункт выдачи на карте', 'Choose a pickup point on the map');
    if (!selectedPickupPoint) setPickupPoint(null);
  } else {
    addressInput.readOnly = false;
    addressInput.placeholder = deliverySelect.value === 'Почта России'
      ? t('Укажите отделение Почты России или адрес доставки', 'Enter a post office or delivery address')
      : t('Укажите адрес или комментарий по самовывозу', 'Enter an address or pickup note');
    setPickupPoint(null);
  }
}

async function loadCdekConfig() {
  if (cdekConfig || cdekConfigLoading) return cdekConfig;
  cdekConfigLoading = true;
  setCdekMessage(t('Загружаем настройки СДЭК...', 'Loading CDEK settings...'), 'api-alert-loading');
  try {
    const response = await fetch('/api/cdek/config');
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || `HTTP ${response.status}`);
    cdekConfig = data;
    if (!data.enabled) {
      const missing = Array.isArray(data.missing) && data.missing.length ? ` Не хватает: ${data.missing.join(', ')}.` : '';
      throw new Error(`Виджет СДЭК не настроен в Render.${missing}`);
    }
    setCdekMessage(t('СДЭК готов: выберите пункт на карте.', 'CDEK is ready: choose a point on the map.'), 'api-alert-success');
    return cdekConfig;
  } finally {
    cdekConfigLoading = false;
  }
}

function buildCdekGoods() {
  const cart = getCart();
  const count = Math.max(1, cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0));
  return [{ width: 30, height: 10, length: 35, weight: Math.max(1, count) }];
}

async function openCdekWidget() {
  deliverySelect.value = 'СДЭК';
  syncDeliveryUi();

  try {
    const config = await loadCdekConfig();
    if (!window.CDEKWidget) throw new Error('Скрипт виджета СДЭК не загрузился. Обновите страницу и попробуйте снова.');

    if (!cdekWidget) {
      cdekWidget = new window.CDEKWidget({
        from: config.from || 'Москва',
        root: 'cdek-widget-root',
        apiKey: config.yandexMapsApiKey,
        canChoose: true,
        servicePath: config.servicePath || '/api/cdek/service',
        hideFilters: {
          have_cashless: false,
          have_cash: false,
          is_dressing_room: false,
          type: false,
        },
        hideDeliveryOptions: {
          office: false,
          door: true,
        },
        popup: true,
        debug: false,
        goods: buildCdekGoods(),
        defaultLocation: cityInput.value.trim() || config.defaultLocationCoords || config.defaultLocation || [37.6173, 55.7558],
        lang: 'rus',
        currency: 'RUB',
        tariffs: {
          office: [234, 136, 138],
          door: [233, 137, 139],
        },
        onChoose(type, tariff, point) {
          const normalized = normalizePickupPoint(type, tariff, point);
          if (normalized) {
            setPickupPoint(normalized);
            setCdekMessage(t('Пункт СДЭК выбран. Можно отправлять заказ.', 'CDEK pickup point selected.'), 'api-alert-success');
          }
        },
      });
    }

    cdekWidget.open();
  } catch (error) {
    setCdekMessage(error.message, 'error-text');
  }
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
  if (isCdekDelivery() && !selectedPickupPoint) errors.address = t('Выберите пункт СДЭК на карте.', 'Choose a CDEK pickup point on the map.');
  else if (address.length < 6) errors.address = t('Укажите адрес или пункт выдачи.', 'Enter the address or pickup point.');
  if (!form.privacy.checked) errors.privacy = t('Нужно согласиться с пользовательским соглашением и политикой конфиденциальности.', 'You need to accept the terms and privacy policy.');

  return errors;
}

function clearErrors() {
  form.querySelectorAll('.field-error').forEach((node) => node.remove());
  form.querySelectorAll('.invalid').forEach((node) => node.classList.remove('invalid'));
  form.privacy.closest('.policy-check')?.classList.remove('invalid');
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

deliverySelect.addEventListener('change', syncDeliveryUi);
cdekButton.addEventListener('click', openCdekWidget);

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

  const deliveryPoint = isCdekDelivery() ? selectedPickupPoint : null;
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
    deliveryPoint,
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

syncDeliveryUi();
renderSummary();
