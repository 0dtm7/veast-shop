import http from 'node:http';
import https from 'node:https';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const DATABASE_URL = String(process.env.DATABASE_URL || '').trim();
const DATABASE_SSL = String(process.env.DATABASE_SSL || process.env.PGSSLMODE || '').trim().toLowerCase();
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedback.json');
const PRODUCTS_FILE = path.join(__dirname, 'scripts', 'products.js');

const TELEGRAM_BOT_TOKEN = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
const TELEGRAM_BOT_USERNAME = String(process.env.TELEGRAM_BOT_USERNAME || 'VEAST_Order_Bot').trim().replace(/^@/, '');
const SUPPORT_TELEGRAM_USERNAME = String(process.env.SUPPORT_TELEGRAM_USERNAME || 'veast_support').trim().replace(/^@/, '');
const PUBLIC_BASE_URL = String(process.env.PUBLIC_BASE_URL || 'https://veast-shop-nsdh.onrender.com').trim().replace(/\/+$/, '');
const VEAST_BOT_BANNER_URL = String(process.env.VEAST_BOT_BANNER_URL || `${PUBLIC_BASE_URL}/assets/bot/veast-order-bot-banner.png`).trim();
const VEAST_COMMENT_BOT_TOKEN = String(process.env.VEAST_COMMENT_BOT_TOKEN || '').trim();
const VEAST_DISCUSSION_CHAT_ID = String(process.env.VEAST_DISCUSSION_CHAT_ID || '').trim();
const VEAST_COMMENT_PHOTO_URL = String(process.env.VEAST_COMMENT_PHOTO_URL || `${PUBLIC_BASE_URL}/assets/bot/veast-comment-banner.png`).trim();
const VEAST_COMMENT_SITE_URL = String(process.env.VEAST_COMMENT_SITE_URL || PUBLIC_BASE_URL).trim().replace(/\/+$/, '');
const VEAST_COMMENT_BOT_CAPTION = String(process.env.VEAST_COMMENT_BOT_CAPTION || [
  'а в чём прикол?',
  '',
  'VEAST — тёмный streetwear, chrome-детали и вещи, с которых собирается образ.',
  '',
  'сайт ниже.',
].join('\n')).trim().replace(/\\n/g, '\n');
const ADMIN_STATUS_KEY = String(process.env.ADMIN_STATUS_KEY || 'veast-admin-demo').trim();
const CDEK_CLIENT_ID = String(process.env.CDEK_CLIENT_ID || '').trim();
const CDEK_CLIENT_SECRET = String(process.env.CDEK_CLIENT_SECRET || '').trim();
const CDEK_FROM_CITY = String(process.env.CDEK_FROM_CITY || 'Москва').trim();
const CDEK_DEFAULT_LOCATION = String(process.env.CDEK_DEFAULT_LOCATION || 'Москва').trim();
const CDEK_API_BASE_URL = normalizeCdekApiBaseUrl(process.env.CDEK_API_BASE_URL || 'https://api.cdek.ru/v2');
const CDEK_WIDGET_VERSION = '3.11.1';
const CDEK_OFFICES_PAGE_SIZE = Math.min(Math.max(Number(process.env.CDEK_OFFICES_PAGE_SIZE || 1000), 1), 1000);
const CDEK_OFFICES_MAX_PAGES = Math.min(Math.max(Number(process.env.CDEK_OFFICES_MAX_PAGES || 10), 1), 25);
let cdekTokenCache = { token: '', expiresAt: 0 };
let pgPool = null;

function normalizeCdekApiBaseUrl(value) {
  const raw = String(value || '').trim().replace(/\/+$/, '');
  if (!raw) return 'https://api.cdek.ru/v2';
  return raw.endsWith('/v2') ? raw : `${raw}/v2`;
}

function getCdekEnvironment() {
  return CDEK_API_BASE_URL.includes('api.edu.cdek.ru') ? 'test' : 'production';
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
  if (!existsSync(ORDERS_FILE)) await writeFile(ORDERS_FILE, '[]', 'utf8');
  if (!existsSync(FEEDBACK_FILE)) await writeFile(FEEDBACK_FILE, '[]', 'utf8');
  await initDatabase();
}

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': type,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-key',
  });
  res.end(body);
}

async function readJson(file) {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch { return []; }
}

async function writeJson(file, data) {
  await writeFile(file, JSON.stringify(data, null, 2), 'utf8');
}

function getDatabaseMode() {
  return DATABASE_URL ? 'postgresql' : 'json-fallback';
}

async function getPgPool() {
  if (!DATABASE_URL) return null;
  if (pgPool) return pgPool;

  const pg = await import('pg');
  const Pool = pg.Pool || pg.default?.Pool;
  const ssl = (DATABASE_SSL === 'require' || DATABASE_SSL === 'true')
    ? { rejectUnauthorized: false }
    : undefined;

  pgPool = new Pool({
    connectionString: DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ...(ssl ? { ssl } : {}),
  });

  pgPool.on('error', (error) => {
    console.error('VEAST PostgreSQL pool error:', error.message);
  });

  return pgPool;
}

async function pgQuery(sql, params = []) {
  const pool = await getPgPool();
  if (!pool) throw new Error('DATABASE_URL is not configured');
  return pool.query(sql, params);
}

function parseDbJson(value, fallback = null) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); }
  catch { return fallback; }
}

function boolToInt(value) {
  return value ? 1 : 0;
}

function intToBool(value) {
  return value === true || Number(value) === 1;
}

async function initDatabase() {
  if (!DATABASE_URL) {
    console.warn('DATABASE_URL is not configured. Orders will use temporary storage until a database is connected.');
    return;
  }

  await pgQuery(`
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
      privacy_accepted BOOLEAN DEFAULT FALSE,
      total NUMERIC(12, 2) NOT NULL,
      delivery_provider TEXT,
      delivery_point_json JSONB,
      tracking_number TEXT,
      current_location TEXT,
      telegram_chat_id TEXT,
      telegram_linked_at TEXT,
      telegram_link_token TEXT UNIQUE,
      server_saved_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id BIGSERIAL PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      line_id TEXT,
      product_id TEXT NOT NULL,
      product TEXT,
      category TEXT,
      size TEXT,
      quantity INTEGER NOT NULL,
      price NUMERIC(12, 2) NOT NULL,
      subtotal NUMERIC(12, 2) NOT NULL,
      image TEXT
    );

    CREATE TABLE IF NOT EXISTS order_status_history (
      id BIGSERIAL PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      status_key TEXT NOT NULL,
      status TEXT NOT NULL,
      text TEXT,
      delivery_provider TEXT,
      tracking_number TEXT,
      current_location TEXT,
      date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS feedback_messages (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      name TEXT NOT NULL,
      contact TEXT NOT NULL,
      order_id TEXT,
      topic TEXT,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      admin_reply TEXT,
      answered_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS catalog_products (
      id TEXT PRIMARY KEY,
      product_json JSONB NOT NULL,
      sort_index INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_telegram_chat_id ON orders(telegram_chat_id);
    CREATE INDEX IF NOT EXISTS idx_orders_telegram_link_token ON orders(telegram_link_token);
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_order_history_order_id ON order_status_history(order_id);
    CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback_messages(created_at);
    CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback_messages(status);
    CREATE INDEX IF NOT EXISTS idx_catalog_products_sort ON catalog_products(sort_index, created_at);
  `);

  await migrateLegacyOrdersJson();
  await migrateLegacyFeedbackJson();
  await migrateCatalogProductsModule();
}

