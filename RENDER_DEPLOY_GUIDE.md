# Render deploy guide — VEAST + Telegram bot

## 1. Переменные окружения

В Render открой свой Web Service → Environment и добавь:

```env
TELEGRAM_BOT_TOKEN=токен_от_BotFather
TELEGRAM_BOT_USERNAME=VEAST_Order_Bot
PUBLIC_BASE_URL=https://veast-shop-nsdh.onrender.com
ADMIN_STATUS_KEY=любой_секретный_ключ
```

`TELEGRAM_BOT_TOKEN` нельзя выкладывать в GitHub.

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
