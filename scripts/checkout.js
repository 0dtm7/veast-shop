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
const cdekModal = document.getElementById('cdek-map-modal');
const cdekCloseButton = document.getElementById('closeCdekMap');
const cdekCitySearch = document.getElementById('cdekCitySearch');
const cdekLoadButton = document.getElementById('loadCdekPoints');
const cdekMapCanvas = document.getElementById('cdekMapCanvas');
const cdekMapStatus = document.getElementById('cdekMapStatus');
const cdekPointsList = document.getElementById('cdekPointsList');
const fields = ['name', 'phone', 'email', 'city', 'address'];
const t = (ru, en) => (isEnglish() ? en : ru);
const CDEK_MAX_VISIBLE_POINTS = 250;

let selectedPickupPoint = null;
let cdekConfig = null;
let cdekConfigLoading = false;
let cdekMap = null;
let cdekMarkersLayer = null;
let cdekPoints = [];
let activePointCode = '';

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
    <p class="muted">${t('Выберите пункт выдачи на карте, затем оформите заказ. Выбранный ПВЗ сохранится в базе и будет виден в админке.', 'Choose a pickup point on the map, then place the order. The selected point will be saved in the database and visible in admin.')}</p>
  `;
}

function isCdekDelivery() {
  return deliverySelect?.value === 'СДЭК';
}

function normalizePickupPoint(type, tariff, point) {
  if (!point || typeof point !== 'object') return null;
  const location = point.location || {};
  const address = point.address || location.address || location.address_full || [location.city, location.address_full].filter(Boolean).join(', ');
  const city = location.city || point.city || '';
  const title = point.name || point.code || 'Пункт выдачи СДЭК';

  return {
    provider: 'cdek',
    providerTitle: 'СДЭК',
    type: type || point.type || 'PVZ',
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

function setCdekMapStatus(text, type = '') {
  cdekMapStatus.textContent = text;
  cdekMapStatus.className = `pickup-map-status ${type}`.trim();
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
      throw new Error(`СДЭК не настроен в Render.${missing}`);
    }

    if (data.environment === 'test') {
      setCdekMessage(
        t(
          'СДЭК подключён в тестовой среде. Для актуальных ПВЗ по России нужны боевые ключи и CDEK_API_BASE_URL=https://api.cdek.ru/v2.',
          'CDEK is connected in test mode. Use production credentials and CDEK_API_BASE_URL=https://api.cdek.ru/v2 for current pickup points.'
        ),
        'api-alert-warning'
      );
    } else {
      setCdekMessage(t('СДЭК готов: актуальные ПВЗ загружаются через рабочий API.', 'CDEK is ready: current pickup points load through the production API.'), 'api-alert-success');
    }
    return cdekConfig;
  } finally {
    cdekConfigLoading = false;
  }
}

function openCdekMapModal() {
  cdekModal?.classList.add('is-open');
  cdekModal?.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  cdekCitySearch.value = cityInput.value.trim() || cdekConfig?.defaultLocation || 'Москва';
  setTimeout(() => {
    initCdekMap();
    cdekMap?.invalidateSize();
    if (cdekConfig?.environment === 'test') {
      setCdekMapStatus('Включена тестовая среда СДЭК: список ПВЗ может отличаться от реального. Для актуальных пунктов поставьте рабочие ключи СДЭК.', 'api-alert-warning');
    }
  }, 120);
}

function closeCdekMapModal() {
  cdekModal?.classList.remove('is-open');
  cdekModal?.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

function initCdekMap() {
  if (!window.L) {
    setCdekMapStatus('Карта не загрузилась. Проверьте подключение Leaflet CDN или используйте список пунктов справа.', 'error-text');
    return;
  }
  if (cdekMap) return;
  cdekMap = window.L.map(cdekMapCanvas, { zoomControl: true }).setView([55.7558, 37.6173], 10);
  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap',
  }).addTo(cdekMap);
  cdekMarkersLayer = window.L.layerGroup().addTo(cdekMap);
}

function cdekServiceUrl(action, params = {}) {
  const url = new URL('/api/cdek/service', window.location.origin);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });
  return url;
}

function normalizeCdekText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim();
}

async function loadCdekCityCode(cityName) {
  const normalizedQuery = normalizeCdekText(cityName);
  const response = await fetch(cdekServiceUrl('cities', { name: cityName, country_code: 'RU' }));
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || `СДЭК не нашёл город: HTTP ${response.status}`);
  const cities = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : [data].filter(Boolean));
  const exact = cities.find((city) => {
    const cityTitle = normalizeCdekText(city.city || city.full_name || city.name || '');
    return cityTitle === normalizedQuery || cityTitle.startsWith(`${normalizedQuery},`) || cityTitle.includes(` ${normalizedQuery},`);
  });
  const city = exact || cities[0];
  if (!city || !city.code) throw new Error('СДЭК не нашёл такой город. Попробуйте ввести город полностью, например: Москва, Казань, Екатеринбург.');
  return city;
}

async function loadCdekOffices() {
  const cityName = (cdekCitySearch.value || cityInput.value || cdekConfig?.defaultLocation || 'Москва').trim();
  if (!cityName) return;

  cdekLoadButton.disabled = true;
  cdekLoadButton.textContent = 'Ищем...';
  cdekPointsList.innerHTML = '';
  activePointCode = '';
  setCdekMapStatus(`Загружаем актуальные ПВЗ СДЭК: ${cityName}...`, 'api-alert-loading');

  try {
    await loadCdekConfig();
    const city = await loadCdekCityCode(cityName);
    const response = await fetch(cdekServiceUrl('offices', {
      city_code: city.code,
      country_code: 'RU',
      type: 'ALL',
      is_handout: 'true',
      size: '1000',
      max_pages: '10',
      lang: 'rus',
    }));
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || data.error || `Не удалось загрузить ПВЗ: HTTP ${response.status}`);

    const rawPoints = Array.isArray(data) ? data : (Array.isArray(data.offices) ? data.offices : []);
    const unique = new Map();
    rawPoints.forEach((point) => {
      const location = point.location || {};
      const code = String(point.code || point.uuid || '').trim();
      if (!code || unique.has(code)) return;
      if (!Number(location.latitude) || !Number(location.longitude)) return;
      if (point.is_handout === false) return;
      unique.set(code, point);
    });

    cdekPoints = Array.from(unique.values()).sort((a, b) => {
      const addressA = String(a.location?.address || a.name || a.code || '');
      const addressB = String(b.location?.address || b.name || b.code || '');
      return addressA.localeCompare(addressB, 'ru');
    });

    if (!cdekPoints.length) {
      const suffix = cdekConfig?.environment === 'test'
        ? ' В тестовой среде СДЭК список ПВЗ может быть неполным или неактуальным.'
        : '';
      setCdekMapStatus(`В этом городе СДЭК не вернул пункты выдачи.${suffix}`, 'api-alert-warning');
      renderCdekPointList([]);
      return;
    }

    if (city.city || city.full_name) cityInput.value = city.city || city.full_name;
    renderCdekMarkers();
    renderCdekPointList(cdekPoints);

    const environmentNote = cdekConfig?.environment === 'test'
      ? ' Сейчас используется тестовая среда — для полностью актуальных ПВЗ нужны боевые ключи СДЭК.'
      : ' Данные загружены из рабочего API СДЭК.';
    setCdekMapStatus(`Найдено пунктов: ${cdekPoints.length}. Выберите ПВЗ на карте или в списке.${environmentNote}`, cdekConfig?.environment === 'test' ? 'api-alert-warning' : 'api-alert-success');
  } catch (error) {
    setCdekMapStatus(error.message || 'Не удалось загрузить ПВЗ СДЭК.', 'error-text');
  } finally {
    cdekLoadButton.disabled = false;
    cdekLoadButton.textContent = 'Найти';
  }
}

function renderCdekMarkers() {
  if (!window.L || !cdekMap || !cdekMarkersLayer) return;
  cdekMarkersLayer.clearLayers();
  const bounds = [];

  cdekPoints.forEach((point) => {
    const location = point.location || {};
    const lat = Number(location.latitude);
    const lng = Number(location.longitude);
    if (!lat || !lng) return;
    bounds.push([lat, lng]);
    const title = `${point.code || 'CDEK'} · ${location.address || point.name || ''}`;
    const marker = window.L.marker([lat, lng]).addTo(cdekMarkersLayer);
    marker.bindPopup(`
      <strong>${escapeHtml(point.code || 'СДЭК')}</strong><br />
      ${escapeHtml(location.address || point.name || '')}<br />
      <button class="cdek-popup-select" data-code="${escapeHtml(point.code || '')}" type="button">Выбрать</button>
    `);
    marker.on('popupopen', () => {
      setTimeout(() => {
        document.querySelectorAll('.cdek-popup-select').forEach((button) => {
          button.addEventListener('click', () => chooseCdekPoint(point));
        });
      }, 0);
    });
    marker.on('click', () => highlightPoint(point.code));
    marker.options.title = title;
  });

  if (bounds.length) cdekMap.fitBounds(bounds, { padding: [24, 24], maxZoom: 13 });
}

function highlightPoint(code) {
  activePointCode = code || '';
  renderCdekPointList(cdekPoints);
}

function renderCdekPointList(points) {
  if (!points.length) {
    cdekPointsList.innerHTML = '<p class="pickup-list-empty">Пункты не найдены.</p>';
    return;
  }

  const visiblePoints = points.slice(0, CDEK_MAX_VISIBLE_POINTS);
  const hiddenCount = Math.max(0, points.length - visiblePoints.length);

  cdekPointsList.innerHTML = `${hiddenCount ? `<p class="pickup-list-note">Показано ${visiblePoints.length} из ${points.length}. Уточните город или район, если нужен другой ПВЗ.</p>` : ''}${visiblePoints.map((point) => {
    const location = point.location || {};
    const active = activePointCode && activePointCode === point.code ? ' is-active' : '';
    const type = point.type === 'POSTAMAT' ? 'Постамат' : 'ПВЗ';
    const cashless = point.have_cashless ? 'Карта' : '';
    const dressing = point.is_dressing_room ? 'Примерочная' : '';
    const badges = [type, cashless, dressing].filter(Boolean).map((item) => `<span>${escapeHtml(item)}</span>`).join('');
    return `
      <article class="pickup-point-item${active}" data-code="${escapeHtml(point.code || '')}">
        <div class="pickup-point-top">
          <strong>${escapeHtml(point.code || 'СДЭК')}</strong>
          <div class="pickup-point-badges">${badges}</div>
        </div>
        <p>${escapeHtml(location.address || point.name || 'Адрес не указан')}</p>
        ${point.work_time ? `<small>График: ${escapeHtml(point.work_time)}</small>` : ''}
        <button class="button button-ghost" type="button" data-choose-code="${escapeHtml(point.code || '')}">Выбрать</button>
      </article>
    `;
  }).join('')}`;

  cdekPointsList.querySelectorAll('[data-choose-code]').forEach((button) => {
    button.addEventListener('click', () => {
      const point = cdekPoints.find((entry) => entry.code === button.dataset.chooseCode);
      if (point) chooseCdekPoint(point);
    });
  });

  cdekPointsList.querySelectorAll('.pickup-point-item').forEach((card) => {
    card.addEventListener('click', (event) => {
      if (event.target.closest('button')) return;
      const point = cdekPoints.find((entry) => entry.code === card.dataset.code);
      if (!point) return;
      highlightPoint(point.code);
      const location = point.location || {};
      if (window.L && cdekMap && Number(location.latitude) && Number(location.longitude)) {
        cdekMap.setView([Number(location.latitude), Number(location.longitude)], 15);
      }
    });
  });
}

function chooseCdekPoint(point) {
  const normalized = normalizePickupPoint(point.type || 'PVZ', null, point);
  if (!normalized) return;
  setPickupPoint(normalized);
  setCdekMessage(t('Пункт СДЭК выбран. Можно отправлять заказ.', 'CDEK pickup point selected.'), 'api-alert-success');
  closeCdekMapModal();
}

async function openCdekWidget() {
  deliverySelect.value = 'СДЭК';
  syncDeliveryUi();

  try {
    await loadCdekConfig();
    openCdekMapModal();
    if (!cdekPoints.length) await loadCdekOffices();
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
cdekCloseButton?.addEventListener('click', closeCdekMapModal);
cdekModal?.addEventListener('click', (event) => {
  if (event.target === cdekModal) closeCdekMapModal();
});
cdekLoadButton?.addEventListener('click', loadCdekOffices);
cdekCitySearch?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    loadCdekOffices();
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && cdekModal?.classList.contains('is-open')) closeCdekMapModal();
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
    message.innerHTML = `<span class="api-alert api-alert-success">${t('Backend подтвердил заказ. Данные сохранены в PostgreSQL базе.', 'Backend confirmed the order. Data was saved to PostgreSQL database.')}</span>`;
  } catch (error) {
    const readableError = error instanceof TypeError
      ? t('Сервер не отвечает. Для полной backend-демонстрации запусти npm run dev.', 'The server is not responding. Run npm run dev for the full backend demo.')
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
