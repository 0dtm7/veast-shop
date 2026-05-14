# Render deploy guide — VEAST + Telegram bot

## 1. Переменные окружения

В Render открой свой Web Service → Environment и добавь:

```env
TELEGRAM_BOT_TOKEN=токен_от_BotFather
TELEGRAM_BOT_USERNAME=VEAST_Order_Bot
PUBLIC_BASE_URL=https://veast-shop-nsdh.onrender.com
ADMIN_STATUS_KEY=любой_секретный_ключ
CDEK_CLIENT_ID=идентификатор_аккаунта_интеграции_СДЭК
CDEK_CLIENT_SECRET=пароль_аккаунта_интеграции_СДЭК
CDEK_FROM_CITY=Москва
CDEK_DEFAULT_LOCATION=Москва
YANDEX_MAPS_API_KEY=ключ_Яндекс_Карт
VEAST_DB_PATH=data/veast.sqlite
```

`TELEGRAM_BOT_TOKEN`, `CDEK_CLIENT_SECRET` и другие секреты нельзя выкладывать в GitHub. SQLite-файл базы тоже не нужно коммитить — он создаётся сервером автоматически.

## 1.1. СДЭК-виджет пунктов выдачи

В checkout подключён официальный виджет СДЭК. Для работы карты на Render нужны переменные `CDEK_CLIENT_ID`, `CDEK_CLIENT_SECRET` и `YANDEX_MAPS_API_KEY`.

Данные СДЭК берутся в личном кабинете СДЭК: раздел **Интеграция** → **Создать ключ**. Ключ Яндекс.Карт нужен для отображения карты; для него обязательно укажи HTTP Referrer своего сайта:

```text
https://veast-shop-nsdh.onrender.com/*
```

После добавления переменных нажми **Save, rebuild, and deploy**.

## 1.2. SQLite mini database

В v43 заказы сохраняются не в `data/orders.json`, а в SQLite mini database. По умолчанию путь такой:

```env
VEAST_DB_PATH=data/veast.sqlite
```

Этого достаточно для демонстрации и защиты. Если нужна более надёжная сохранность между redeploy/restart на Render, подключи Persistent Disk и поменяй путь:

```env
VEAST_DB_PATH=/var/data/veast.sqlite
```

При первом запуске сервер сам создаст таблицы `orders`, `order_items` и `order_status_history`. Если в `data/orders.json` уже были старые заказы, они автоматически перенесутся в SQLite при первом запуске пустой базы.

## 2. Запуск

Render должен запускать проект командой:

```bash
pnpm start
```

или

```bash
node server.js
```

## 3. Подключение Telegram webhook

После деплоя открой:

```text
https://veast-shop-nsdh.onrender.com/admin-orders.html
```

Введи `ADMIN_STATUS_KEY` и нажми кнопку **«Подключить webhook»**.

После этого Telegram будет отправлять сообщения бота на:

```text
https://veast-shop-nsdh.onrender.com/api/telegram/webhook
```

## 4. Проверка сценария

1. Оформи заказ на сайте.
2. На странице подтверждения нажми **«Получать статус в Telegram»**.
3. Нажми Start в боте.
4. Вернись в `admin-orders.html`.
5. Поменяй статус заказа и нажми **«Обновить статус и отправить в Telegram»**.
6. Проверь, что бот прислал уведомление.
