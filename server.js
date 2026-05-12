import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedback.json');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.js');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_BOT_USERNAME = (process.env.TELEGRAM_BOT_USERNAME || 'VEAST_Order_Bot').replace(/^@/, '');
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'https://veast-shop-nsdh.onrender.com';
const ADMIN_STATUS_KEY = process.env.ADMIN_STATUS_KEY || 'veast-admin-demo';

const ORDER_STATUSES = {
  created: {
    label: 'Заказ создан',
    message: 'Мы получили заказ и скоро передадим его в обработку.',
  },
  packed: {
    label: 'Заказ собран',
    message: 'Заказ собран и готовится к передаче в доставку.',
  },
  shipped: {
    label: 'Передан в доставку',
    message: 'Заказ передан в службу доставки.',
  },
  in_transit: {
    label: 'В пути',
    message: 'Заказ находится в пути.',
  },
  ready_for_pickup: {
    label: 'Ожидает получения',
    message: 'Заказ ожидает получения в пункте выдачи.',
  },
  delivered: {
    label: 'Заказ получен',
    message: 'Спасибо за покупку в VEAST.',
  },
};

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8',
};

async function ensureDataFiles() {
  await mkdir(DATA_DIR, { recursive: true });
  if (!existsSync(ORDERS_FILE)) await writeFile(ORDERS_FILE, '[]', 'utf8');
  if (!existsSync(FEEDBACK_FILE)) await writeFile(FEEDBACK_FILE, '[]', 'utf8');
}

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': type,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-key',
  });
  res.end(body);
}

async function readJson(file) {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch { return []; }
}

async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) req.destroy();
    });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch (error) { reject(error); }
    });
  });
}

function isEmail(value = '') {
  return /^\S+@\S+\.\S+$/.test(String(value).trim());
}

function clean(value = '') {
  return String(value ?? '').trim();
}

function normalizeStatusKey(value = '') {
  const key = clean(value).toLowerCase();
  return ORDER_STATUSES[key] ? key : 'created';
}

function createTelegramToken() {
  return randomBytes(18).toString('base64url');
}

function getTelegramBotLink(order) {
  if (!order?.telegramLinkToken || !TELEGRAM_BOT_USERNAME) return '';
  return `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${encodeURIComponent(order.telegramLinkToken)}`;
}

function getStatusInfo(statusKey) {
  return ORDER_STATUSES[normalizeStatusKey(statusKey)] || ORDER_STATUSES.created;
}

function getProviderLabel(provider = '') {
  const value = clean(provider);
  if (!value) return '';
  if (value.toLowerCase() === 'cdek') return 'СДЭК';
  if (value.toLowerCase() === 'post') return 'Почта России';
  return value;
}

function makeStatusHistoryEntry(order, statusKey, text = '') {
  const info = getStatusInfo(statusKey);
  return {
    statusKey: normalizeStatusKey(statusKey),
    status: info.label,
    text: clean(text) || info.message,
    deliveryProvider: getProviderLabel(order.deliveryProvider),
    trackingNumber: clean(order.trackingNumber),
    currentLocation: clean(order.currentLocation),
    date: new Date().toISOString(),
  };
}

function ensureOrderStatusFields(order) {
  const statusKey = normalizeStatusKey(order.statusKey || (order.status === 'New order' ? 'created' : order.statusKey));
  const info = getStatusInfo(statusKey);
  const normalized = {
    ...order,
    statusKey,
    status: order.status && order.status !== 'New order' ? order.status : info.label,
    statusText: order.statusText || info.message,
    deliveryProvider: order.deliveryProvider || order.customer?.delivery || '',
    trackingNumber: order.trackingNumber || '',
    currentLocation: order.currentLocation || '',
    telegramChatId: order.telegramChatId || null,
    telegramLinkedAt: order.telegramLinkedAt || null,
    telegramLinkToken: order.telegramLinkToken || createTelegramToken(),
    statusHistory: Array.isArray(order.statusHistory) && order.statusHistory.length
      ? order.statusHistory
      : [makeStatusHistoryEntry({ ...order, deliveryProvider: order.deliveryProvider || order.customer?.delivery || '' }, statusKey, order.statusText || info.message)],
  };
  normalized.telegramBotLink = getTelegramBotLink(normalized);
  return normalized;
}

function publicOrder(order) {
  return ensureOrderStatusFields(order);
}

