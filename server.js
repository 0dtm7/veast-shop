import http from 'node:http';
import https from 'node:https';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const DB_PATH = process.env.VEAST_DB_PATH || path.join(DATA_DIR, 'veast.sqlite');
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedback.json');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.js');

const TELEGRAM_BOT_TOKEN = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
const TELEGRAM_BOT_USERNAME = String(process.env.TELEGRAM_BOT_USERNAME || 'VEAST_Order_Bot').trim().replace(/^@/, '');
const PUBLIC_BASE_URL = String(process.env.PUBLIC_BASE_URL || 'https://veast-shop-nsdh.onrender.com').trim().replace(/\/+$/, '');
const ADMIN_STATUS_KEY = String(process.env.ADMIN_STATUS_KEY || 'veast-admin-demo').trim();
const CDEK_CLIENT_ID = String(process.env.CDEK_CLIENT_ID || '').trim();
const CDEK_CLIENT_SECRET = String(process.env.CDEK_CLIENT_SECRET || '').trim();
const CDEK_FROM_CITY = String(process.env.CDEK_FROM_CITY || 'Москва').trim();
const CDEK_DEFAULT_LOCATION = String(process.env.CDEK_DEFAULT_LOCATION || 'Москва').trim();
const YANDEX_MAPS_API_KEY = String(process.env.YANDEX_MAPS_API_KEY || '').trim();
const CDEK_API_BASE_URL = normalizeCdekApiBaseUrl(process.env.CDEK_API_BASE_URL || 'https://api.cdek.ru/v2');
const CDEK_WIDGET_VERSION = '3.11.1';
let cdekTokenCache = { token: '', expiresAt: 0 };
let db = null;

function normalizeCdekApiBaseUrl(value) {
  const raw = String(value || '').trim().replace(/\/+$/, '');
  if (!raw) return 'https://api.cdek.ru/v2';
  return raw.endsWith('/v2') ? raw : `${raw}/v2`;
}


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
  await mkdir(path.dirname(DB_PATH), { recursive: true });
  if (!existsSync(ORDERS_FILE)) await writeFile(ORDERS_FILE, '[]', 'utf8');
  if (!existsSync(FEEDBACK_FILE)) await writeFile(FEEDBACK_FILE, '[]', 'utf8');
  await initDatabase();
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


function getDb() {
  if (!db) throw new Error('VEAST SQLite database is not initialized');
  return db;
}

function parseDbJson(value, fallback = null) {
  if (!value) return fallback;
  try { return JSON.parse(value); }
  catch { return fallback; }
}

function boolToInt(value) {
  return value ? 1 : 0;
}

function intToBool(value) {
  return Number(value) === 1;
}

