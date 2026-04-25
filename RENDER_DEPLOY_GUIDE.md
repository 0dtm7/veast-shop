# VEAST: деплой на Render

## 1. Подготовка репозитория

1. Распаковать архив.
2. Открыть папку `VEAST_render_ready`.
3. Создать GitHub-репозиторий `veast-shop`.
4. Загрузить в репозиторий содержимое папки `VEAST_render_ready`, а не сам ZIP-архив.

В корне репозитория должны лежать файлы:

```text
package.json
server.js
render.yaml
index.html
catalog.html
checkout.html
data/
assets/
scripts/
styles.css
```

## 2. Настройки Render

На Render выбрать **New → Web Service**, подключить GitHub-репозиторий и указать:

```text
Language: Node
Branch: main
Root Directory: оставить пустым, если package.json лежит в корне репозитория
Build Command: npm install
Start Command: npm start
Health Check Path: /api/health
```

Если в репозитории случайно лежит папка `VEAST_render_ready`, а файлы находятся внутри неё, в поле **Root Directory** нужно написать:

```text
VEAST_render_ready
```

## 3. Проверка после деплоя

После успешного деплоя открыть:

```text
/
/catalog.html
/product.html?id=vst-eclipse-zip-hoodie
/checkout.html
/admin-orders.html
/api/health
/api/products
```

`/api/health` должен вернуть JSON со значением `ok: true`.