async function migrateLegacyOrdersJson() {
  if (!DATABASE_URL) return;

  const countResult = await pgQuery('SELECT COUNT(*)::int AS count FROM orders');
  if (Number(countResult.rows?.[0]?.count || 0) > 0) return;

  const legacyOrders = await readJson(ORDERS_FILE);
  if (!Array.isArray(legacyOrders) || legacyOrders.length === 0) return;

  for (const legacyOrder of legacyOrders) {
    try {
      await saveOrderToDatabase(ensureOrderStatusFields(legacyOrder));
    } catch (error) {
      console.error(`Legacy order migration failed: ${legacyOrder?.id || 'unknown'}`, error.message);
    }
  }
}

async function migrateLegacyFeedbackJson() {
  if (!DATABASE_URL) return;

  const countResult = await pgQuery('SELECT COUNT(*)::int AS count FROM feedback_messages');
  if (Number(countResult.rows?.[0]?.count || 0) > 0) return;

  const legacyFeedback = await readJson(FEEDBACK_FILE);
  if (!Array.isArray(legacyFeedback) || legacyFeedback.length === 0) return;

  for (const item of legacyFeedback) {
    try {
      await saveFeedbackToDatabase({
        id: item.id,
        createdAt: item.createdAt,
        name: item.name,
        contact: item.contact || item.telegram || item.email || '',
        orderId: item.orderId || '',
        topic: item.topic || 'general',
        message: item.message,
        status: item.status || 'new',
        adminReply: item.adminReply || '',
        answeredAt: item.answeredAt || null,
      });
    } catch (error) {
      console.error(`Legacy feedback migration failed: ${item?.id || 'unknown'}`, error.message);
    }
  }
}

function normalizeFeedbackStatus(value = '') {
  const status = clean(value).toLowerCase();
  return ['new', 'in_progress', 'answered'].includes(status) ? status : 'new';
}

function feedbackRowToPublic(row) {
  if (!row) return null;
  return {
    id: row.id,
    createdAt: row.created_at,
    name: row.name || '',
    contact: row.contact || '',
    orderId: row.order_id || '',
    topic: row.topic || 'general',
    message: row.message || '',
    status: normalizeFeedbackStatus(row.status),
    adminReply: row.admin_reply || '',
    answeredAt: row.answered_at || null,
    updatedAt: row.updated_at || row.created_at,
  };
}

async function readFallbackFeedback() {
  const list = await readJson(FEEDBACK_FILE);
  return Array.isArray(list) ? list.map((item) => ({
    id: item.id || `FB-${Date.now()}`,
    createdAt: item.createdAt || new Date().toISOString(),
    name: item.name || '',
    contact: item.contact || item.telegram || item.email || '',
    orderId: item.orderId || '',
    topic: item.topic || 'general',
    message: item.message || '',
    status: normalizeFeedbackStatus(item.status || 'new'),
    adminReply: item.adminReply || '',
    answeredAt: item.answeredAt || null,
    updatedAt: item.updatedAt || item.serverSavedAt || item.createdAt || new Date().toISOString(),
  })) : [];
}

async function writeFallbackFeedback(list) {
  await writeJson(FEEDBACK_FILE, list);
}

async function saveFeedbackToDatabase(feedback) {
  const now = new Date().toISOString();
  const saved = {
    id: clean(feedback.id) || `FB-${Date.now()}-${randomBytes(3).toString('hex')}`,
    createdAt: feedback.createdAt || now,
    name: clean(feedback.name),
    contact: clean(feedback.contact || feedback.telegram || feedback.phone || feedback.email),
    orderId: clean(feedback.orderId || feedback.order || ''),
    topic: clean(feedback.topic || 'general'),
    message: clean(feedback.message),
    status: normalizeFeedbackStatus(feedback.status || 'new'),
    adminReply: clean(feedback.adminReply || ''),
    answeredAt: feedback.answeredAt || null,
    updatedAt: now,
  };

  if (!DATABASE_URL) {
    const list = await readFallbackFeedback();
    list.push(saved);
    await writeFallbackFeedback(list);
    return saved;
  }

  await pgQuery(`
    INSERT INTO feedback_messages (
      id, created_at, name, contact, order_id, topic, message, status, admin_reply, answered_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `, [
    saved.id,
    saved.createdAt,
    saved.name,
    saved.contact,
    saved.orderId,
    saved.topic,
    saved.message,
    saved.status,
    saved.adminReply,
    saved.answeredAt,
    saved.updatedAt,
  ]);
  return saved;
}

async function getFeedbackFromDatabase() {
  if (!DATABASE_URL) return readFallbackFeedback();
  const result = await pgQuery('SELECT * FROM feedback_messages ORDER BY created_at ASC, id ASC');
  return result.rows.map(feedbackRowToPublic);
}

async function updateFeedbackInDatabase(feedbackId, updates = {}) {
  const now = new Date().toISOString();
  const status = normalizeFeedbackStatus(updates.status || 'answered');
  const adminReply = clean(updates.adminReply || updates.reply || '');
  const answeredAt = status === 'answered' ? now : null;

  if (!DATABASE_URL) {
    const list = await readFallbackFeedback();
    const index = list.findIndex((item) => item.id === feedbackId);
    if (index < 0) return null;
    list[index] = { ...list[index], status, adminReply, answeredAt: answeredAt || list[index].answeredAt || null, updatedAt: now };
    await writeFallbackFeedback(list);
    return list[index];
  }

  const result = await pgQuery(`
    UPDATE feedback_messages
    SET status = $1, admin_reply = $2, answered_at = COALESCE($3, answered_at), updated_at = $4
    WHERE id = $5
    RETURNING *
  `, [status, adminReply, answeredAt, now, feedbackId]);
  return feedbackRowToPublic(result.rows?.[0]);
}

