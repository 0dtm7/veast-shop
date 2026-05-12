# VEAST — итоговый комплексный проект

VEAST — индивидуальный итоговый комплексный проект по дисциплинам МДК.08.01, МДК.08.02 и МДК.09.01. Формат проекта — коммерческий интернет-магазин одежды в эстетике streetwear / Y2K / techwear / chrome.

Главное измеримое целевое действие: пользователь выбирает товар в каталоге, открывает карточку товара, добавляет товар в корзину, заполняет checkout-форму и получает подтверждение заказа. При запуске через Node.js заказ проходит серверную валидацию и сохраняется в `data/orders.json`.

## Запуск

```bash
npm install -g pnpm
pnpm install
pnpm dev
```

После запуска открыть:

```text
http://localhost:3000
```

## Главные страницы для проверки

- `http://localhost:3000/`
- `http://localhost:3000/catalog.html`
- `http://localhost:3000/product.html?id=vst-eclipse-zip-hoodie`
- `http://localhost:3000/cart.html`
- `http://localhost:3000/checkout.html`
- `http://localhost:3000/thanks.html`
- `http://localhost:3000/admin-orders.html`
- `http://localhost:3000/project.html`
- `http://localhost:3000/prototype.html`

## Что реализовано

- Главная страница с коммерческим позиционированием и CTA.
- Drop Story и объяснение VEAST ORBIT DROP.
- Каталог товаров с категориями, поиском, фильтрами по цене/размеру/цвету/наличию/sale и сортировкой.
- Карточки товаров VEAST: название, цена, категория, размеры, статус, материал, описание, изображения, бейджи.
- Карточка товара с галереей, выбором размера, составом, размерной сеткой, доставкой, возвратом, блоком «С чем носить» и похожими товарами.
- Корзина с количеством, удалением, итоговой суммой, пустым состоянием и переходом к оформлению.
- Checkout-форма с клиентской валидацией, согласием с политикой и отправкой заказа в backend API.
- Страница подтверждения заказа.
- Личный кабинет с историей заказов.
- Избранное.
- Контакты и форма обратной связи.
- Оферта, пользовательское соглашение и политика конфиденциальности.
- Страница проекта / дизайн-документ.
- Страница `admin-orders.html` для демонстрации backend-заказов, управления статусами и отправки Telegram-уведомлений.
- Telegram-бот `@VEAST_Order_Bot`: привязка заказа через кнопку на странице подтверждения, команда `/status`, webhook и уведомления о статусе доставки.
- Backend API на Node.js без внешних зависимостей.
- Telegram-канал VEAST: https://t.me/veastshop

## Backend API

- `GET /api/health` — проверка сервера.
- `GET /api/stats` — статистика заказов и обращений.
- `GET /api/products` — список товаров и категорий.
- `GET /api/products/:id` — конкретный товар.
- `POST /api/orders` — создание заказа.
- `GET /api/orders` — список сохранённых заказов.
- `GET /api/orders/:id` — конкретный заказ.
- `GET /api/orders/:id/status` — публичный статус заказа.
- `POST /api/orders/:id/status` — обновление статуса заказа администратором.
- `POST /api/telegram/webhook` — webhook для Telegram-бота.
- `GET/POST /api/telegram/set-webhook` — подключение Telegram webhook через admin key.
- `POST /api/feedback` — сохранение обращения из формы контактов.


## Telegram-статусы заказов

В проект добавлен первый практичный вариант Telegram-интеграции: статусы доставки обновляются вручную через `admin-orders.html`, а бот автоматически отправляет сообщение клиенту.

Сценарий:

1. Пользователь оформляет заказ на сайте.
2. Backend сохраняет заказ в `data/orders.json` и создаёт `telegramLinkToken`.
3. На странице `thanks.html` появляется кнопка **«Получать статус в Telegram»**.
4. Пользователь открывает `@VEAST_Order_Bot`, заказ привязывается к его Telegram chat id.
5. Администратор открывает `admin-orders.html`, меняет статус, службу доставки, трек-номер и комментарий.
6. Backend сохраняет историю статусов и отправляет клиенту уведомление в Telegram.

Команды бота:

```text
/start — привязать заказ по ссылке
/status — посмотреть текущий статус заказа
/help — помощь
```

Статусы:

```text
created — заказ создан
packed — заказ собран
shipped — передан в доставку
in_transit — в пути
ready_for_pickup — ожидает получения
delivered — заказ получен
```

Переменные окружения для локального запуска и Render:

```env
TELEGRAM_BOT_TOKEN=токен_от_BotFather
TELEGRAM_BOT_USERNAME=VEAST_Order_Bot
PUBLIC_BASE_URL=https://veast-shop-nsdh.onrender.com
ADMIN_STATUS_KEY=любой_секретный_ключ
```

Локально, если `ADMIN_STATUS_KEY` не задан, работает демо-ключ:

```text
veast-admin-demo
```

После деплоя на Render нужно открыть:

```text
https://veast-shop-nsdh.onrender.com/admin-orders.html
```

