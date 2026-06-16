# VEAST Telegram Store Bot v5

Этот патч добавляет поддержку отдельного публичного бота магазина VEAST Store.

## Зачем отдельный бот

Рекомендуемая схема:

```text
VEAST Telegram channel — посты, дропы, визуал
VEAST Store Bot — публичный бот-магазин и Mini App
VEAST Order Bot — сервисные уведомления о заказах
VEAST Comment Bot — автоматический комментарий под постами
```

Так магазин выглядит как отдельный продукт бренда, а служебные боты не смешиваются с витриной.

## Что добавлено в backend

Новые переменные окружения:

```text
VEAST_STORE_BOT_TOKEN=
VEAST_STORE_BOT_USERNAME=VEASTStoreBot
VEAST_STORE_MINI_APP_URL=https://veast-shop-nsdh.onrender.com/tg
VEAST_STORE_CHANNEL_URL=https://t.me/veastshop
VEAST_STORE_BOT_BANNER_URL=https://veast-shop-nsdh.onrender.com/assets/bot/veast-store-bot-banner.png
```

Новые API endpoints:

```text
POST /api/telegram/store-webhook
GET  /api/telegram/store-set-webhook?key=ADMIN_STATUS_KEY
GET  /api/telegram/store-webhook-info?key=ADMIN_STATUS_KEY
```

`store-set-webhook` делает сразу три вещи:

```text
1. Подключает webhook отдельного Store Bot
2. Ставит команды /start /catalog /menu /help
3. Ставит кнопку меню бота “Открыть VEAST” → /tg
```

## Как создать отдельного бота

1. Открыть Telegram.
2. Найти `@BotFather`.
3. Отправить команду:

```text
/newbot
```

4. Название:

```text
VEAST Store
```

5. Username, например:

```text
VEASTStoreBot
```

Если username занят, попробуйте:

```text
VEASTshop_bot
vst_store_bot
veast_app_bot
```

6. Скопировать token от BotFather.

## Что добавить в Render

Открыть:

```text
Render → veast-shop-nsdh → Environment
```

Добавить:

```text
VEAST_STORE_BOT_TOKEN=токен_от_BotFather
VEAST_STORE_BOT_USERNAME=username_бота_без_@
VEAST_STORE_MINI_APP_URL=https://veast-shop-nsdh.onrender.com/tg
VEAST_STORE_CHANNEL_URL=https://t.me/veastshop
```

Потом:

```text
Save Changes
Manual Deploy → Deploy latest commit
```

## Как подключить webhook

После деплоя открыть в браузере:

```text
https://veast-shop-nsdh.onrender.com/api/telegram/store-set-webhook?key=ADMIN_STATUS_KEY
```

Вместо `ADMIN_STATUS_KEY` подставить реальный admin key из Render.

Если всё хорошо, ответ будет примерно:

```json
{
  "ok": true,
  "webhookUrl": "https://veast-shop-nsdh.onrender.com/api/telegram/store-webhook",
  "miniAppUrl": "https://veast-shop-nsdh.onrender.com/tg"
}
```

## Как настроить Main Mini App в BotFather

В `@BotFather`:

```text
/mybots
→ выбрать VEAST Store Bot
→ Bot Settings
→ Configure Mini App / Main Mini App
→ URL: https://veast-shop-nsdh.onrender.com/tg
```

Также можно настроить Menu Button:

```text
Bot Settings
→ Menu Button
→ Открыть VEAST
→ https://veast-shop-nsdh.onrender.com/tg
```

## Deep links на товары

После подключения отдельного бота можно использовать ссылки из постов канала:

```text
https://t.me/USERNAME_БОТА?startapp=vst-eclipse-zip-hoodie
```

Mini App уже умеет брать `startapp` / `product` и открывать нужную карточку товара.

## Проверка

1. Открыть Store Bot.
2. Нажать `/start`.
3. Должна появиться кнопка `Открыть VEAST Store`.
4. Нажать кнопку.
5. Mini App должен открыться внутри Telegram.
6. Проверить каталог, товар, корзину и оформление заказа.