async function getFeedbackStats() {
  if (!DATABASE_URL) {
    const list = await readFallbackFeedback();
    return { total: list.length, new: list.filter((item) => item.status === 'new').length };
  }
  const result = await pgQuery(`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'new')::int AS new
    FROM feedback_messages
  `);
  return { total: Number(result.rows?.[0]?.total || 0), new: Number(result.rows?.[0]?.new || 0) };
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

async function readFallbackOrders() {
  const orders = await readJson(ORDERS_FILE);
  return Array.isArray(orders) ? orders.map(ensureOrderStatusFields) : [];
}

async function writeFallbackOrders(orders) {
  await writeJson(ORDERS_FILE, orders.map(ensureOrderStatusFields));
}

async function getOrderItems(orderId) {
  if (!DATABASE_URL) return [];
  const result = await pgQuery('SELECT * FROM order_items WHERE order_id = $1 ORDER BY id ASC', [orderId]);
  return result.rows;
}

async function getOrderHistory(orderId) {
  if (!DATABASE_URL) return [];
  const result = await pgQuery('SELECT * FROM order_status_history WHERE order_id = $1 ORDER BY id ASC', [orderId]);
  return result.rows;
}

async function getAllOrdersFromDatabase() {
  if (!DATABASE_URL) return readFallbackOrders();
  const result = await pgQuery('SELECT * FROM orders ORDER BY created_at ASC, id ASC');
  const orders = [];
  for (const row of result.rows) {
    orders.push(orderRowToPublicOrder(row, await getOrderItems(row.id), await getOrderHistory(row.id)));
  }
  return orders;
}

async function getOrderFromDatabase(orderId) {
  if (!DATABASE_URL) {
    const orders = await readFallbackOrders();
    return orders.find((order) => order.id === orderId) || null;
  }

  const result = await pgQuery('SELECT * FROM orders WHERE id = $1', [orderId]);
  const row = result.rows?.[0];
  if (!row) return null;
  return orderRowToPublicOrder(row, await getOrderItems(orderId), await getOrderHistory(orderId));
}

async function getOrdersByTelegramChatId(chatId) {
  if (!DATABASE_URL) {
    const orders = await readFallbackOrders();
    return orders.filter((order) => String(order.telegramChatId || '') === String(chatId));
  }

  const result = await pgQuery('SELECT * FROM orders WHERE telegram_chat_id = $1 ORDER BY created_at ASC, id ASC', [String(chatId)]);
  const orders = [];
  for (const row of result.rows) {
    orders.push(orderRowToPublicOrder(row, await getOrderItems(row.id), await getOrderHistory(row.id)));
  }
  return orders;
}

async function getOrderByTelegramToken(token) {
  if (!DATABASE_URL) {
    const orders = await readFallbackOrders();
    return orders.find((order) => order.telegramLinkToken === token) || null;
  }

  const result = await pgQuery('SELECT * FROM orders WHERE telegram_link_token = $1', [token]);
  const row = result.rows?.[0];
  if (!row) return null;
  return orderRowToPublicOrder(row, await getOrderItems(row.id), await getOrderHistory(row.id));
}

async function insertHistoryEntry(orderId, entry, client = null) {
  if (!DATABASE_URL) return;
  const runner = client || (await getPgPool());
  await runner.query(`
    INSERT INTO order_status_history (
      order_id, status_key, status, text, delivery_provider, tracking_number, current_location, date
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [
    orderId,
    entry.statusKey || normalizeStatusKey(entry.status_key),
    entry.status || getStatusInfo(entry.statusKey || entry.status_key).label,
    entry.text || '',
    entry.deliveryProvider || entry.delivery_provider || '',
    entry.trackingNumber || entry.tracking_number || '',
    entry.currentLocation || entry.current_location || '',
    entry.date || new Date().toISOString(),
  ]);
}

async function saveOrderToDatabase(order) {
  const normalized = ensureOrderStatusFields(order);
  const now = new Date().toISOString();

  if (!DATABASE_URL) {
    const orders = await readFallbackOrders();
    orders.push({ ...normalized, updatedAt: now });
    await writeFallbackOrders(orders);
    return ensureOrderStatusFields({ ...normalized, updatedAt: now });
  }

  const pool = await getPgPool();
  const client = await pool.connect();
  const customer = normalized.customer || {};
  const deliveryPoint = normalizeDeliveryPoint(normalized.deliveryPoint);

  try {
    await client.query('BEGIN');
    await client.query(`
      INSERT INTO orders (
        id, created_at, status_key, status, status_text,
        customer_name, customer_phone, customer_email, customer_city, customer_address,
        customer_delivery, customer_payment, customer_comment, privacy_accepted,
        total, delivery_provider, delivery_point_json, tracking_number, current_location,
        telegram_chat_id, telegram_linked_at, telegram_link_token, server_saved_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17::jsonb, $18, $19, $20, $21, $22, $23, $24)
    `, [
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
      Boolean(customer.privacyAccepted),
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
    ]);

    for (const item of normalized.items || []) {
      await client.query(`
        INSERT INTO order_items (
          order_id, line_id, product_id, product, category, size, quantity, price, subtotal, image
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
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
      ]);
    }

    const history = Array.isArray(normalized.statusHistory) && normalized.statusHistory.length
      ? normalized.statusHistory
      : [makeStatusHistoryEntry(normalized, normalized.statusKey, normalized.statusText)];
    for (const entry of history) await insertHistoryEntry(normalized.id, entry, client);

    await client.query('COMMIT');
    return getOrderFromDatabase(normalized.id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function updateOrderTelegramBinding(orderId, chatId) {
  const linkedAt = new Date().toISOString();

  if (!DATABASE_URL) {
    const orders = await readFallbackOrders();
    const index = orders.findIndex((order) => order.id === orderId);
    if (index < 0) return null;
    orders[index] = { ...orders[index], telegramChatId: String(chatId), telegramLinkedAt: orders[index].telegramLinkedAt || linkedAt, updatedAt: linkedAt };
    await writeFallbackOrders(orders);
    return ensureOrderStatusFields(orders[index]);
  }

  await pgQuery(`
    UPDATE orders
    SET telegram_chat_id = $1, telegram_linked_at = COALESCE(telegram_linked_at, $2), updated_at = $3
    WHERE id = $4
  `, [String(chatId), linkedAt, linkedAt, orderId]);
  return getOrderFromDatabase(orderId);
}

async function updateOrderStatusInDatabase(orderId, updates = {}) {
  const order = await getOrderFromDatabase(orderId);
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
    updatedAt: now,
  };
  const entry = makeStatusHistoryEntry(updatedOrder, statusKey, statusText);

  if (!DATABASE_URL) {
    const orders = await readFallbackOrders();
    const index = orders.findIndex((item) => item.id === orderId);
    if (index < 0) return null;
    orders[index] = {
      ...orders[index],
      statusKey,
      status: info.label,
      statusText,
      deliveryProvider,
      trackingNumber,
      currentLocation,
      updatedAt: now,
      statusHistory: [...(orders[index].statusHistory || []), entry],
    };
    await writeFallbackOrders(orders);
    return ensureOrderStatusFields(orders[index]);
  }

  const pool = await getPgPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      UPDATE orders
      SET status_key = $1, status = $2, status_text = $3, delivery_provider = $4, tracking_number = $5, current_location = $6, updated_at = $7
      WHERE id = $8
    `, [statusKey, info.label, statusText, deliveryProvider, trackingNumber, currentLocation, now, orderId]);
    await insertHistoryEntry(orderId, entry, client);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return getOrderFromDatabase(orderId);
}

async function getDatabaseStats() {
  if (!DATABASE_URL) {
    const orders = await readFallbackOrders();
    return {
      orders: orders.length,
      totalRevenue: orders.reduce((sum, order) => sum + Number(order.total || 0), 0),
      database: getDatabaseMode(),
      persistent: false,
    };
  }

  const result = await pgQuery('SELECT COUNT(*)::int AS orders, COALESCE(SUM(total), 0)::numeric AS total_revenue FROM orders');
  const row = result.rows?.[0] || {};
  return {
    orders: Number(row.orders || 0),
    totalRevenue: Number(row.total_revenue || 0),
    database: getDatabaseMode(),
    persistent: true,
  };
}

async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 30_000_000) req.destroy();
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

function normalizeTelegramLinkCode(value = '') {
  return clean(value)
    .replace(/^\/start\s+/i, '')
    .replace(/^код[:\s-]*/i, '')
    .replace(/^veast[-_\s]?link[:\s-]*/i, '')
    .trim();
}

async function linkOrderToTelegramByCode(rawCode, chatId) {
  const token = normalizeTelegramLinkCode(rawCode);
  if (!token || token.length < 8) return { linked: false, reason: 'empty' };
  const targetOrder = await getOrderByTelegramToken(token);
  if (!targetOrder) return { linked: false, reason: 'not_found' };

  const alreadyLinkedChatId = clean(targetOrder.telegramChatId || '');
  if (alreadyLinkedChatId && alreadyLinkedChatId !== String(chatId)) {
    return { linked: false, reason: 'already_linked', order: targetOrder };
  }

  const linkedOrder = await updateOrderTelegramBinding(targetOrder.id, chatId);
  return { linked: true, order: linkedOrder };
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
  const name = clean(feedback.name);
  const contact = clean(feedback.contact || feedback.telegram || feedback.phone || feedback.email);
  const message = clean(feedback.message);
  if (name.length < 2) return 'Укажите имя от 2 символов';
  if (contact.length < 3) return 'Укажите Telegram или другой контакт для ответа';
  if (message.length < 10) return 'Сообщение должно быть не короче 10 символов';
  if (message.length > 2000) return 'Сообщение слишком длинное';
  return null;
}

async function loadProductsModule() {
  const moduleUrl = `file://${PRODUCTS_FILE}?v=${Date.now()}`;
  return import(moduleUrl);
}

async function validateBusinessOrder(order) {
  const basicError = validateOrder(order);
  if (basicError) return basicError;
  const products = await getCatalogProducts();
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


function slugifyProduct(value = '') {
  const source = clean(value).toLowerCase();
  const translit = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
    к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
    х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  };
  const replaced = source.replace(/[а-яё]/g, (char) => translit[char] || char);
  const slug = replaced.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || `product-${Date.now()}`;
}

function parseList(value = '') {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean);
  return String(value || '')
    .split(/[,\n]/)
    .map(clean)
    .filter(Boolean);
}

