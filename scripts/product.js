import { addToCart, escapeHtml, formatPrice, getProductById, initCommon, productCard, products } from '../app.js';

initCommon('catalog');

const params = new URLSearchParams(location.search);
const productId = params.get('id') || 'vst-eclipse-zip-hoodie';
const product = getProductById(productId);
const container = document.getElementById('productPage');

if (!product) {
  container.innerHTML = '<div class="empty-state"><h1>Товар не найден</h1><p>Проверь идентификатор товара или вернись в каталог.</p><a class="button button-primary" href="catalog.html">В каталог</a></div>';
} else {
  const galleryItems = [product.image, product.imageAlt, ...product.gallery].filter(Boolean);
  const galleryLabels = product.galleryLabels || ['Вид спереди', 'Вид со спины', 'Деталь логотипа', 'Деталь графики', 'Товар отдельно', 'Деталь'];
  const related = products.filter((item) => item.id !== product.id && item.category === product.category).slice(0, 4);
  const wearWithProducts = (product.wearWith || []).map((id) => getProductById(id)).filter((item) => item && item.id !== product.id).slice(0, 3);
  const featureTagsHtml = (product.featureTags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
  const relatedMarkup = related.length
    ? related.map(productCard).join('')
    : '<div class="empty-state"><h3>Похожие товары появятся здесь</h3><p>Сейчас достаточно открыть каталог и посмотреть весь дроп.</p></div>';
  const wearWithMarkup = wearWithProducts.length
    ? wearWithProducts.map((item) => `
        <article class="style-card">
          <a class="style-card-media" href="product.html?id=${item.id}">
            <img src="${item.cardImage || item.image}" alt="${escapeHtml(item.title)}" loading="lazy" />
          </a>
          <div class="style-card-body">
            <p class="eyebrow">${escapeHtml(item.categoryTitle)}</p>
            <a class="style-card-title" href="product.html?id=${item.id}">${escapeHtml(item.title)}</a>
            <p>${escapeHtml(item.description)}</p>
            <div class="style-card-footer">
              <strong>${formatPrice(item.price)}</strong>
              <a class="button button-ghost" href="product.html?id=${item.id}">Открыть</a>
            </div>
          </div>
        </article>
      `).join('')
    : '<div class="empty-state"><h3>Подборка образа появится здесь</h3><p>Пока можно сочетать товар с любыми позициями Orbit Drop.</p></div>';

  container.innerHTML = `
    <div class="breadcrumbs">
      <a href="index.html">Главная</a>
      <span>/</span>
      <a href="catalog.html">Каталог</a>
      <span>/</span>
      <span>${product.title}</span>
    </div>

    <section class="product-page-layout enhanced-product">
      <div class="product-gallery-block">
        <div class="gallery-main">
          <img id="galleryMain" src="${product.image}" alt="${product.title}" />
          <span class="gallery-label">${product.collection}</span>
          <span class="gallery-zoom-hint">фото / деталь</span>
        </div>
        <div class="gallery-thumbs">
          ${galleryItems.map((image, index) => `
            <button class="${index === 0 ? 'active' : ''}" type="button" data-thumb="${image}" data-label="${galleryLabels[index] || 'Изображение'}">
              <img src="${image}" alt="${product.title} — миниатюра ${index + 1}" loading="lazy" />
              <span>${galleryLabels[index] || 'Изображение'}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <aside class="product-sidebar product-buybox">
        <p class="eyebrow">${product.collection}</p>
        <h1>${product.title}</h1>
        <p class="hero-copy">${product.description}</p>
        <div class="product-inline-tags" aria-label="Теги товара">
          ${featureTagsHtml}
        </div>
        <div class="product-kpis">
          <div><span>Цена</span><strong>${formatPrice(product.price)}</strong></div>
          <div><span>Цвет</span><strong>${product.colorTitle}</strong></div>
          <div><span>Наличие</span><strong>${product.status}</strong></div>
        </div>

        <div class="option-row">
          <label>Размер</label>
          <div class="size-options" id="sizeOptions">
            ${product.sizes.map((size, index) => `<button type="button" class="${index === 0 ? 'active' : ''}" data-size="${size}">${size}</button>`).join('')}
          </div>
        </div>

        <div class="option-row">
          <label>Количество</label>
          <input id="quantityInput" type="number" min="1" max="10" value="1" />
        </div>

        <div class="card-actions">
          <button class="button button-primary product-main-cta" type="button" id="addToCartPrimary">Добавить в корзину</button>
          <a class="square-button" href="cart.html" aria-label="Открыть корзину" title="Открыть корзину"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.2 8.4h11.6l-.8 10.1a2 2 0 0 1-2 1.8H9a2 2 0 0 1-2-1.8L6.2 8.4Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 8.4V7a3 3 0 0 1 6 0v1.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></a>
          <a class="square-button" href="checkout.html" aria-label="Перейти к оформлению" title="Перейти к оформлению"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="m13 7 5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
        </div>

        <div class="mini-service-list">
          <span>Материал: ${product.material}</span>
          <span>Посадка: ${product.fit}</span>
          <span>Уход: ${product.care}</span>
          <span>Размерная сетка: ${product.measurements}</span>
        </div>
      </aside>
    </section>

    <section class="section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">подбор образа</p>
          <h2>С чем носить</h2>
        </div>
      </div>
      <div class="style-intro">
        <p>Блок показывает товар как часть готового образа. Для ${product.title} мы рекомендуем позиции из того же VEAST Orbit Drop, чтобы пользователь сразу видел удачное сочетание и быстрее принимал решение о покупке.</p>
      </div>
      <div class="styling-grid">
        ${wearWithMarkup}
      </div>
    </section>

    <section class="section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">детали товара</p>
          <h2>Что важно перед покупкой</h2>
        </div>
      </div>
      <div class="product-info-panels">
        <article class="panel-card"><h3>Материал и тактильность</h3><p>${product.material}</p><p>Вещь поддерживает общую идею Orbit Drop: washed-фактура, холодная палитра и clean streetwear-подача.</p></article>
        <article class="panel-card"><h3>Посадка</h3><p>${product.fit}</p><p>${product.measurements}</p></article>
        <article class="panel-card"><h3>Уход</h3><p>${product.care}</p></article>
        <article class="panel-card"><h3>Доставка и возврат</h3><p>Доставка по РФ 2–6 дней. Возврат доступен в течение 14 дней при сохранении товарного вида.</p></article>
      </div>
    </section>

    <section class="section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">ещё из дропа</p>
          <h2>Похожие товары</h2>
        </div>
      </div>
      <div class="product-grid" id="relatedGrid">${relatedMarkup}</div>
    </section>
  `;

  const galleryMain = document.getElementById('galleryMain');
  const buttons = Array.from(container.querySelectorAll('[data-thumb]'));
  const setActive = (button) => {
    buttons.forEach((item) => item.classList.toggle('active', item === button));
    galleryMain.src = button.dataset.thumb;
    galleryMain.alt = `${product.title} — ${button.dataset.label}`;
  };
  buttons.forEach((button) => button.addEventListener('click', () => setActive(button)));

  const sizeOptions = document.getElementById('sizeOptions');
  let selectedSize = product.sizes[0];
  sizeOptions?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-size]');
    if (!button) return;
    selectedSize = button.dataset.size;
    sizeOptions.querySelectorAll('[data-size]').forEach((item) => item.classList.toggle('active', item === button));
  });

  document.getElementById('addToCartPrimary')?.addEventListener('click', () => {
    const quantity = Number(document.getElementById('quantityInput')?.value || 1);
    addToCart(product.id, selectedSize, quantity);
  });

}
