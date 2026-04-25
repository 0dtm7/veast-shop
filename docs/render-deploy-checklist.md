# Render deploy checklist — VEAST

## Перед загрузкой в GitHub

- [ ] В репозитории есть `package.json`.
- [ ] В репозитории есть `server.js`.
- [ ] В репозитории есть `render.yaml`.
- [ ] Папки `assets`, `data`, `scripts`, `docs` загружены вместе с проектом.
- [ ] Внутри `data/orders.json` находится пустой массив `[]`.
- [ ] Внутри `data/feedback.json` находится пустой массив `[]`.
- [ ] В репозиторий не загружены `node_modules` и `.env`.

## Настройки Render

```text
Build Command: npm install
Start Command: npm start
Health Check Path: /api/health
```

## Проверка сайта

- [ ] `/` открывается.
- [ ] `/catalog.html` открывается.
- [ ] `/product.html?id=vst-eclipse-zip-hoodie` открывается.
- [ ] `/checkout.html` открывается.
- [ ] `/admin-orders.html` открывается.
- [ ] `/api/health` отвечает JSON.
- [ ] `/api/products` возвращает товары.

## После деплоя

1. Открыть ссылку `onrender.com`.
2. Добавить товар в корзину.
3. Перейти в checkout.
4. Отправить тестовый заказ.
5. Открыть `admin-orders.html` и проверить, что заказ появился.
