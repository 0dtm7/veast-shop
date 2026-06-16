# VEAST Mini App v6 — Telegram Desktop profile fallback

Этот патч исправляет две вещи:

1. В Mini App добавлен fallback для получения Telegram-профиля не только из `Telegram.WebApp.initDataUnsafe.user`, но и из сырого `Telegram.WebApp.initData` / `tgWebAppData`.
2. В проект добавлены публичные изображения для отдельного VEAST Store Bot:
   - `assets/bot/veast-store-bot-banner.png`
   - `assets/bot/veast-store-avatar.png`

## Почему на Telegram Desktop мог показываться «Гость VEAST»

На некоторых клиентах Telegram данные пользователя могут не попасть в `initDataUnsafe.user`, хотя сырой `initData` присутствует.

Теперь Mini App проверяет несколько источников:

```text
Telegram.WebApp.initDataUnsafe.user
Telegram.WebApp.initData
window.location.hash → tgWebAppData
window.location.search → tgWebAppData
```

Если пользователь найден в любом из этих источников, профиль в Mini App больше не будет отображаться как «Гость VEAST».

## Почему картинка в приветствии не отображалась

Store Bot отправляет приветственную картинку через переменную:

```text
VEAST_STORE_BOT_BANNER_URL
```

Если URL указывает на файл, которого нет на сайте, Telegram не может загрузить картинку, и backend отправляет обычный текст.

Теперь файл есть в проекте:

```text
https://veast-shop-nsdh.onrender.com/assets/bot/veast-store-bot-banner.png
```

После деплоя эту ссылку нужно открыть в браузере. Если картинка открывается, бот сможет отправлять её в `/start`.

## Что сделать после деплоя

1. Проверить картинку:

```text
https://veast-shop-nsdh.onrender.com/assets/bot/veast-store-bot-banner.png
```

2. В Render Environment оставить:

```text
VEAST_STORE_BOT_BANNER_URL=https://veast-shop-nsdh.onrender.com/assets/bot/veast-store-bot-banner.png
```

3. Переподключить webhook:

```text
https://veast-shop-nsdh.onrender.com/api/telegram/store-set-webhook?key=ADMIN_STATUS_KEY
```

4. В Telegram открыть Store Bot и отправить:

```text
/start
```