async function initDatabase() {
  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      status_key TEXT NOT NULL,
      status TEXT NOT NULL,
      status_text TEXT,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_city TEXT NOT NULL,
      customer_address TEXT NOT NULL,
      customer_delivery TEXT,
      customer_payment TEXT,
      customer_comment TEXT,
      privacy_accepted INTEGER DEFAULT 0,
      total REAL NOT NULL,
      delivery_provider TEXT,
      delivery_point_json TEXT,
      tracking_number TEXT,
      current_location TEXT,
      telegram_chat_id TEXT,
      telegram_linked_at TEXT,
      telegram_link_token TEXT UNIQUE,
      server_saved_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      line_id TEXT,
      product_id TEXT NOT NULL,
      product TEXT,
      category TEXT,
      size TEXT,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      subtotal REAL NOT NULL,
      image TEXT,
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS order_status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      status_key TEXT NOT NULL,
      status TEXT NOT NULL,
      text TEXT,
      delivery_provider TEXT,
      tracking_number TEXT,
      current_location TEXT,
      date TEXT NOT NULL,
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_telegram_chat_id ON orders(telegram_chat_id);
    CREATE INDEX IF NOT EXISTS idx_orders_telegram_link_token ON orders(telegram_link_token);
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_order_history_order_id ON order_status_history(order_id);
  `);

  await migrateLegacyOrdersJson();
}

async function migrateLegacyOrdersJson() {
  const database = getDb();
  const countRow = database.prepare('SELECT COUNT(*) AS count FROM orders').get();
  if (Number(countRow?.count || 0) > 0) return;

  const legacyOrders = await readJson(ORDERS_FILE);
  if (!Array.isArray(legacyOrders) || legacyOrders.length === 0) return;

  for (const legacyOrder of legacyOrders) {
    try {
      saveOrderToDatabase(ensureOrderStatusFields(legacyOrder));
    } catch (error) {
      console.error(`Legacy order migration failed: ${legacyOrder?.id || 'unknown'}`, error.message);
    }
  }
}

function orderRowToPublicOrder(row, items = [], history = []) {
  if (!row) return null;
  const order = {
    id: row.id,
    createdAt: row.created_at,
    statusKey: row.status_key,
    status: row.status,
    statusText: row.status_text || '',
    customer: {
      name: row.customer_name || '',
      phone: row.customer_phone || '',
      email: row.customer_email || '',
      city: row.customer_city || '',
      address: row.customer_address || '',
      delivery: row.customer_delivery || '',
      payment: row.customer_payment || '',
      comment: row.customer_comment || '',
      privacyAccepted: intToBool(row.privacy_accepted),
    },
    items: items.map((item) => ({
      lineId: item.line_id || '',
      productId: item.product_id || '',
      product: item.product || item.product_id || '',
      category: item.category || '',
      size: item.size || 'OS',
      quantity: Number(item.quantity || 0),
      price: Number(item.price || 0),
      subtotal: Number(item.subtotal || 0),
      image: item.image || '',
    })),
    total: Number(row.total || 0),
    deliveryProvider: row.delivery_provider || row.customer_delivery || '',
    deliveryPoint: parseDbJson(row.delivery_point_json, null),
    trackingNumber: row.tracking_number || '',
    currentLocation: row.current_location || '',
    telegramChatId: row.telegram_chat_id || null,
    telegramLinkedAt: row.telegram_linked_at || null,
    telegramLinkToken: row.telegram_link_token || '',
    statusHistory: history.map((entry) => ({
      statusKey: entry.status_key,
      status: entry.status,
      text: entry.text || '',
      deliveryProvider: entry.delivery_provider || '',
      trackingNumber: entry.tracking_number || '',
      currentLocation: entry.current_location || '',
      date: entry.date,
    })),
    serverSavedAt: row.server_saved_at || row.created_at,
    updatedAt: row.updated_at || row.server_saved_at || row.created_at,
  };
  return publicOrder(order);
}

function getOrderItems(orderId) {
  return getDb().prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC').all(orderId);
}

function getOrderHistory(orderId) {
  return getDb().prepare('SELECT * FROM order_status_history WHERE order_id = ? ORDER BY id ASC').all(orderId);
}

function getAllOrdersFromDatabase() {
  const rows = getDb().prepare('SELECT * FROM orders ORDER BY datetime(created_at) ASC, id ASC').all();
  return rows.map((row) => orderRowToPublicOrder(row, getOrderItems(row.id), getOrderHistory(row.id)));
}

function getOrderFromDatabase(orderId) {
  const row = getDb().prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!row) return null;
  return orderRowToPublicOrder(row, getOrderItems(orderId), getOrderHistory(orderId));
}

function getOrdersByTelegramChatId(chatId) {
  const rows = getDb().prepare('SELECT * FROM orders WHERE telegram_chat_id = ? ORDER BY datetime(created_at) ASC, id ASC').all(String(chatId));
  return rows.map((row) => orderRowToPublicOrder(row, getOrderItems(row.id), getOrderHistory(row.id)));
}

function getOrderByTelegramToken(token) {
  const row = getDb().prepare('SELECT * FROM orders WHERE telegram_link_token = ?').get(token);
  if (!row) return null;
  return orderRowToPublicOrder(row, getOrderItems(row.id), getOrderHistory(row.id));
}

function insertHistoryEntry(orderId, entry) {
  getDb().prepare(`
    INSERT INTO order_status_history (
      order_id, status_key, status, text, delivery_provider, tracking_number, current_location, date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    orderId,
    entry.statusKey || normalizeStatusKey(entry.status_key),
    entry.status || getStatusInfo(entry.statusKey || entry.status_key).label,
    entry.text || '',
    entry.deliveryProvider || entry.delivery_provider || '',
    entry.trackingNumber || entry.tracking_number || '',
    entry.currentLocation || entry.current_location || '',
    entry.date || new Date().toISOString(),
  );
}