function getCategoryTitle(categoryId = '') {
  const map = {
    hoodie: 'Худи',
    tee: 'Футболки',
    longsleeve: 'Лонгсливы',
    outerwear: 'Верхняя одежда',
    pants: 'Брюки',
    accessory: 'Аксессуары',
  };
  return map[clean(categoryId)] || clean(categoryId) || 'Товар';
}

function normalizeAdminProduct(raw = {}, current = null) {
  const title = clean(raw.title || current?.title || 'VEAST Product');
  const baseSlug = slugifyProduct(raw.slug || title);
  const id = clean(raw.id || current?.id || `vst-${baseSlug}`)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '') || `vst-${Date.now()}`;
  const category = clean(raw.category || current?.category || 'accessory');
  const sizes = parseList(raw.sizes || current?.sizes || 'OS');
  const stock = Math.max(0, Number(raw.stock ?? current?.stock ?? 0) || 0);

  return {
    id,
    slug: clean(raw.slug || current?.slug || baseSlug),
    title,
    category,
    categoryTitle: clean(raw.categoryTitle || current?.categoryTitle || getCategoryTitle(category)),
    collection: clean(raw.collection || current?.collection || 'Orbit Drop'),
    price: Math.max(0, Number(raw.price ?? current?.price ?? 0) || 0),
    oldPrice: raw.oldPrice === '' || raw.oldPrice === null || raw.oldPrice === undefined
      ? null
      : Math.max(0, Number(raw.oldPrice) || 0),
    color: clean(raw.color || current?.color || 'black'),
    colorTitle: clean(raw.colorTitle || current?.colorTitle || 'Washed Black / Chrome'),
    sizes: sizes.length ? sizes : ['OS'],
    stock,
    status: clean(raw.status || current?.status || (stock > 0 ? 'В наличии' : 'Нет в наличии')),
    badges: parseList(raw.badges ?? current?.badges ?? ''),
    featureTags: parseList(raw.featureTags ?? current?.featureTags ?? ''),
    wearWith: parseList(raw.wearWith ?? current?.wearWith ?? ''),
    cardImage: clean(raw.cardImage || current?.cardImage || ''),
    cardImageAlt: clean(raw.cardImageAlt || current?.cardImageAlt || ''),
    image: clean(raw.image || current?.image || ''),
    imageAlt: clean(raw.imageAlt || current?.imageAlt || ''),
    gallery: parseList(raw.gallery ?? current?.gallery ?? ''),
    description: clean(raw.description || current?.description || ''),
    material: clean(raw.material || current?.material || ''),
    fit: clean(raw.fit || current?.fit || ''),
    care: clean(raw.care || current?.care || ''),
    measurements: clean(raw.measurements || current?.measurements || ''),
    rating: Math.min(5, Math.max(0, Number(raw.rating ?? current?.rating ?? 4.8) || 4.8)),
  };
}

function isDataImage(value = '') {
  return /^data:image\/(png|jpe?g|webp);base64,/i.test(String(value || ''));
}

async function saveAdminProductImage(value = '', productId = 'product', slot = 'image') {
  const raw = String(value || '').trim();
  if (!raw || !isDataImage(raw)) return raw;
  const match = raw.match(/^data:image\/(png|jpe?g|webp);base64,(.+)$/i);
  if (!match) return '';
  const type = match[1].toLowerCase().replace('jpeg', 'jpg');
  const safeProductId = productId.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  const safeSlot = slot.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  const fileName = `${safeProductId}-${safeSlot}-${Date.now()}-${randomBytes(3).toString('hex')}.${type}`;
  const uploadDir = path.join(__dirname, 'assets', 'admin-products');
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), Buffer.from(match[2], 'base64'));
  return `assets/admin-products/${fileName}`;
}

