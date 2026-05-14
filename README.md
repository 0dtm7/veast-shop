# VEAST

VEAST — fashion e-commerce storefront в эстетике streetwear / Y2K / techwear / chrome.

## Основной функционал

- Главная страница бренда.
- Каталог, карточки товаров, корзина и избранное.
- Оформление заказа с выбором пункта выдачи СДЭК на карте.
- Личный кабинет с заказами текущего устройства.
- Telegram-уведомления о статусе заказа через @VEAST_Order_Bot.
- Внутренняя панель управления заказами: `/admin-orders.html`.
- Хранение заказов в PostgreSQL через `DATABASE_URL`.

## Запуск

```bash
npm install
npm run dev
```

## Переменные окружения

```env
DATABASE_URL=postgresql://...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_BOT_USERNAME=VEAST_Order_Bot
PUBLIC_BASE_URL=https://veast-shop-nsdh.onrender.com
ADMIN_STATUS_KEY=...
CDEK_CLIENT_ID=...
CDEK_CLIENT_SECRET=...
CDEK_API_BASE_URL=https://api.edu.cdek.ru/v2
CDEK_FROM_CITY=Москва
CDEK_DEFAULT_LOCATION=Москва
```

Для production-ключей СДЭК используется `https://api.cdek.ru/v2`.