function saveOrderToDatabase(order) {
  const database = getDb();
  const normalized = ensureOrderStatusFields(order);
  const customer = normalized.customer || {};
  const now = new Date().toISOString();
  const deliveryPoint = normalizeDeliveryPoint(normalized.deliveryPoint);

  database.exec('BEGIN');
  try {
    database.prepare(`
      INSERT INTO orders (
        id, created_at, status_key, status, status_text,
        customer_name, customer_phone, customer_email, customer_city, customer_address,
        customer_delivery, customer_payment, customer_comment, privacy_accepted,
        total, delivery_provider, delivery_point_json, tracking_number, current_location,
        telegram_chat_id, telegram_linked_at, telegram_link_token, server_saved_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      normalized.id,
      normalized.createdAt || now,
      normalizeStatusKey(normalized.statusKey),
      normalized.status || getStatusInfo(normalized.statusKey).label,
      normalized.statusText || '',
      customer.name || '',
      customer.phone || '',
      customer.email || '',
      customer.city || '',
      customer.address || '',
      customer.delivery || '',
      customer.payment || '',
      customer.comment || '',
      boolToInt(customer.privacyAccepted),
      Number(normalized.total || 0),
      normalized.deliveryProvider || customer.delivery || '',
      deliveryPoint ? JSON.stringify(deliveryPoint) : null,
      normalized.trackingNumber || '',
      normalized.currentLocation || '',
      normalized.telegramChatId || null,
      normalized.telegramLinkedAt || null,
      normalized.telegramLinkToken || createTelegramToken(),
      normalized.serverSavedAt || now,
      now,
    );

    const insertItem = database.prepare(`
      INSERT INTO order_items (
        order_id, line_id, product_id, product, category, size, quantity, price, subtotal, image
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of normalized.items || []) {
      insertItem.run(
        normalized.id,
        item.lineId || '',
        item.productId || '',
        item.product || item.productId || '',
        item.category || '',
        item.size || 'OS',
        Number(item.quantity || 0),
        Number(item.price || 0),
        Number(item.subtotal || 0),
        item.image || '',
      );
    }

    const history = Array.isArray(normalized.statusHistory) && normalized.statusHistory.length
      ? normalized.statusHistory
      : [makeStatusHistoryEntry(normalized, normalized.statusKey, normalized.statusText)];
    for (const entry of history) insertHistoryEntry(normalized.id, entry);

    database.exec('COMMIT');
    return getOrderFromDatabase(normalized.id);
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

function updateOrderTelegramBinding(orderId, chatId) {
  const linkedAt = new Date().toISOString();
  getDb().prepare(`
    UPDATE orders
    SET telegram_chat_id = ?, telegram_linked_at = COALESCE(telegram_linked_at, ?), updated_at = ?
    WHERE id = ?
  `).run(String(chatId), linkedAt, linkedAt, orderId);
  return getOrderFromDatabase(orderId);
}

function updateOrderStatusInDatabase(orderId, updates = {}) {
  const order = getOrderFromDatabase(orderId);
  if (!order) return null;

  const statusKey = normalizeStatusKey(updates.statusKey || updates.status || order.statusKey);
  const info = getStatusInfo(statusKey);
  const has = (field) => Object.prototype.hasOwnProperty.call(updates, field);
  const statusText = clean(updates.statusText || updates.comment || updates.text || info.message);
  const deliveryProvider = has('deliveryProvider') ? getProviderLabel(updates.deliveryProvider) : order.deliveryProvider;
  const trackingNumber = has('trackingNumber') ? clean(updates.trackingNumber) : clean(order.trackingNumber);
  const currentLocation = has('currentLocation') ? clean(updates.currentLocation) : clean(order.currentLocation);
  const now = new Date().toISOString();

  const updatedOrder = {
    ...order,
    statusKey,
    status: info.label,
    statusText,
    deliveryProvider,
    trackingNumber,
    currentLocation,
  };
  const entry = makeStatusHistoryEntry(updatedOrder, statusKey, statusText);

  const database = getDb();
  database.exec('BEGIN');
  try {
    database.prepare(`
      UPDATE orders
      SET status_key = ?, status = ?, status_text = ?, delivery_provider = ?, tracking_number = ?, current_location = ?, updated_at = ?
      WHERE id = ?
    `).run(statusKey, info.label, statusText, deliveryProvider, trackingNumber, currentLocation, now, orderId);
    insertHistoryEntry(orderId, entry);
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }

  return getOrderFromDatabase(orderId);
}

function getDatabaseStats() {
  const row = getDb().prepare('SELECT COUNT(*) AS orders, COALESCE(SUM(total), 0) AS totalRevenue FROM orders').get();
  return {
    orders: Number(row?.orders || 0),
    totalRevenue: Number(row?.totalRevenue || 0),
    dbPath: DB_PATH,
  };
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

function normalizeDeliveryPoint(point = null) {
  if (!point || typeof point !== 'object') return null;
  const location = point.location || {};
  const provider = clean(point.provider || 'cdek').toLowerCase();
  const providerTitle = clean(point.providerTitle || getProviderLabel(provider) || 'СДЭК');
  const address = clean(point.address || location.address || location.address_full);
  const city = clean(point.city || location.city);
  const code = clean(point.code || point.uuid);
  if (!address && !code) return null;

  return {
    provider,
    providerTitle,
    type: clean(point.type || 'office'),
    code,
    name: clean(point.name || code || 'Пункт выдачи'),
    address,
    city,
    region: clean(point.region || location.region),
    postalCode: clean(point.postalCode || location.postal_code),
    latitude: Number(point.latitude || location.latitude || 0) || null,
    longitude: Number(point.longitude || location.longitude || 0) || null,
    workTime: clean(point.workTime || point.work_time),
    tariffCode: point.tariffCode || point.tariff_code || null,
    tariffName: clean(point.tariffName || point.tariff_name),
    phones: Array.isArray(point.phones) ? point.phones.map(clean).filter(Boolean) : [],
  };
}

function formatDeliveryPoint(point = null) {
  const normalized = normalizeDeliveryPoint(point);
  if (!normalized) return '';
  return [
    normalized.providerTitle,
    normalized.code ? `ПВЗ ${normalized.code}` : '',
    normalized.address,
  ].filter(Boolean).join(' · ');
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
    deliveryPoint: normalizeDeliveryPoint(order.deliveryPoint),
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
  if (String(customer.delivery || '').trim() === 'СДЭК' && !normalizeDeliveryPoint(order.deliveryPoint)) return 'CDEK pickup point is required';
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
    deliveryPoint: normalizeDeliveryPoint(order.deliveryPoint),
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

function getCdekMissingConfig() {
  return [
    !CDEK_CLIENT_ID ? 'CDEK_CLIENT_ID' : '',
    !CDEK_CLIENT_SECRET ? 'CDEK_CLIENT_SECRET' : '',
    !YANDEX_MAPS_API_KEY ? 'YANDEX_MAPS_API_KEY' : '',
  ].filter(Boolean);
}

function httpsRequestRaw(targetUrl, { method = 'GET', headers = {}, body = '' } = {}) {
  const parsedUrl = new URL(targetUrl);
  const requestOptions = {
    hostname: parsedUrl.hostname,
    path: `${parsedUrl.pathname}${parsedUrl.search}`,
    method,
    family: 4,
    timeout: 20000,
    headers: {
      Accept: 'application/json',
      'User-Agent': `veast-cdek-widget/${CDEK_WIDGET_VERSION}`,
      ...headers,
    },
  };

  if (body) requestOptions.headers['Content-Length'] = Buffer.byteLength(body);

  return new Promise((resolve, reject) => {
    const request = https.request(requestOptions, (response) => {
      let raw = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { raw += chunk; });
      response.on('end', () => {
        resolve({ statusCode: response.statusCode || 0, headers: response.headers, raw });
      });
    });

    request.on('timeout', () => request.destroy(new Error('CDEK API request timed out')));
    request.on('error', reject);
    if (body) request.write(body);
    request.end();
  });
}

async function getCdekAuthToken() {
  if (cdekTokenCache.token && cdekTokenCache.expiresAt > Date.now() + 60000) return cdekTokenCache.token;
  if (!CDEK_CLIENT_ID || !CDEK_CLIENT_SECRET) throw new Error('CDEK credentials are not configured');

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: CDEK_CLIENT_ID,
    client_secret: CDEK_CLIENT_SECRET,
  }).toString();

  const response = await httpsRequestRaw(`${CDEK_API_BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-App-Name': 'widget_pvz',
      'X-App-Version': CDEK_WIDGET_VERSION,
    },
    body,
  });

  const data = JSON.parse(response.raw || '{}');
  if (response.statusCode < 200 || response.statusCode >= 300 || !data.access_token) {
    throw new Error(data.message || data.error_description || 'CDEK authorization failed');
  }

  cdekTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + Math.max(1, Number(data.expires_in || 3600) - 60) * 1000,
  };
  return cdekTokenCache.token;
}

function appendSearchParams(searchParams, data = {}) {
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (key === 'action') return;
    if (Array.isArray(value)) {
      value.forEach((item) => searchParams.append(key, String(item)));
      return;
    }
    if (typeof value === 'object') {
      searchParams.append(key, JSON.stringify(value));
      return;
    }
    searchParams.append(key, String(value));
  });
}

async function cdekAuthorizedRequest(endpoint, { method = 'GET', data = {} } = {}) {
  const token = await getCdekAuthToken();
  let targetUrl = `${CDEK_API_BASE_URL}/${endpoint.replace(/^\/+/, '')}`;
  let body = '';
  const headers = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    'X-App-Name': 'widget_pvz',
    'X-App-Version': CDEK_WIDGET_VERSION,
  };

  if (method === 'GET') {
    const search = new URLSearchParams();
    appendSearchParams(search, data);
    const query = search.toString();
    if (query) targetUrl += `?${query}`;
  } else {
    const payload = { ...data };
    delete payload.action;
    body = JSON.stringify(payload);
    headers['Content-Type'] = 'application/json';
  }

  return httpsRequestRaw(targetUrl, { method, headers, body });
}

function sendCdek(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-key',
    'X-Service-Version': CDEK_WIDGET_VERSION,
  });
  res.end(body);
}

async function handleCdekConfig(req, res) {
  const missing = getCdekMissingConfig();
  return send(res, 200, JSON.stringify({
    ok: true,
    enabled: missing.length === 0,
    missing,
    yandexMapsApiKey: YANDEX_MAPS_API_KEY,
    servicePath: '/api/cdek/service',
    from: CDEK_FROM_CITY,
    defaultLocation: CDEK_DEFAULT_LOCATION,
    defaultLocationCoords: [37.6173, 55.7558],
    apiBaseUrl: CDEK_API_BASE_URL,
  }));
}

async function handleCdekService(req, res, url) {
  if (req.method === 'OPTIONS') return sendCdek(res, 204, '');
  const missing = getCdekMissingConfig().filter((key) => key !== 'YANDEX_MAPS_API_KEY');
  if (missing.length) {
    return sendCdek(res, 503, JSON.stringify({ message: `CDEK service is not configured: ${missing.join(', ')}` }));
  }

  try {
    const body = req.method === 'POST' ? await parseBody(req) : {};
    const requestData = Object.fromEntries(url.searchParams.entries());
    Object.assign(requestData, body || {});
    const action = clean(requestData.action);

    if (action === 'offices') {
      const response = await cdekAuthorizedRequest('deliverypoints', { method: 'GET', data: requestData });
      return sendCdek(res, response.statusCode || 502, response.raw || '{}');
    }

    if (action === 'calculate') {
      const response = await cdekAuthorizedRequest('calculator/tarifflist', { method: 'POST', data: requestData });
      return sendCdek(res, response.statusCode || 502, response.raw || '{}');
    }

    return sendCdek(res, 400, JSON.stringify({ message: 'Unknown CDEK widget action' }));
  } catch (error) {
    return sendCdek(res, 502, JSON.stringify({ message: error.message || 'CDEK service request failed' }));
  }
}

function telegramApi(method, payload = {}) {
  if (!TELEGRAM_BOT_TOKEN) {
    return Promise.resolve({ ok: false, skipped: true, description: 'TELEGRAM_BOT_TOKEN is not configured' });
  }

  const body = JSON.stringify(payload);
  const requestOptions = {
    hostname: 'api.telegram.org',
    path: `/bot${TELEGRAM_BOT_TOKEN}/${method}`,
    method: 'POST',
    family: 4,
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
  };

  return new Promise((resolve) => {
    const request = https.request(requestOptions, (response) => {
      let raw = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { raw += chunk; });
      response.on('end', () => {
        try {
          const parsed = raw ? JSON.parse(raw) : {};
          resolve({ ok: Boolean(parsed.ok), httpStatus: response.statusCode, ...parsed });
        } catch (error) {
          resolve({ ok: false, httpStatus: response.statusCode, description: `Telegram returned non-JSON response: ${raw.slice(0, 120)}` });
        }
      });
    });

    request.on('timeout', () => {
      request.destroy(new Error('Telegram API request timed out'));
    });

    request.on('error', (error) => {
      resolve({
        ok: false,
        description: error.message || 'Telegram API request failed',
        code: error.code || null,
        hint: 'Check TELEGRAM_BOT_TOKEN in Render Environment Variables, then redeploy and press “Подключить webhook” again.',
      });
    });

    request.write(body);
    request.end();
  });
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
  const pickupPoint = normalizeDeliveryPoint(normalized.deliveryPoint);
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
  if (pickupPoint) lines.push(`Пункт выдачи: ${formatDeliveryPoint(pickupPoint)}`);
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

    if (text.startsWith('/start')) {
      const payload = clean(text.split(/\s+/)[1] || '');
      const targetOrder = payload ? getOrderByTelegramToken(payload) : null;

      if (!payload || !targetOrder) {
        await sendTelegramMessage(chatId, [
          'VEAST',
          '',
          'Не получилось найти заказ для привязки.',
          'Откройте бота по кнопке “Получать статус в Telegram” на странице подтверждения заказа.',
        ].join('\n'));
        return send(res, 200, JSON.stringify({ ok: true, linked: false }));
      }

      const alreadyLinkedChatId = clean(targetOrder.telegramChatId || '');
      if (alreadyLinkedChatId && alreadyLinkedChatId !== chatId) {
        await sendTelegramMessage(chatId, [
          'VEAST',
          '',
          'Этот заказ уже привязан к другому Telegram.',
          'Если это ваш заказ, оформите новую привязку со страницы подтверждения или обратитесь в поддержку VEAST.',
        ].join('\n'));
        return send(res, 200, JSON.stringify({ ok: true, linked: false, reason: 'already_linked' }));
      }

      const linkedOrder = updateOrderTelegramBinding(targetOrder.id, chatId);
      await sendTelegramMessage(chatId, buildLinkedOrderMessage(linkedOrder));
      return send(res, 200, JSON.stringify({ ok: true, linked: true, orderId: linkedOrder.id }));
    }

    if (text.startsWith('/status')) {
      const linkedOrders = getOrdersByTelegramChatId(chatId);
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
  return send(res, result.ok ? 200 : 502, JSON.stringify({
    ok: Boolean(result.ok),
    webhookUrl,
    telegram: {
      ok: Boolean(result.ok),
      description: result.description || null,
      errorCode: result.error_code || null,
      httpStatus: result.httpStatus || null,
      code: result.code || null,
      hint: result.hint || null,
      skipped: Boolean(result.skipped),
      tokenConfigured: Boolean(TELEGRAM_BOT_TOKEN),
    },
  }));
}

async function handleOrderStatusUpdate(req, res, url, orderId) {
  if (!isAdminRequest(req, url)) return send(res, 401, JSON.stringify({ error: 'Admin key is required' }));

  try {
    const body = await parseBody(req);
    const order = updateOrderStatusInDatabase(orderId, body);
    if (!order) return send(res, 404, JSON.stringify({ error: 'Order not found' }));

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
    return send(res, 200, JSON.stringify({ ok: true, project: 'VEAST', database: 'sqlite', dbPath: DB_PATH, timestamp: new Date().toISOString() }));
  }

  if (url.pathname === '/api/stats' && req.method === 'GET') {
    const feedback = await readJson(FEEDBACK_FILE);
    const orderStats = getDatabaseStats();
    return send(res, 200, JSON.stringify({ ok: true, orders: orderStats.orders, feedback: feedback.length, totalRevenue: orderStats.totalRevenue, database: 'sqlite' }));
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

  if (url.pathname === '/api/cdek/config' && req.method === 'GET') {
    return handleCdekConfig(req, res);
  }

  if (url.pathname === '/api/cdek/service' && (req.method === 'GET' || req.method === 'POST' || req.method === 'OPTIONS')) {
    return handleCdekService(req, res, url);
  }

  if (url.pathname === '/api/telegram/webhook' && req.method === 'POST') {
    return handleTelegramWebhook(req, res);
  }

  if (url.pathname === '/api/telegram/set-webhook' && (req.method === 'GET' || req.method === 'POST')) {
    return handleSetTelegramWebhook(req, res, url);
  }

  if (url.pathname === '/api/telegram/webhook-info' && (req.method === 'GET' || req.method === 'POST')) {
    if (!isAdminRequest(req, url)) return send(res, 401, JSON.stringify({ error: 'Admin key is required' }));
    const result = await telegramApi('getWebhookInfo', {});
    return send(res, result.ok ? 200 : 502, JSON.stringify({ ok: Boolean(result.ok), telegram: result }));
  }

  const statusRoute = url.pathname.match(/^\/api\/orders\/([^/]+)\/status$/);
  if (statusRoute && req.method === 'GET') {
    const id = decodeURIComponent(statusRoute[1]);
    const order = getOrderFromDatabase(id);
    if (!order) return send(res, 404, JSON.stringify({ error: 'Order not found' }));
    return send(res, 200, JSON.stringify({
      id: order.id,
      statusKey: order.statusKey,
      status: order.status,
      statusText: order.statusText,
      deliveryProvider: order.deliveryProvider,
      deliveryPoint: normalizeDeliveryPoint(order.deliveryPoint),
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
    if (!isAdminRequest(req, url)) {
      return send(res, 401, JSON.stringify({ error: 'Admin key is required' }));
    }
    return send(res, 200, JSON.stringify(getAllOrdersFromDatabase().map(publicOrder)));
  }

  if (url.pathname.startsWith('/api/orders/') && req.method === 'GET') {
    const id = decodeURIComponent(url.pathname.replace('/api/orders/', ''));
    const order = getOrderFromDatabase(id);
    if (!order) return send(res, 404, JSON.stringify({ error: 'Order not found' }));
    return send(res, 200, JSON.stringify(order));
  }

  if (url.pathname === '/api/orders' && req.method === 'POST') {
    try {
      const order = await parseBody(req);
      const error = await validateBusinessOrder(order);
      if (error) return send(res, 400, JSON.stringify({ error }));
      const savedOrder = saveOrderToDatabase(normalizeOrder(order));
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
