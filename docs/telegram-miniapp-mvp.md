# VEAST Telegram Mini App MVP

Добавлен первый этап Telegram Mini App для VEAST.

## Что появилось

- `/tg` и `/tg.html` — отдельная мобильная mini-app страница.
- `assets/tg.css` — отдельный тёмный VEAST-интерфейс под Telegram.
- `assets/tg.js` — каталог, избранное, корзина и оформление заказа внутри Telegram.
- Mini App использует существующие API:
  - `GET /api/products`
  - `POST /api/orders`
- Заказы продолжают сохраняться в текущую базу Neon/PostgreSQL.
- `/api/health` теперь отвечает и на `HEAD`, чтобы мониторинг не ловил лишние ошибки.

## Как подключить в BotFather

1. Открыть `@BotFather`.
2. Выбрать VEAST-бота.
3. Перейти в `Bot Settings` → `Menu Button`.
4. Указать URL:

```text
https://veast-shop-nsdh.onrender.com/tg
```

5. Текст кнопки:

```text
VEAST
```

## Проверка

После деплоя открыть:

```text
https://veast-shop-nsdh.onrender.com/tg
```

Проверить:

1. Загружается каталог.
2. Товар открывается в нижней карточке.
3. Товар добавляется в bag.
4. Оформляется тестовый заказ.
5. Заказ появляется в `admin-orders.html`.

## Следующий этап

- Проверка `initData` на backend через `TELEGRAM_BOT_TOKEN`.
- История заказов внутри Mini App.
- Waitlist для новых дропов.
- Deep links из постов канала сразу на карточку товара.
