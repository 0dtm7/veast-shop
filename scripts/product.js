import { addToCart, escapeHtml, formatPrice, getLanguage, getProductById, initCommon, localizeProduct, productCard, products, scheduleTranslation } from '../app.js';

initCommon('catalog');

const params = new URLSearchParams(location.search);
const productId = params.get('id') || 'vst-eclipse-zip-hoodie';
const product = getProductById(productId);
const container = document.getElementById('productPage');

if (!product) {
  container.innerHTML = '<div class="empty-state"><h1>Товар не найден</h1><p>Проверь идентификатор товара или вернись в каталог.</p><a class="button button-primary" href="catalog.html">В каталог</a></div>';
} else {
  const view = localizeProduct(product);
  const lang = getLanguage();
  const labels = lang === 'en'
    ? { front: 'Front view', back: 'Back view', detailLogo: 'Logo detail', detailGraphic: 'Graphic detail', productOnly: 'Product shot', image: 'Image', material: 'Fabric', fit: 'Fit', care: 'Care', sizeGuide: 'Size guide', price: 'Price', color: 'Color', stock: 'Availability', size: 'Size', qty: 'Quantity', add: 'Add to cart', details: 'Product details', before: 'Before you buy', wear: 'Wear it with', more: 'More from the drop', delivery: 'Shipping and returns', deliveryText: 'Shipping across Russia takes 2–6 days. Returns are available within 14 days if the item keeps its original condition.', stylingIntro: 'This block shows the product as part of a full outfit. For this item, VEAST recommends pieces from the same Orbit Drop so the customer can see a ready-made combination faster.', importantText: 'This piece supports the Orbit Drop idea: washed texture, cold palette and clean streetwear styling.' }
    : { front: 'Вид спереди', back: 'Вид со спины', detailLogo: 'Деталь логотипа', detailGraphic: 'Деталь графики', productOnly: 'Товар отдельно', image: 'Изображение', material: 'Материал', fit: 'Посадка', care: 'Уход', sizeGuide: 'Размерная сетка', price: 'Цена', color: 'Цвет', stock: 'Наличие', size: 'Размер', qty: 'Количество', add: 'Добавить в корзину', details: 'Детали товара', before: 'Что важно перед покупкой', wear: 'С чем носить', more: 'Похожие товары', delivery: 'Доставка и возврат', deliveryText: 'Доставка по РФ 2–6 дней. Возврат доступен в течение 14 дней при сохранении товарного вида.', stylingIntro: 'Блок помогает показать товар как часть цельного образа. Для этого товара мы рекомендуем позиции из того же VEAST Orbit Drop, чтобы пользователь сразу видел удачное сочетание и быстрее принимал решение о покупке.', importantText: 'Вещь поддерживает общую идею Orbit Drop: washed-фактура, холодная палитра и clean streetwear-подача.' };
  const galleryItems = [product.image, product.imageAlt, ...product.gallery].filter(Boolean);
  const galleryLabels = [labels.front, labels.back, labels.detailLogo, labels.detailGraphic, labels.productOnly, labels.image];
  const related = products.filter((item) => item.id !== product.id && item.category === product.category).slice(0, 4);
  const wearWithProducts = (product.wearWith || []).map((id) => getProductById(id)).filter((item) => item && item.id !== product.id).slice(0, 3);
  const featureTagsHtml = (view.featureTags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
  const relatedMarkup = related.length
    ? related.map(productCard).join('')
    : '<div class="empty-state"><h3>Похожие товары появятся здесь</h3><p>Сейчас достаточно открыть каталог и посмотреть весь дроп.</p></div>';
  const wearWithMarkup = wearWithProducts.length
    ? wearWithProducts.map((item) => `
        <article class="style-card">
          <a class="style-card-media" href="product.html?id=${item.id}">
            <img src="${item.cardImage || item.image}" alt="${escapeHtml(localizeProduct(item).title)}" loading="lazy" />
          </a>
          <div class="style-card-body">
            <p class="eyebrow">${escapeHtml(localizeProduct(item).categoryTitle)}</p>
            <a class="style-card-title" href="product.html?id=${item.id}">${escapeHtml(localizeProduct(item).title)}</a>
            <p>${escapeHtml(localizeProduct(item).description)}</p>
            <div class="style-card-footer">
              <strong>${formatPrice(item.price)}</strong>
              <a class="button button-ghost" href="product.html?id=${item.id}">${lang === 'en' ? 'Open' : 'Открыть'}</a>
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
      <span>${view.title}</span>
    </div>

    <section class="product-page-layout enhanced-product">
      <div class="product-gallery-block">
        <div class="gallery-main">
          <img id="galleryMain" src="${product.image}" alt="${view.title}" />
          <span class="gallery-label">${view.collection}</span>
          <span class="gallery-zoom-hint">premium photo / detail</span>
        </div>
        <div class="gallery-thumbs">
          ${galleryItems.map((image, index) => `
            <button class="${index === 0 ? 'active' : ''}" type="button" data-thumb="${image}" data-label="${galleryLabels[index] || 'Изображение'}">
              <img src="${image}" alt="${view.title} — миниатюра ${index + 1}" loading="lazy" />
              <span>${galleryLabels[index] || 'Изображение'}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <aside class="product-sidebar product-buybox">
        <p class="eyebrow">${view.collection}</p>
        <h1>${view.title}</h1>
        <p class="hero-copy">${view.description}</p>
        <div class="product-inline-tags" aria-label="Теги товара">
          ${featureTagsHtml}
        </div>
        <div class="product-kpis">
          <div><span>${labels.price}</span><strong>${formatPrice(product.price)}</strong></div>
          <div><span>${labels.color}</span><strong>${view.colorTitle}</strong></div>
          <div><span>${labels.stock}</span><strong>${view.status}</strong></div>
        </div>

        <div class="option-row">
          <label>${labels.size}</label>
          <div class="size-options" id="sizeOptions">
            ${product.sizes.map((size, index) => `<button type="button" class="${index === 0 ? 'active' : ''}" data-size="${size}">${size}</button>`).join('')}
          </div>
        </div>

        <div class="option-row">
          <label>${labels.qty}</label>
          <input id="quantityInput" type="number" min="1" max="10" value="1" />
        </div>

        <div class="card-actions">
          <button class="button button-primary product-main-cta" type="button" id="addToCartPrimary">${labels.add}</button>
          <a class="square-button" href="cart.html" aria-label="Открыть корзину">⌑</a>
          <a class="square-button" href="checkout.html" aria-label="Перейти к оформлению">→</a>
        </div>

        <div class="mini-service-list">
          <span>${labels.material}: ${view.material}</span>
          <span>${labels.fit}: ${view.fit}</span>
          <span>${labels.care}: ${view.care}</span>
          <span>${labels.sizeGuide}: ${view.measurements}</span>
        </div>
      </aside>
    </section>

    <section class="section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">styling tips</p>
          <h2>${labels.wear}</h2>
        </div>
      </div>
      <div class="style-intro">
        <p>${labels.stylingIntro}</p>
      </div>
      <div class="styling-grid">
        ${wearWithMarkup}
      </div>
    </section>

    <section class="section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">${labels.details}</p>
          <h2>${labels.before}</h2>
        </div>
      </div>
      <div class="product-info-panels">
        <article class="panel-card"><h3>${labels.material}</h3><p>${view.material}</p><p>${labels.importantText}</p></article>
        <article class="panel-card"><h3>${labels.fit}</h3><p>${view.fit}</p><p>${view.measurements}</p></article>
        <article class="panel-card"><h3>${labels.care}</h3><p>${view.care}</p></article>
        <article class="panel-card"><h3>${labels.delivery}</h3><p>${labels.deliveryText}</p></article>
      </div>
    </section>

    <section class="section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">more from drop</p>
          <h2>${labels.more}</h2>
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
    galleryMain.alt = `${view.title} — ${button.dataset.label}`;
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

  scheduleTranslation();
}