function validateOrder(order) {
  const customer = order.customer || {};
  if (!customer.name || String(customer.name).trim().length < 2) return 'Name must contain at least 2 characters';
  if (!customer.phone || String(customer.phone).trim().length < 5) return 'Phone number or Telegram is required';
  if (!isEmail(customer.email)) return 'Invalid email address';
  if (!customer.city || String(customer.city).trim().length < 2) return 'City is required';
  if (!customer.address || String(customer.address).trim().length < 6) return 'Shipping address is required';
  if (!customer.privacyAccepted) return 'Privacy policy consent is required';
  if (!Array.isArray(order.items) || order.items.length === 0) return 'The order contains no items';
  if (order.items.some((item) => !item.productId || !item.quantity || Number(item.quantity) <= 0)) return 'Invalid items in order';
  if (!Number.isFinite(Number(order.total)) || Number(order.total) <= 0) return 'Invalid order total';
  return null;
}

function normalizeOrder(order) {
  const now = new Date().toISOString();
  const statusKey = normalizeStatusKey(order.statusKey || 'created');
  const statusInfo = getStatusInfo(statusKey);
  const normalized = {
    id: order.id || `VST-${Date.now()}`,
    createdAt: order.createdAt || now,
    statusKey,
    status: statusInfo.label,
    statusText: statusInfo.message,
    customer: {
      name: String(order.customer.name).trim(),
      phone: String(order.customer.phone).trim(),
      email: String(order.customer.email).trim(),
      city: String(order.customer.city).trim(),
      address: String(order.customer.address).trim(),
      delivery: String(order.customer.delivery || 'Not specified'),
      payment: String(order.customer.payment || 'Not specified'),
      comment: String(order.customer.comment || '').trim(),
      privacyAccepted: Boolean(order.customer.privacyAccepted),
    },
    items: order.items.map((item) => ({
      lineId: String(item.lineId || `${item.productId}-${item.size || 'OS'}`),
      productId: String(item.productId),
      product: String(item.product || item.productId),
      category: String(item.category || ''),
      size: String(item.size || 'OS'),
      quantity: Number(item.quantity),
      price: Number(item.price || 0),
      subtotal: Number(item.subtotal || item.price * item.quantity || 0),
      image: String(item.image || ''),
    })),
    total: Number(order.total),
    deliveryProvider: String(order.customer.delivery || '').trim(),
    trackingNumber: '',
    currentLocation: '',
    telegramChatId: null,
    telegramLinkedAt: null,
    telegramLinkToken: createTelegramToken(),
    statusHistory: [],
    serverSavedAt: now,
  };
  normalized.statusHistory = [makeStatusHistoryEntry(normalized, statusKey, statusInfo.message)];
  normalized.telegramBotLink = getTelegramBotLink(normalized);
  return normalized;
}

function validateFeedback(feedback) {
  if (!feedback.name || String(feedback.name).trim().length < 2) return 'Name must contain at least 2 characters';
  if (!isEmail(feedback.email)) return 'Invalid email address';
  if (!feedback.message || String(feedback.message).trim().length < 4) return 'Message is too short';
  return null;
}

async function loadProductsModule() {
  const moduleUrl = `file://${PRODUCTS_FILE}?v=${Date.now()}`;
  return import(moduleUrl);
}

async function validateBusinessOrder(order) {
  const basicError = validateOrder(order);
  if (basicError) return basicError;
  const { products = [] } = await loadProductsModule();
  const productMap = new Map(products.map((product) => [product.id, product]));
  let calculatedTotal = 0;

  for (const item of order.items) {
    const product = productMap.get(String(item.productId));
    if (!product) return `Product ${item.productId} not found in catalog`;
    if (!product.sizes.includes(String(item.size || 'OS'))) return `Size ${item.size} is not available for ${product.title}`;
    if (Number(item.quantity) > product.stock) return `Not enough stock available for ${product.title}`;
    calculatedTotal += product.price * Number(item.quantity);
  }

  if (Math.abs(calculatedTotal - Number(order.total)) > 1) return 'Order total does not match the server calculation';
  return null;
}

function isAdminRequest(req, url) {
  const headerKey = req.headers['x-admin-key'];
  const queryKey = url.searchParams.get('key');
  return clean(headerKey || queryKey) === ADMIN_STATUS_KEY;
}

async function telegramApi(method, payload) {
  if (!TELEGRAM_BOT_TOKEN) {
    return { ok: false, skipped: true, description: 'TELEGRAM_BOT_TOKEN is not configured' };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await response.json().catch(() => ({ ok: response.ok }));
  } catch (error) {
    return { ok: false, description: error.message };
  }
}

