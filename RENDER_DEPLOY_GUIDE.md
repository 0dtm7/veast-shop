# Render deploy guide — VEAST v47

## Что изменилось в v47

В v46 заказы перенесены с SQLite-файла на PostgreSQL. Это нужно потому, что на Render Free нельзя подключить Persistent Disk, а обычные файлы сервиса могут обнуляться после redeploy/restart.

Теперь постоянное хранение заказов работает через переменную:

```env
DATABASE_URL=...
```

В v47 также исправлено окно выбора ПВЗ СДЭК: карта и список стали читабельнее, а backend загружает офисы постранично. СДЭК-карта ПВЗ, Telegram-бот, админка заказов и уведомления остаются.

## 1. Создай PostgreSQL на Render

1. В Render нажми **New**.
2. Выбери **PostgreSQL**.
3. Создай базу, например `veast-orders-db`.
4. После создания скопируй **Internal Database URL**.
5. В Web Service `veast-shop-nsdh` открой **Environment**.
6. Добавь переменную:

```env
DATABASE_URL=скопированный_Internal_Database_URL
```

Используй именно Internal Database URL, если база и сайт находятся внутри Render.

## 2. Переменные окружения Web Service

В Render → `veast-shop-nsdh` → **Environment Variables** должны быть:

```env
DATABASE_URL=internal_database_url_из_Render_PostgreSQL

TELEGRAM_BOT_TOKEN=токен_от_BotFather
TELEGRAM_BOT_USERNAME=VEAST_Order_Bot
PUBLIC_BASE_URL=https://veast-shop-nsdh.onrender.com
ADMIN_STATUS_KEY=290729veastshop

CDEK_CLIENT_ID=боевой_идентификатор_СДЭК
CDEK_CLIENT_SECRET=боевой_пароль_СДЭК
CDEK_API_BASE_URL=https://api.cdek.ru/v2
CDEK_FROM_CITY=Москва
CDEK_DEFAULT_LOCATION=Москва
```

Для актуальных ПВЗ по всем городам России нужна рабочая среда СДЭК `https://api.cdek.ru/v2` и боевые ключи. Тестовые ключи из документации работают только с `https://api.edu.cdek.ru/v2` и могут показывать неполный или устаревший список пунктов.

`TELEGRAM_BOT_TOKEN`, `ADMIN_STATUS_KEY`, `DATABASE_URL` и CDEK-ключи нельзя выкладывать в GitHub.

## 3. СДЭК-карта ПВЗ

Checkout использует стабильную карту ПВЗ через API СДЭК и OpenStreetMap/Leaflet. В v47 окно выбора ПВЗ сделано более читабельным: карта и список отображаются в светлой модалке, список справа показывает код, адрес, график и тип пункта. Backend загружает ПВЗ постранично, поэтому крупные города обрабатываются стабильнее.

Для актуальных пунктов выдачи по России нужны боевые ключи СДЭК и рабочая среда:

```env
CDEK_CLIENT_ID=боевой_идентификатор_СДЭК
CDEK_CLIENT_SECRET=боевой_пароль_СДЭК
CDEK_API_BASE_URL=https://api.cdek.ru/v2
```

Тестовые ключи СДЭК из документации можно использовать только для проверки механики. Они должны работать с `https://api.edu.cdek.ru/v2`, но тестовая среда может возвращать неполный или устаревший список ПВЗ.

Ключ Яндекс.Карт больше не нужен.

## 4. Запуск и деплой

Render должен запускать проект командой:

```bash
npm start
```

или:

```bash
node server.js
```

После изменения переменных нажми:

```text
Save, rebuild, and deploy
```

или:

```text
Manual Deploy → Deploy latest commit
```

## 5. Подключение Telegram webhook

После деплоя открой:

```text
https://veast-shop-nsdh.onrender.com/admin-orders.html
```

Введи `ADMIN_STATUS_KEY` и нажми **«Подключить webhook»**.

Webhook будет установлен на:

```text
https://veast-shop-nsdh.onrender.com/api/telegram/webhook
```

## 6. Проверка сценария

1. Оформи заказ на сайте.
2. На checkout выбери ПВЗ СДЭК на карте.
3. После оформления нажми **«Получать статус в Telegram»**.
4. Нажми Start в `@VEAST_Order_Bot`.
5. Открой `admin-orders.html`.
6. Введи админ-ключ.
7. Измени статус заказа.
8. Проверь, что бот отправил сообщение с новым статусом и ПВЗ.
9. Сделай redeploy и проверь, что заказ остался в админке.

## 7. Диагностика

Проверка backend:

```text
https://veast-shop-nsdh.onrender.com/api/health
```

Если всё подключено правильно, там будет:

```json
{
  "database": "postgresql",
  "persistent": true
}
```

Если отображается:

```json
{
  "database": "json-fallback",
  "persistent": false
}
```

значит `DATABASE_URL` не добавлен или не применился после деплоя.