async function normalizeAdminProductImages(product) {
  const result = { ...product };
  result.cardImage = await saveAdminProductImage(result.cardImage, result.id, 'card');
  result.cardImageAlt = await saveAdminProductImage(result.cardImageAlt, result.id, 'card-alt');
  result.image = await saveAdminProductImage(result.image, result.id, 'front');
  result.imageAlt = await saveAdminProductImage(result.imageAlt, result.id, 'back');
  const gallery = [];
  for (let i = 0; i < (result.gallery || []).length; i += 1) {
    const saved = await saveAdminProductImage(result.gallery[i], result.id, `gallery-${i + 1}`);
    if (saved) gallery.push(saved);
  }
  result.gallery = gallery;
  return result;
}

async function saveProductsModule(products, categories) {
  const file = [
    `export const categories = ${JSON.stringify(categories, null, 2)};`,
    '',
    `export const products = ${JSON.stringify(products, null, 2)};`,
    '',
    `export const formatPrice = (value) => new Intl.NumberFormat('ru-RU', {`,
    `  style: 'currency',`,
    `  currency: 'RUB',`,
    `  maximumFractionDigits: 0,`,
    `}).format(value);`,
    '',
    `export const getProductById = (id) => products.find((product) => product.id === id);`,
    `export const getProductsByCategory = (category) => category === 'all' ? products : products.filter((product) => product.category === category);`,
    '',
  ].join('\n');
  await writeFile(PRODUCTS_FILE, file, 'utf8');
}

async function getProductCategories() {
  const { categories = [] } = await loadProductsModule();
  return categories;
}

async function getProductsFromModule() {
  const { products = [], categories = [] } = await loadProductsModule();
  return { products, categories };
}

async function migrateCatalogProductsModule() {
  const moduleData = await getProductsFromModule();
  if (!DATABASE_URL) return moduleData;

  const countResult = await pgQuery('SELECT COUNT(*)::int AS count FROM catalog_products');
  if (Number(countResult.rows?.[0]?.count || 0) > 0) {
    const products = await getCatalogProducts();
    await saveProductsModule(products, moduleData.categories);
    return { products, categories: moduleData.categories };
  }

  const now = new Date().toISOString();
  for (let index = 0; index < moduleData.products.length; index += 1) {
    const product = moduleData.products[index];
    await pgQuery(`
      INSERT INTO catalog_products (id, product_json, sort_index, created_at, updated_at)
      VALUES ($1, $2::jsonb, $3, $4, $5)
      ON CONFLICT (id) DO NOTHING
    `, [product.id, JSON.stringify(product), index, now, now]);
  }

  return moduleData;
}

async function getCatalogProducts() {
  if (!DATABASE_URL) {
    const { products = [] } = await loadProductsModule();
    return products;
  }

  const result = await pgQuery('SELECT product_json FROM catalog_products ORDER BY sort_index ASC, created_at ASC, id ASC');
  return result.rows.map((row) => parseDbJson(row.product_json, {})).filter((item) => item && item.id);
}

async function syncProductsModuleFromSource(products = null) {
  const categories = await getProductCategories();
  const list = products || await getCatalogProducts();
  await saveProductsModule(list, categories);
  return { products: list, categories };
}

async function getAdminProducts() {
  const categories = await getProductCategories();
  const products = await getCatalogProducts();
  return { products, categories };
}

async function createAdminProduct(raw = {}) {
  const data = await getAdminProducts();
  let product = normalizeAdminProduct(raw);
  product = await normalizeAdminProductImages(product);
  if (data.products.some((item) => item.id === product.id)) {
    throw new Error('Товар с таким ID уже есть');
  }

  if (!DATABASE_URL) {
    await saveProductsModule([...data.products, product], data.categories);
    return product;
  }

  const now = new Date().toISOString();
  await pgQuery(`
    INSERT INTO catalog_products (id, product_json, sort_index, created_at, updated_at)
    VALUES ($1, $2::jsonb, $3, $4, $5)
  `, [product.id, JSON.stringify(product), data.products.length, now, now]);
  await syncProductsModuleFromSource();
  return product;
}

async function updateAdminProduct(productId, raw = {}) {
  const data = await getAdminProducts();
  const index = data.products.findIndex((item) => item.id === productId);
  if (index < 0) return null;
  let product = normalizeAdminProduct({ ...raw, id: productId }, data.products[index]);
  product = await normalizeAdminProductImages(product);

  if (!DATABASE_URL) {
    data.products[index] = product;
    await saveProductsModule(data.products, data.categories);
    return product;
  }

  await pgQuery(`
    UPDATE catalog_products
    SET product_json = $1::jsonb, updated_at = $2
    WHERE id = $3
  `, [JSON.stringify(product), new Date().toISOString(), productId]);
  await syncProductsModuleFromSource();
  return product;
}

async function deleteAdminProduct(productId) {
  const data = await getAdminProducts();
  const next = data.products.filter((item) => item.id !== productId);
  if (next.length === data.products.length) return false;

  if (!DATABASE_URL) {
    await saveProductsModule(next, data.categories);
    return true;
  }

  await pgQuery('DELETE FROM catalog_products WHERE id = $1', [productId]);
  await syncProductsModuleFromSource(next);
  return true;
}

function validateAdminProduct(product = {}) {
  if (clean(product.title).length < 2) return 'Укажи название товара';
  if (Number(product.price) <= 0) return 'Укажи цену товара';
  if (!parseList(product.sizes).length) return 'Укажи хотя бы один размер';
  return null;
}

function getCdekMissingConfig() {
  return [
    !CDEK_CLIENT_ID ? 'CDEK_CLIENT_ID' : '',
    !CDEK_CLIENT_SECRET ? 'CDEK_CLIENT_SECRET' : '',
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
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-key',
    'X-Service-Version': CDEK_WIDGET_VERSION,
  });
  res.end(body);
}

async function handleCdekConfig(req, res) {
  const missing = getCdekMissingConfig();
  const environment = getCdekEnvironment();
  return send(res, 200, JSON.stringify({
    ok: true,
    enabled: missing.length === 0,
    missing,
    servicePath: '/api/cdek/service',
    from: CDEK_FROM_CITY,
    defaultLocation: CDEK_DEFAULT_LOCATION,
    defaultLocationCoords: [37.6173, 55.7558],
    apiBaseUrl: CDEK_API_BASE_URL,
    environment,
    actualPickupPoints: environment === 'production',
    officePageSize: CDEK_OFFICES_PAGE_SIZE,
    officeMaxPages: CDEK_OFFICES_MAX_PAGES,
  }));
}