async function sendTelegramMessage(chatId, text) {
  if (!chatId) return { ok: false, skipped: true, description: 'No Telegram chat id' };
  return telegramApi('sendMessage', {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });
}

function buildTelegramStatusMessage(order, intro = 'Статус заказа обновлён.') {
  const normalized = ensureOrderStatusFields(order);
  const provider = getProviderLabel(normalized.deliveryProvider);
  const tracking = clean(normalized.trackingNumber);
  const location = clean(normalized.currentLocation);
  const lines = [
    'VEAST',
    '',
    `${intro}`,
    '',
    `Заказ: ${normalized.id}`,
    `Статус: ${normalized.status}`,
  ];

  if (normalized.statusText) lines.push(normalized.statusText);
  if (location) lines.push(`Где сейчас: ${location}`);
  if (provider) lines.push(`Служба доставки: ${provider}`);
  if (tracking) {
    lines.push(`Трек-номер: ${tracking}`);
    lines.push(`Вы можете отслеживать отправление в приложении ${provider || 'службы доставки'}.`);
  } else {
    lines.push('Трек-номер появится здесь после передачи заказа в службу доставки.');
  }

  if (normalized.statusKey === 'delivered') {
    lines.push('');
    lines.push('Спасибо за покупку в VEAST.');
  }

  return lines.join('\n');
}

function buildLinkedOrderMessage(order) {
  return buildTelegramStatusMessage(order, `Заказ ${order.id} привязан к Telegram.`);
}

function buildOrdersStatusMessage(orders) {
  const linked = orders.map(ensureOrderStatusFields).slice(-5).reverse();
  if (!linked.length) {
    return [
      'VEAST',
      '',
      'К этому Telegram пока не привязан заказ.',
      'Откройте ссылку “Получать статус в Telegram” на странице подтверждения заказа.',
    ].join('\n');
  }

  return linked.map((order) => buildTelegramStatusMessage(order, `Текущий статус заказа ${order.id}:`)).join('\n\n────────────\n\n');
}

async function handleTelegramWebhook(req, res) {
  try {
    const update = await parseBody(req);
    const message = update.message || update.edited_message;
    const text = clean(message?.text || '');
    const chatId = message?.chat?.id ? String(message.chat.id) : '';

    if (!chatId) return send(res, 200, JSON.stringify({ ok: true }));

    const orders = await readJson(ORDERS_FILE);
    const normalizedOrders = orders.map(ensureOrderStatusFields);

    if (text.startsWith('/start')) {
      const payload = clean(text.split(/\s+/)[1] || '');
      const index = normalizedOrders.findIndex((order) => order.telegramLinkToken === payload);

      if (!payload || index < 0) {
        await sendTelegramMessage(chatId, [
          'VEAST',
          '',
          'Не получилось найти заказ для привязки.',
          'Откройте бота по кнопке “Получать статус в Telegram” на странице подтверждения заказа.',
        ].join('\n'));
        return send(res, 200, JSON.stringify({ ok: true, linked: false }));
      }

      normalizedOrders[index] = {
        ...normalizedOrders[index],
        telegramChatId: chatId,
        telegramLinkedAt: new Date().toISOString(),
      };

      await writeFile(ORDERS_FILE, JSON.stringify(normalizedOrders, null, 2), 'utf8');
      await sendTelegramMessage(chatId, buildLinkedOrderMessage(normalizedOrders[index]));
      return send(res, 200, JSON.stringify({ ok: true, linked: true, orderId: normalizedOrders[index].id }));
    }

    if (text.startsWith('/status')) {
      const linkedOrders = normalizedOrders.filter((order) => String(order.telegramChatId || '') === chatId);
      await sendTelegramMessage(chatId, buildOrdersStatusMessage(linkedOrders));
      return send(res, 200, JSON.stringify({ ok: true }));
    }

    if (text.startsWith('/help')) {
      await sendTelegramMessage(chatId, [
        'VEAST',
        '',
        'Команды бота:',
        '/status — посмотреть текущий статус заказа',
        '/help — помощь',
        '',
        'Чтобы привязать заказ, нажмите кнопку “Получать статус в Telegram” на странице подтверждения заказа.',
      ].join('\n'));
      return send(res, 200, JSON.stringify({ ok: true }));
    }

    await sendTelegramMessage(chatId, [
      'VEAST',
      '',
      'Я показываю статусы заказов VEAST.',
      'Используйте /status, чтобы посмотреть текущий статус.',
    ].join('\n'));
    return send(res, 200, JSON.stringify({ ok: true }));
  } catch (error) {
    return send(res, 200, JSON.stringify({ ok: false, error: error.message }));
  }
}