Ввести `ADMIN_STATUS_KEY` и нажать **«Подключить webhook»**. Это вызовет endpoint `/api/telegram/set-webhook` и подключит Telegram к сайту.

## Что показывать на защите

1. Главная → каталог → карточка товара → корзина → оформление заказа → подтверждение.
2. Страница `admin-orders.html`, где отображаются заказы из backend API.
3. Файл `data/orders.json`, в котором появляется сохранённый заказ.
4. Страница `project.html`, где собрана логика проекта под критерии итоговой работы.
5. Папка `docs/`, где лежат дизайн-документ, карта сайта, план тестирования, план защиты и проверка соответствия PDF.

## Документация под PDF-задание

- `docs/design-document.md` — основной дизайн-документ по 18 пунктам.
- `docs/sitemap.md` — карта сайта и структура.
- `docs/paper-prototype.md` — описание бумажного проектирования.
- `docs/paper-prototype/` — готовые листы бумажного прототипа и коллаж пользовательского пути.
- `prototype.html` — кликабельный HTML-прототип, аналог Figma.
- `docs/interactive-prototype.md` — структура Figma-прототипа и ссылка: https://www.figma.com/design/u3CLNOluVqsUsrbXidVjXQ/Untitled?node-id=1-15&t=k76jAOBQJ0oYwSoI-1.
- `docs/interactive-prototype-link.md` — ссылка на Figma и резервная инструкция по локальному прототипу.
- `docs/testing-plan.md` — план тестирования.
- `docs/usability-testing-report.md` — таблица для результатов 5 пользователей.
- `docs/developer-diary.md` — дневник разработки.
- `docs/moodle-diary-posts.md` — готовые записи для Moodle.
- `docs/moodle-diary-ready-to-post.md` — расширенные записи, которые можно копировать в форум Moodle.
- `docs/defense-plan.md` — сценарий защиты.
- `docs/pdf-requirements-audit.md` — проверка соответствия требованиям PDF.

## Что обязательно приложить вне архива сайта

Для полной сдачи по PDF нужно не только показать сайт, но и приложить процесс проектирования:

- реальные записи в Moodle;
- фотографии бумажных прототипов и коллажа пользовательского пути;
- ссылку на Figma с кликабельным сценарием: https://www.figma.com/design/u3CLNOluVqsUsrbXidVjXQ/Untitled?node-id=1-15&t=k76jAOBQJ0oYwSoI-1;
- результаты юзабилити-тестирования минимум 5 человек;
- список исправлений после тестирования.

## Важное замечание

В PDF для интернет-магазина отдельно указано сравнение товаров. В текущей версии VEAST сравнение убрано как лишняя функция для небольшого fashion-дропа. Если преподаватель будет проверять пункт буквально, compare-страницу лучше вернуть перед финальной сдачей.


## Что добавлено для Moodle / бумаги / прототипа

- Готовые записи для форума Moodle: `docs/moodle-diary-ready-to-post.md`.
- Бумажные прототипы на миллиметровой сетке: `docs/paper-prototype/*.png`.
- Коллаж пользовательского пути: `docs/paper-prototype/09-user-flow-collage.png`.
- Кликабельный прототип-аналог Figma: `prototype.html`.

Если преподаватель требует именно физические фото бумажного прототипа, распечатай или перерисуй листы из `docs/paper-prototype/` на миллиметровой бумаге, разложи путь пользователя и сфотографируй.

## Figma / интерактивный прототип

В проект добавлены материалы для прототипа:

- локальный прототип: `prototype.html`;
- Figma-ready файл: `figma/VEAST_figma_import.svg`;
- инструкция: `figma/README_FIGMA_IMPORT.md` и `docs/interactive-prototype-link.md`.

Настоящая Figma-ссылка уже добавлена: https://www.figma.com/design/u3CLNOluVqsUsrbXidVjXQ/Untitled?node-id=1-15&t=k76jAOBQJ0oYwSoI-1. SVG-файл оставлен как резервная заготовка для импорта.


## v39 Render-ready Telegram setup

В этой версии `PUBLIC_BASE_URL` уже настроен под `https://veast-shop-nsdh.onrender.com`. Секреты не зашиты в код: `TELEGRAM_BOT_TOKEN` и `ADMIN_STATUS_KEY` нужно добавить только в Render Environment Variables.


## Telegram order status privacy fix

- `/api/orders` теперь доступен только с `ADMIN_STATUS_KEY`, чтобы обычные посетители не видели чужие заказы.
- `account.html` показывает только заказы, оформленные в текущем браузере.
- Telegram-привязка закрепляет заказ за конкретным `chat_id`; другой Telegram не может перепривязать уже связанный заказ.
- В футере сайта добавлена ссылка на `admin-orders.html`; сама админка защищена ключом администратора.


## v41 — Telegram webhook fix

- Telegram API requests now use Node HTTPS with IPv4 preference instead of global fetch.
- `/api/telegram/set-webhook` now returns a clearer error if Render cannot reach Telegram or the bot token is wrong.
- Keep `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `PUBLIC_BASE_URL`, and `ADMIN_STATUS_KEY` only in Render Environment Variables.