async function fetchCdekDeliveryPoints(requestData = {}) {
  const requestedSize = Number(requestData.size || CDEK_OFFICES_PAGE_SIZE);
  const pageSize = Math.min(Math.max(requestedSize || CDEK_OFFICES_PAGE_SIZE, 1), 1000);
  const requestedMaxPages = Number(requestData.max_pages || CDEK_OFFICES_MAX_PAGES);
  const maxPages = Math.min(Math.max(requestedMaxPages || CDEK_OFFICES_MAX_PAGES, 1), 25);
  const offices = [];

  for (let page = 0; page < maxPages; page += 1) {
    const pageData = {
      ...requestData,
      size: String(pageSize),
      page: String(page),
      lang: requestData.lang || 'rus',
    };
    delete pageData.max_pages;

    const response = await cdekAuthorizedRequest('deliverypoints', { method: 'GET', data: pageData });
    if (response.statusCode < 200 || response.statusCode >= 300) return response;

    const pageOffices = JSON.parse(response.raw || '[]');
    if (!Array.isArray(pageOffices)) {
      return { statusCode: response.statusCode, raw: response.raw || '[]' };
    }

    offices.push(...pageOffices);
    if (pageOffices.length < pageSize) break;
  }

  return {
    statusCode: 200,
    raw: JSON.stringify({
      offices,
      count: offices.length,
      environment: getCdekEnvironment(),
      actualPickupPoints: getCdekEnvironment() === 'production',
      source: CDEK_API_BASE_URL,
    }),
  };
}

async function handleCdekService(req, res, url) {
  if (req.method === 'OPTIONS') return sendCdek(res, 204, '');
  const missing = getCdekMissingConfig();
  if (missing.length) {
    return sendCdek(res, 503, JSON.stringify({ message: `CDEK service is not configured: ${missing.join(', ')}` }));
  }

  try {
    const body = req.method === 'POST' ? await parseBody(req) : {};
    const requestData = Object.fromEntries(url.searchParams.entries());
    Object.assign(requestData, body || {});
    const action = clean(requestData.action);

    if (action === 'cities') {
      const response = await cdekAuthorizedRequest('location/suggest/cities', { method: 'GET', data: requestData });
      return sendCdek(res, response.statusCode || 502, response.raw || '{}');
    }

    if (action === 'offices') {
      const response = await fetchCdekDeliveryPoints(requestData);
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

async function sendTelegramMessage(chatId, text, options = {}) {
  if (!chatId) return { ok: false, skipped: true, description: 'No Telegram chat id' };
  return telegramApi('sendMessage', {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    ...options,
  });
}

async function sendTelegramPhoto(chatId, photo, caption, options = {}) {
  if (!chatId) return { ok: false, skipped: true, description: 'No Telegram chat id' };
  if (!photo) return { ok: false, skipped: true, description: 'No Telegram photo URL' };
  return telegramApi('sendPhoto', {
    chat_id: chatId,
    photo,
    caption,
    ...options,
  });
}

function commentBotApi(method, payload = {}) {
  if (!VEAST_COMMENT_BOT_TOKEN) {
    return Promise.resolve({ ok: false, skipped: true, description: 'VEAST_COMMENT_BOT_TOKEN is not configured' });
  }

  const body = JSON.stringify(payload);
  const requestOptions = {
    hostname: 'api.telegram.org',
    path: `/bot${VEAST_COMMENT_BOT_TOKEN}/${method}`,
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
        } catch {
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
        hint: 'Check VEAST_COMMENT_BOT_TOKEN in Render Environment Variables, then redeploy and set the comment bot webhook.',
      });
    });

    request.write(body);
    request.end();
  });
}

function isDiscussionAutoForward(message) {
  return Boolean(message?.is_automatic_forward);
}

async function handleCommentBotWebhook(req, res) {
  try {
    const update = await parseBody(req);
    const message = update.message;

    if (!message) return send(res, 200, JSON.stringify({ ok: true, ignored: 'no_message' }));

    if (!VEAST_COMMENT_BOT_TOKEN || !VEAST_DISCUSSION_CHAT_ID) {
      return send(res, 200, JSON.stringify({ ok: true, skipped: true, reason: 'comment_bot_not_configured' }));
    }

    if (String(message.chat?.id || '') !== String(VEAST_DISCUSSION_CHAT_ID)) {
      return send(res, 200, JSON.stringify({ ok: true, ignored: 'wrong_chat' }));
    }

    if (!isDiscussionAutoForward(message)) {
      return send(res, 200, JSON.stringify({ ok: true, ignored: 'not_channel_post' }));
    }

    const payload = {
      chat_id: message.chat.id,
      photo: VEAST_COMMENT_PHOTO_URL,
      caption: VEAST_COMMENT_BOT_CAPTION,
      reply_to_message_id: message.message_id,
      allow_sending_without_reply: true,
      reply_markup: {
        inline_keyboard: [
          [{ text: 'сайт VEAST', url: VEAST_COMMENT_SITE_URL }],
        ],
      },
    };

    if (message.message_thread_id) {
      payload.message_thread_id = message.message_thread_id;
    }

    const result = await commentBotApi('sendPhoto', payload);

    if (!result.ok) {
      console.error('VEAST comment bot error:', result.description || result);
      return send(res, 200, JSON.stringify({ ok: false, telegram: result }));
    }

    return send(res, 200, JSON.stringify({ ok: true, sent: true }));
  } catch (error) {
    console.error('VEAST comment bot webhook error:', error.message || error);
    return send(res, 200, JSON.stringify({ ok: false, error: error.message || 'Comment bot webhook failed' }));
  }
}

async function handleSetCommentBotWebhook(req, res, url) {
  if (!isAdminRequest(req, url)) return send(res, 401, JSON.stringify({ error: 'Admin key is required' }));
  const baseUrl = clean(PUBLIC_BASE_URL || url.searchParams.get('baseUrl'));
  if (!baseUrl) {
    return send(res, 400, JSON.stringify({ error: 'PUBLIC_BASE_URL is not configured' }));
  }

  const webhookUrl = `${baseUrl.replace(/\/+$/, '')}/api/telegram/comment-bot`;
  const result = await commentBotApi('setWebhook', { url: webhookUrl });

  return send(res, result.ok ? 200 : 502, JSON.stringify({
    ok: Boolean(result.ok),
    webhookUrl,
    telegram: {
      ok: Boolean(result.ok),
      description: result.description || null,
      errorCode: result.error_code || null,
      httpStatus: result.httpStatus || null,
      skipped: Boolean(result.skipped),
      tokenConfigured: Boolean(VEAST_COMMENT_BOT_TOKEN),
      discussionChatConfigured: Boolean(VEAST_DISCUSSION_CHAT_ID),
    },
  }));
}

async function answerTelegramCallback(callbackQueryId, text = '') {
  if (!callbackQueryId) return { ok: false, skipped: true, description: 'No callback query id' };
  return telegramApi('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
    show_alert: false,
  });
}

function getTelegramMenuKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '📦 Статус заказа', callback_data: 'veast_status' }],
      [{ text: '🔗 Привязать заказ', callback_data: 'veast_link_help' }],
      [
        { text: '💬 Поддержка', url: `https://t.me/${SUPPORT_TELEGRAM_USERNAME}` },
        { text: '🛒 Сайт VEAST', url: PUBLIC_BASE_URL },
      ],
    ],
  };
}

function buildTelegramMenuMessage() {
  return [
    'VEAST',
    '',
    'Добро пожаловать в бот заказов VEAST.',
    '',
    'Здесь можно проверить статус заказа, посмотреть доставку и быстро перейти в поддержку.',
    '',
    'Если ссылка с сайта не открылась, отправьте сюда код привязки со страницы подтверждения заказа.',
  ].join('\n');
}