async function handleSetTelegramWebhook(req, res, url) {
  if (!isAdminRequest(req, url)) return send(res, 401, JSON.stringify({ error: 'Admin key is required' }));
  const baseUrl = clean(PUBLIC_BASE_URL || url.searchParams.get('baseUrl'));
  if (!baseUrl) {
    return send(res, 400, JSON.stringify({
      error: 'PUBLIC_BASE_URL is not configured',
      example: 'https://veast-shop-nsdh.onrender.com',
    }));
  }

  const webhookUrl = `${baseUrl.replace(/\/+$/, '')}/api/telegram/webhook`;
  const result = await telegramApi('setWebhook', { url: webhookUrl });
  return send(res, 200, JSON.stringify({
    ok: Boolean(result.ok),
    webhookUrl,
    telegram: {
      ok: Boolean(result.ok),
      description: result.description || null,
      skipped: Boolean(result.skipped),
    },
  }));
}

async function handleOrderStatusUpdate(req, res, url, orderId) {
  if (!isAdminRequest(req, url)) return send(res, 401, JSON.stringify({ error: 'Admin key is required' }));

  try {
    const body = await parseBody(req);
    const orders = (await readJson(ORDERS_FILE)).map(ensureOrderStatusFields);
    const index = orders.findIndex((item) => item.id === orderId);
    if (index < 0) return send(res, 404, JSON.stringify({ error: 'Order not found' }));

    const order = orders[index];
    const statusKey = normalizeStatusKey(body.statusKey || body.status || order.statusKey);
    const info = getStatusInfo(statusKey);
    const has = (field) => Object.prototype.hasOwnProperty.call(body, field);

    order.statusKey = statusKey;
    order.status = info.label;
    order.statusText = clean(body.statusText || body.comment || body.text || info.message);
    if (has('deliveryProvider')) order.deliveryProvider = getProviderLabel(body.deliveryProvider);
    if (has('trackingNumber')) order.trackingNumber = clean(body.trackingNumber);
    if (has('currentLocation')) order.currentLocation = clean(body.currentLocation);

    const entry = makeStatusHistoryEntry(order, statusKey, order.statusText);
    order.statusHistory = [...(Array.isArray(order.statusHistory) ? order.statusHistory : []), entry];

    orders[index] = order;
    await writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');

    const telegram = order.telegramChatId
      ? await sendTelegramMessage(order.telegramChatId, buildTelegramStatusMessage(order))
      : { ok: false, skipped: true, description: 'Order is not linked to Telegram' };

    return send(res, 200, JSON.stringify({
      ok: true,
      order: publicOrder(order),
      telegram: {
        ok: Boolean(telegram.ok),
        skipped: Boolean(telegram.skipped),
        description: telegram.description || null,
      },
    }));
  } catch (error) {
    return send(res, 400, JSON.stringify({ error: error.message || 'Invalid JSON' }));
  }
}

