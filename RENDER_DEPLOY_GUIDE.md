# VEAST Render deploy

1. Залей актуальные файлы проекта в GitHub.
2. В Render подключи Web Service к репозиторию.
3. Укажи команды:

```bash
npm install
npm start
```

4. Добавь переменные окружения:

```env
DATABASE_URL=postgresql://...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_BOT_USERNAME=VEAST_Order_Bot
SUPPORT_TELEGRAM_USERNAME=veast_support
PUBLIC_BASE_URL=https://veast-shop-nsdh.onrender.com
ADMIN_STATUS_KEY=...
CDEK_CLIENT_ID=...
CDEK_CLIENT_SECRET=...
CDEK_API_BASE_URL=https://api.edu.cdek.ru/v2
CDEK_FROM_CITY=Москва
CDEK_DEFAULT_LOCATION=Москва
```

5. Нажми **Manual Deploy → Deploy latest commit**.
6. После деплоя открой `/admin-orders.html`, введи `ADMIN_STATUS_KEY` и подключи Telegram. При подключении обновятся webhook и команды бота `/start`, `/menu`, `/status`, `/help`.

Заказы хранятся в PostgreSQL через `DATABASE_URL`, поэтому не пропадают после нового деплоя.
