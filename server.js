import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedback.json');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.js');

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
    'Access-Control-Allow-Headers': 'Content-Type',
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

function validateOrder(order) {
  const customer = order.customer || {};
  if (!customer.name || String(customer.name).trim().length < 2) return 'Имя должно содержать минимум 2 символа';
  if (!customer.phone || String(customer.phone).trim().length < 5) return 'Не указан телефон или Telegram';
  if (!isEmail(customer.email)) return 'Некорректный email';
  if (!customer.city || String(customer.city).trim().length < 2) return 'Не указан город';
  if (!customer.address || String(customer.address).trim().length < 6) return 'Не указан адрес доставки';
  if (!customer.privacyAccepted) return 'Не принято согласие с политикой конфиденциальности';
  if (!Array.isArray(order.items) || order.items.length === 0) return 'В заказе нет товаров';
  if (order.items.some((item) => !item.productId || !item.quantity || Number(item.quantity) <= 0)) return 'Некорректные товары в заказе';
  if (!Number.isFinite(Number(order.total)) || Number(order.total) <= 0) return 'Некорректная сумма заказа';
  return null;
}

function normalizeOrder(order) {
  return {
    id: order.id || `VST-${Date.now()}`,
    createdAt: order.createdAt || new Date().toISOString(),
    status: order.status || 'Новая заявка',
    customer: {
      name: String(order.customer.name).trim(),
      phone: String(order.customer.phone).trim(),
      email: String(order.customer.email).trim(),
      city: String(order.customer.city).trim(),
      address: String(order.customer.address).trim(),
      delivery: String(order.customer.delivery || 'Не указано'),
      payment: String(order.customer.payment || 'Не указано'),
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
    serverSavedAt: new Date().toISOString(),
  };
}

function validateFeedback(feedback) {
  if (!feedback.name || String(feedback.name).trim().length < 2) return 'Имя должно содержать минимум 2 символа';
  if (!isEmail(feedback.email)) return 'Некорректный email';
  if (!feedback.message || String(feedback.message).trim().length < 4) return 'Сообщение слишком короткое';
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
    if (!product) return `Товар ${item.productId} не найден в каталоге`;
    if (!product.sizes.includes(String(item.size || 'OS'))) return `Размер ${item.size} недоступен для товара ${product.title}`;
    if (Number(item.quantity) > product.stock) return `Недостаточно остатков для товара ${product.title}`;
    calculatedTotal += product.price * Number(item.quantity);
  }

  if (Math.abs(calculatedTotal - Number(order.total)) > 1) return 'Сумма заказа не совпадает с серверным расчётом';
  return null;
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
    if (!product) return send(res, 404, JSON.stringify({ error: 'Товар не найден' }));
    return send(res, 200, JSON.stringify(product));
  }

  if (url.pathname === '/api/orders' && req.method === 'GET') {
    return send(res, 200, JSON.stringify(await readJson(ORDERS_FILE)));
  }

  if (url.pathname.startsWith('/api/orders/') && req.method === 'GET') {
    const id = decodeURIComponent(url.pathname.replace('/api/orders/', ''));
    const orders = await readJson(ORDERS_FILE);
    const order = orders.find((item) => item.id === id);
    if (!order) return send(res, 404, JSON.stringify({ error: 'Заказ не найден' }));
    return send(res, 200, JSON.stringify(order));
  }

  if (url.pathname === '/api/orders' && req.method === 'POST') {
    try {
      const order = await parseBody(req);
      const error = await validateBusinessOrder(order);
      if (error) return send(res, 400, JSON.stringify({ error }));
      const orders = await readJson(ORDERS_FILE);
      const savedOrder = normalizeOrder(order);
      orders.push(savedOrder);
      await writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');
      return send(res, 201, JSON.stringify({ ok: true, order: savedOrder }));
    } catch {
      return send(res, 400, JSON.stringify({ error: 'Некорректный JSON' }));
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
      return send(res, 400, JSON.stringify({ error: 'Некорректный JSON' }));
    }
  }

  return send(res, 404, JSON.stringify({ error: 'API endpoint not found' }));
}

async function serveStatic(req, res, url) {
  const routeMap = {
    '/': '/index.html',
    '/index': '/index.html',
    '/catalog': '/catalog.html',
    '/catalog.html': '/catalog.html',
    '/product': '/product.html',
    '/product.html': '/product.html',
    '/cart': '/cart.html',
    '/cart.html': '/cart.html',
    '/checkout': '/checkout.html',
    '/checkout.html': '/checkout.html',
    '/confirmation': '/confirmation.html',
    '/confirmation.html': '/confirmation.html',
    '/thanks': '/thanks.html',
    '/thanks.html': '/thanks.html',
    '/admin-orders': '/admin-orders.html',
    '/admin-orders.html': '/admin-orders.html',
    '/contacts': '/contacts.html',
    '/contacts.html': '/contacts.html',
    '/favorites': '/favorites.html',
    '/favorites.html': '/favorites.html',
    '/account': '/account.html',
    '/account.html': '/account.html',
    '/privacy': '/privacy.html',
    '/privacy.html': '/privacy.html',
    '/project': '/project.html',
    '/project.html': '/project.html',
    '/prototype': '/prototype.html',
    '/prototype.html': '/prototype.html',
  };

  let pathname = decodeURIComponent(url.pathname);
  pathname = routeMap[pathname] || pathname;

  const safePath = path.resolve(__dirname, `.${pathname}`);

  if (!safePath.startsWith(__dirname)) {
    return send(res, 403, 'Forbidden', 'text/plain; charset=utf-8');
  }

  try {
    const data = await readFile(safePath);
    const ext = path.extname(safePath).toLowerCase();
    return send(res, 200, data, mime[ext] || 'application/octet-stream');
  } catch {
    try {
      const data = await readFile(path.join(__dirname, '404.html'));
      return send(res, 404, data, 'text/html; charset=utf-8');
    } catch {
      return send(res, 404, 'Not Found', 'text/plain; charset=utf-8');
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