async function handleApi(req, res, url) {
  if (req.method === 'OPTIONS') return send(res, 204, '');

  if (url.pathname === '/api/health' && req.method === 'GET') {
    return send(res, 200, JSON.stringify({ ok: true, project: 'VEAST', timestamp: new Date().toISOString() }));
  }

  if (url.pathname === '/api/stats' && req.method === 'GET') {
    const orders = await readJson(ORDERS_FILE);
    const feedback = await readJson(FEEDBACK_FILE);
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    return send(res, 200, JSON.stringify({ ok: true, orders: orders.length, feedback: feedback.length, totalRevenue }));
  }

  if (url.pathname === '/api/products' && req.method === 'GET') {
    const { products = [], categories = [] } = await loadProductsModule();
    return send(res, 200, JSON.stringify({ categories, products }));
  }

  if (url.pathname.startsWith('/api/products/') && req.method === 'GET') {
    const id = decodeURIComponent(url.pathname.replace('/api/products/', ''));
    const { products = [] } = await loadProductsModule();
    const product = products.find((item) => item.id === id || item.slug === id);
    if (!product) return send(res, 404, JSON.stringify({ error: 'Product not found' }));
    return send(res, 200, JSON.stringify(product));
  }

  if (url.pathname === '/api/telegram/webhook' && req.method === 'POST') {
    return handleTelegramWebhook(req, res);
  }

  if (url.pathname === '/api/telegram/set-webhook' && (req.method === 'GET' || req.method === 'POST')) {
    return handleSetTelegramWebhook(req, res, url);
  }

  const statusRoute = url.pathname.match(/^\/api\/orders\/([^/]+)\/status$/);
  if (statusRoute && req.method === 'GET') {
    const id = decodeURIComponent(statusRoute[1]);
    const orders = (await readJson(ORDERS_FILE)).map(ensureOrderStatusFields);
    const order = orders.find((item) => item.id === id);
    if (!order) return send(res, 404, JSON.stringify({ error: 'Order not found' }));
    return send(res, 200, JSON.stringify({
      id: order.id,
      statusKey: order.statusKey,
      status: order.status,
      statusText: order.statusText,
      deliveryProvider: order.deliveryProvider,
      trackingNumber: order.trackingNumber,
      currentLocation: order.currentLocation,
      statusHistory: order.statusHistory,
      telegramLinked: Boolean(order.telegramChatId),
    }));
  }

  if (statusRoute && req.method === 'POST') {
    const id = decodeURIComponent(statusRoute[1]);
    return handleOrderStatusUpdate(req, res, url, id);
  }

  if (url.pathname === '/api/orders' && req.method === 'GET') {
    return send(res, 200, JSON.stringify((await readJson(ORDERS_FILE)).map(publicOrder)));
  }

  if (url.pathname.startsWith('/api/orders/') && req.method === 'GET') {
    const id = decodeURIComponent(url.pathname.replace('/api/orders/', ''));
    const orders = (await readJson(ORDERS_FILE)).map(publicOrder);
    const order = orders.find((item) => item.id === id);
    if (!order) return send(res, 404, JSON.stringify({ error: 'Order not found' }));
    return send(res, 200, JSON.stringify(order));
  }

  if (url.pathname === '/api/orders' && req.method === 'POST') {
    try {
      const order = await parseBody(req);
      const error = await validateBusinessOrder(order);
      if (error) return send(res, 400, JSON.stringify({ error }));
      const orders = (await readJson(ORDERS_FILE)).map(ensureOrderStatusFields);
      const savedOrder = normalizeOrder(order);
      orders.push(savedOrder);
      await writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');
      return send(res, 201, JSON.stringify({ ok: true, order: publicOrder(savedOrder) }));
    } catch {
      return send(res, 400, JSON.stringify({ error: 'Invalid JSON' }));
    }
  }

  if (url.pathname === '/api/feedback' && req.method === 'POST') {
    try {
      const feedback = await parseBody(req);
      const error = validateFeedback(feedback);
      if (error) return send(res, 400, JSON.stringify({ error }));
      const list = await readJson(FEEDBACK_FILE);
      const saved = {
        id: feedback.id || `FB-${Date.now()}`,
        createdAt: feedback.createdAt || new Date().toISOString(),
        name: String(feedback.name).trim(),
        email: String(feedback.email).trim(),
        message: String(feedback.message).trim(),
        serverSavedAt: new Date().toISOString(),
      };
      list.push(saved);
      await writeFile(FEEDBACK_FILE, JSON.stringify(list, null, 2), 'utf8');
      return send(res, 201, JSON.stringify({ ok: true, feedback: saved }));
    } catch {
      return send(res, 400, JSON.stringify({ error: 'Invalid JSON' }));
    }
  }

  return send(res, 404, JSON.stringify({ error: 'API endpoint not found' }));
}

async function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  const safePath = path.normalize(path.join(__dirname, pathname));
  if (!safePath.startsWith(__dirname)) return send(res, 403, 'Forbidden', 'text/plain; charset=utf-8');
  try {
    const data = await readFile(safePath);
    const ext = path.extname(safePath).toLowerCase();
    send(res, 200, data, mime[ext] || 'application/octet-stream');
  } catch {
    try {
      const data = await readFile(path.join(__dirname, '404.html'));
      send(res, 404, data, 'text/html; charset=utf-8');
    } catch {
      send(res, 404, 'Not found', 'text/plain; charset=utf-8');
    }
  }
}

await ensureDataFiles();

if (process.env.VEAST_CHECK === '1') {
  console.log('VEAST server import check passed');
  process.exit(0);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith('/api/')) return handleApi(req, res, url);
  return serveStatic(req, res, url);
});

server.listen(PORT, () => {
  console.log(`VEAST project running: http://localhost:${PORT}`);
});