function buildTelegramLinkHelpMessage() {
  return [
    'VEAST',
    '',
    'Как привязать заказ:',
    '',
    '1. Откройте страницу подтверждения заказа.',
    '2. Скопируйте код привязки.',
    '3. Отправьте код сюда одним сообщением.',
    '',
    'После привязки кнопка «📦 Статус заказа» покажет актуальный статус, пункт выдачи и трек-номер.',
  ].join('\n');
}

async function sendTelegramMenu(chatId, text = buildTelegramMenuMessage()) {
  const keyboard = getTelegramMenuKeyboard();
  const bannerResult = await sendTelegramPhoto(chatId, VEAST_BOT_BANNER_URL, text, { reply_markup: keyboard });
  if (bannerResult?.ok) return bannerResult;
  return sendTelegramMessage(chatId, text, { reply_markup: keyboard });
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
      'Откройте страницу подтверждения заказа и отправьте боту код привязки.',
    ].join('\n');
  }

  return linked.map((order) => buildTelegramStatusMessage(order, `Текущий статус заказа ${order.id}:`)).join('\n\n────────────\n\n');
}

async function handleTelegramCallback(update) {
  const callback = update.callback_query;
  const data = clean(callback?.data || '');
  const chatId = callback?.message?.chat?.id ? String(callback.message.chat.id) : '';
  const callbackId = callback?.id || '';

  if (!chatId) return { ok: true };

  if (data === 'veast_status') {
    await answerTelegramCallback(callbackId, 'Проверяю статус заказа');
    const linkedOrders = await getOrdersByTelegramChatId(chatId);
    await sendTelegramMessage(chatId, buildOrdersStatusMessage(linkedOrders), { reply_markup: getTelegramMenuKeyboard() });
    return { ok: true, action: 'status' };
  }

  if (data === 'veast_link_help') {
    await answerTelegramCallback(callbackId, 'Инструкция по привязке заказа');
    await sendTelegramMessage(chatId, buildTelegramLinkHelpMessage(), { reply_markup: getTelegramMenuKeyboard() });
    return { ok: true, action: 'link_help' };
  }

  await answerTelegramCallback(callbackId, 'VEAST');
  await sendTelegramMenu(chatId);
  return { ok: true, action: 'menu' };
}

async function handleTelegramWebhook(req, res) {
  try {
    const update = await parseBody(req);

    if (update.callback_query) {
      const result = await handleTelegramCallback(update);
      return send(res, 200, JSON.stringify(result));
    }

    const message = update.message || update.edited_message;
    const text = clean(message?.text || '');
    const chatId = message?.chat?.id ? String(message.chat.id) : '';

    if (!chatId) return send(res, 200, JSON.stringify({ ok: true }));

    if (text.startsWith('/start')) {
      const payload = clean(text.split(/\s+/)[1] || '');
      if (payload) {
        const result = await linkOrderToTelegramByCode(payload, chatId);
        if (result.linked) {
          await sendTelegramMessage(chatId, buildLinkedOrderMessage(result.order), { reply_markup: getTelegramMenuKeyboard() });
          return send(res, 200, JSON.stringify({ ok: true, linked: true, orderId: result.order.id }));
        }
        if (result.reason === 'already_linked') {
          await sendTelegramMessage(chatId, [
            'VEAST',
            '',
            'Этот заказ уже привязан к другому Telegram.',
            `Если нужна помощь, напишите в поддержку @${SUPPORT_TELEGRAM_USERNAME}.`,
          ].join('\n'), { reply_markup: getTelegramMenuKeyboard() });
          return send(res, 200, JSON.stringify({ ok: true, linked: false, reason: result.reason }));
        }
      }

      await sendTelegramMenu(chatId);
      return send(res, 200, JSON.stringify({ ok: true, linked: false, menu: true }));
    }

    if (text.startsWith('/menu')) {
      await sendTelegramMenu(chatId);
      return send(res, 200, JSON.stringify({ ok: true, menu: true }));
    }

    if (text.startsWith('/status')) {
      const linkedOrders = await getOrdersByTelegramChatId(chatId);
      await sendTelegramMessage(chatId, buildOrdersStatusMessage(linkedOrders), { reply_markup: getTelegramMenuKeyboard() });
      return send(res, 200, JSON.stringify({ ok: true }));
    }

    if (text.startsWith('/help')) {
      await sendTelegramMessage(chatId, [
        'VEAST',
        '',
        'Команды бота:',
        '/menu — открыть меню',
        '/status — посмотреть текущий статус заказа',
        '/help — помощь',
        '',
        'Для привязки заказа отправьте сюда код со страницы подтверждения заказа.',
        `Поддержка: @${SUPPORT_TELEGRAM_USERNAME}`,
      ].join('\n'), { reply_markup: getTelegramMenuKeyboard() });
      return send(res, 200, JSON.stringify({ ok: true }));
    }

    const linkResult = await linkOrderToTelegramByCode(text, chatId);
    if (linkResult.linked) {
      await sendTelegramMessage(chatId, buildLinkedOrderMessage(linkResult.order), { reply_markup: getTelegramMenuKeyboard() });
      return send(res, 200, JSON.stringify({ ok: true, linked: true, orderId: linkResult.order.id }));
    }

    if (linkResult.reason === 'already_linked') {
      await sendTelegramMessage(chatId, [
        'VEAST',
        '',
        'Этот заказ уже привязан к другому Telegram.',
        `Если нужна помощь, напишите в поддержку @${SUPPORT_TELEGRAM_USERNAME}.`,
      ].join('\n'), { reply_markup: getTelegramMenuKeyboard() });
      return send(res, 200, JSON.stringify({ ok: true, linked: false, reason: linkResult.reason }));
    }

    await sendTelegramMenu(chatId, [
      'VEAST',
      '',
      'Я показываю статусы заказов VEAST.',
      'Выберите действие в меню или отправьте код привязки заказа.',
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
  const commands = await telegramApi('setMyCommands', {
    commands: [
      { command: 'start', description: 'Открыть бот VEAST' },
      { command: 'menu', description: 'Открыть меню' },
      { command: 'status', description: 'Статус заказа' },
      { command: 'help', description: 'Помощь' },
    ],
  });

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
    commands: {
      ok: Boolean(commands.ok),
      description: commands.description || null,
    },
  }));
}

