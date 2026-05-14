# Render deploy guide — VEAST v46

## Что изменилось в v46

В v46 заказы перенесены с SQLite-файла на PostgreSQL. Это нужно потому, что на Render Free нельзя подключить Persistent Disk, а обычные файлы сервиса могут обнуляться после redeploy/restart.

Теперь постоянное хранение заказов работает через переменную:

```env
DATABASE_URL=...
```

СДЭК-карта ПВЗ, Telegram-бот, админка заказов и уведомления остаются.

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

CDEK_CLIENT_ID=wqGwiQx0gg8mLtiEKsUinjVSICCjtTEP
CDEK_CLIENT_SECRET=RmAmgvSgSl1yirlz9QupbzOJVqhCxcP5
CDEK_API_BASE_URL=https://api.edu.cdek.ru/v2
CDEK_FROM_CITY=Москва
CDEK_DEFAULT_LOCATION=Москва
```

`TELEGRAM_BOT_TOKEN`, `ADMIN_STATUS_KEY`, `DATABASE_URL` и CDEK-ключи нельзя выкладывать в GitHub.

## 3. СДЭК-карта ПВЗ

Checkout использует стабильную карту ПВЗ через API СДЭК и OpenStreetMap/Leaflet.

Для теста можно использовать тестовые ключи СДЭК из документации:

```env
CDEK_CLIENT_ID=wqGwiQx0gg8mLtiEKsUinjVSICCjtTEP
CDEK_CLIENT_SECRET=RmAmgvSgSl1yirlz9QupbzOJVqhCxcP5
CDEK_API_BASE_URL=https://api.edu.cdek.ru/v2
```

Когда будет боевой договор СДЭК, поменяй на боевые ключи и URL:

```env
CDEK_API_BASE_URL=https://api.cdek.ru/v2
```

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