async function handleOrderStatusUpdate(req, res, url, orderId) {
  if (!isAdminRequest(req, url)) return send(res, 401, JSON.stringify({ error: 'Admin key is required' }));

  try {
    const body = await parseBody(req);
    const order = await updateOrderStatusInDatabase(orderId, body);
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
    return send(res, 200, JSON.stringify({ ok: true, project: 'VEAST', database: getDatabaseMode(), persistent: Boolean(DATABASE_URL), timestamp: new Date().toISOString() }));
  }

  if (url.pathname === '/api/stats' && req.method === 'GET') {
    const feedbackStats = await getFeedbackStats();
    const orderStats = await getDatabaseStats();
    return send(res, 200, JSON.stringify({ ok: true, orders: orderStats.orders, feedback: feedbackStats.total, feedbackNew: feedbackStats.new, totalRevenue: orderStats.totalRevenue, database: orderStats.database, persistent: orderStats.persistent }));
  }

  if (url.pathname === '/api/products' && req.method === 'GET') {
    const categories = await getProductCategories();
    const products = await getCatalogProducts();
    return send(res, 200, JSON.stringify({ categories, products }));
  }

  if (url.pathname.startsWith('/api/products/') && req.method === 'GET') {
    const id = decodeURIComponent(url.pathname.replace('/api/products/', ''));
    const products = await getCatalogProducts();
    const product = products.find((item) => item.id === id || item.slug === id);
    if (!product) return send(res, 404, JSON.stringify({ error: 'Product not found' }));
    return send(res, 200, JSON.stringify(product));
  }


  if (url.pathname === '/api/admin/products' && req.method === 'GET') {
    if (!isAdminRequest(req, url)) return send(res, 401, JSON.stringify({ error: 'Admin key is required' }));
    const data = await getAdminProducts();
    return send(res, 200, JSON.stringify(data));
  }

  if (url.pathname === '/api/admin/products' && req.method === 'POST') {
    if (!isAdminRequest(req, url)) return send(res, 401, JSON.stringify({ error: 'Admin key is required' }));
    try {
      const body = await parseBody(req);
      const error = validateAdminProduct(body);
      if (error) return send(res, 400, JSON.stringify({ error }));
      const product = await createAdminProduct(body);
      return send(res, 201, JSON.stringify({ ok: true, product }));
    } catch (error) {
      return send(res, 400, JSON.stringify({ error: error.message || 'Не удалось сохранить товар' }));
    }
  }

  const adminProductRoute = url.pathname.match(/^\/api\/admin\/products\/([^/]+)$/);
  if (adminProductRoute && req.method === 'PATCH') {
    if (!isAdminRequest(req, url)) return send(res, 401, JSON.stringify({ error: 'Admin key is required' }));
    try {
      const body = await parseBody(req);
      const error = validateAdminProduct(body);
      if (error) return send(res, 400, JSON.stringify({ error }));
      const product = await updateAdminProduct(decodeURIComponent(adminProductRoute[1]), body);
      if (!product) return send(res, 404, JSON.stringify({ error: 'Товар не найден' }));
      return send(res, 200, JSON.stringify({ ok: true, product }));
    } catch (error) {
      return send(res, 400, JSON.stringify({ error: error.message || 'Не удалось обновить товар' }));
    }
  }

  if (adminProductRoute && req.method === 'DELETE') {
    if (!isAdminRequest(req, url)) return send(res, 401, JSON.stringify({ error: 'Admin key is required' }));
    const ok = await deleteAdminProduct(decodeURIComponent(adminProductRoute[1]));
    if (!ok) return send(res, 404, JSON.stringify({ error: 'Товар не найден' }));
    return send(res, 200, JSON.stringify({ ok: true }));
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

  if (url.pathname === '/api/telegram/comment-bot' && req.method === 'POST') {
    return handleCommentBotWebhook(req, res);
  }

  if (url.pathname === '/api/telegram/comment-set-webhook' && (req.method === 'GET' || req.method === 'POST')) {
    return handleSetCommentBotWebhook(req, res, url);
  }

  if (url.pathname === '/api/telegram/comment-webhook-info' && (req.method === 'GET' || req.method === 'POST')) {
    if (!isAdminRequest(req, url)) return send(res, 401, JSON.stringify({ error: 'Admin key is required' }));
    const result = await commentBotApi('getWebhookInfo', {});
    return send(res, result.ok ? 200 : 502, JSON.stringify({ ok: Boolean(result.ok), telegram: result }));
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
    const order = await getOrderFromDatabase(id);
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
    return send(res, 200, JSON.stringify((await getAllOrdersFromDatabase()).map(publicOrder)));
  }

  if (url.pathname.startsWith('/api/orders/') && req.method === 'GET') {
    const id = decodeURIComponent(url.pathname.replace('/api/orders/', ''));
    const order = await getOrderFromDatabase(id);
    if (!order) return send(res, 404, JSON.stringify({ error: 'Order not found' }));
    return send(res, 200, JSON.stringify(order));
  }

  if (url.pathname === '/api/orders' && req.method === 'POST') {
    try {
      const order = await parseBody(req);
      const error = await validateBusinessOrder(order);
      if (error) return send(res, 400, JSON.stringify({ error }));
      const savedOrder = await saveOrderToDatabase(normalizeOrder(order));
      return send(res, 201, JSON.stringify({ ok: true, order: publicOrder(savedOrder) }));
    } catch {
      return send(res, 400, JSON.stringify({ error: 'Invalid JSON' }));
    }
  }

  if (url.pathname === '/api/feedback' && req.method === 'GET') {
    if (!isAdminRequest(req, url)) return send(res, 401, JSON.stringify({ error: 'Admin key is required' }));
    return send(res, 200, JSON.stringify(await getFeedbackFromDatabase()));
  }

  const feedbackRoute = url.pathname.match(/^\/api\/feedback\/([^/]+)$/);
  if (feedbackRoute && req.method === 'PATCH') {
    if (!isAdminRequest(req, url)) return send(res, 401, JSON.stringify({ error: 'Admin key is required' }));
    try {
      const body = await parseBody(req);
      const updated = await updateFeedbackInDatabase(decodeURIComponent(feedbackRoute[1]), body);
      if (!updated) return send(res, 404, JSON.stringify({ error: 'Feedback message not found' }));
      return send(res, 200, JSON.stringify({ ok: true, feedback: updated }));
    } catch {
      return send(res, 400, JSON.stringify({ error: 'Invalid JSON' }));
    }
  }

  if (url.pathname === '/api/feedback' && req.method === 'POST') {
    try {
      const feedback = await parseBody(req);
      const error = validateFeedback(feedback);
      if (error) return send(res, 400, JSON.stringify({ error }));
      const saved = await saveFeedbackToDatabase(feedback);
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
  const blockedPublicPaths = [
    '/docs/', '/data/', '/README.md', '/RENDER_DEPLOY_GUIDE.md', '/render.yaml', '/package.json', '/pnpm-lock.yaml', '/.env', '/.env.example', '/.gitignore', '/.git/'
  ];
  if (blockedPublicPaths.some((blocked) => pathname === blocked || pathname.startsWith(blocked))) {
    return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
  }
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
  if (url.pathname === '/telegram/comment-bot' && req.method === 'POST') {
    return handleCommentBotWebhook(req, res);
  }
  if (url.pathname.startsWith('/api/')) return handleApi(req, res, url);
  return serveStatic(req, res, url);
});

server.listen(PORT, () => {
  console.log(`VEAST server running: http://localhost:${PORT}`);
});
