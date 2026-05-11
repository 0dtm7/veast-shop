import {
  calculateCart,
  changeCartQuantity,
  clearCart,
  escapeHtml,
  formatPrice,
  getCart,
  getProductById,
  initCommon,
  isEnglish,
  localizeProduct,
  removeFromCart,
} from '../app.js';

initCommon('');

const list = document.getElementById('cartList');
const summary = document.getElementById('cartSummary');
const t = (ru, en) => (isEnglish() ? en : ru);

function render() {
  const cart = getCart();
  if (!cart.length) {
    list.innerHTML = `
      <div class="empty-state cart-empty">
        <h3>${t('Корзина пуста', 'Your cart is empty')}</h3>
        <p>${t('Добавь товар из каталога, чтобы продолжить основной коммерческий сценарий VEAST.', 'Add a product from the catalog to continue the main VEAST shopping flow.')}</p>
        <div class="inline-actions">
          <a class="button button-primary" href="catalog.html">${t('В каталог', 'Go to catalog')}</a>
          <a class="button button-ghost" href="favorites.html">${t('Посмотреть избранное', 'View favorites')}</a>
        </div>
      </div>`;
    summary.innerHTML = `
      <h3>${t('Итого', 'Summary')}</h3>
      <div class="total-row"><span>${t('Товары', 'Products')}</span><strong>${formatPrice(0)}</strong></div>
      <p class="muted">${t('Checkout станет доступен после добавления товара.', 'Checkout becomes available after you add a product.')}</p>
      <a class="button button-primary full cart-summary-cta" href="catalog.html">${t('Выбрать товар', 'Choose a product')}</a>`;
    return;
  }

  list.innerHTML = cart.map((item) => {
    const rawProduct = getProductById(item.productId);
    if (!rawProduct) return '';
    const product = localizeProduct(rawProduct);
    return `<article class="cart-row">
      <div class="cart-row-main">
        <a href="product.html?id=${product.id}"><img src="${product.cardImage || product.image}" alt="${escapeHtml(product.title)}" /></a>
        <div>
          <p class="eyebrow">${escapeHtml(product.categoryTitle)}</p>
          <h3><a href="product.html?id=${product.id}">${escapeHtml(product.title)}</a></h3>
          <p class="muted">${t('Размер', 'Size')}: ${escapeHtml(item.size)} · ${escapeHtml(product.collection)}</p>
          <p>${formatPrice(product.price)} ${t('за единицу', 'each')}</p>
        </div>
        <div class="cart-line-side">
          <div class="qty-control" aria-label="${t('Количество товара', 'Product quantity')}">
            <button data-dec="${escapeHtml(item.lineId)}" type="button" aria-label="${t('Уменьшить количество', 'Decrease quantity')}">−</button>
            <strong>${item.quantity}</strong>
            <button data-inc="${escapeHtml(item.lineId)}" type="button" aria-label="${t('Увеличить количество', 'Increase quantity')}">+</button>
          </div>
          <strong>${formatPrice(product.price * item.quantity)}</strong>
        </div>
      </div>
      <button class="square-button" data-remove-line="${escapeHtml(item.lineId)}" aria-label="${t('Удалить', 'Remove')}">×</button>
    </article>`;
  }).join('');

  const total = calculateCart(cart);
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  summary.innerHTML = `<h3>${t('Итого', 'Summary')}</h3>
    <div class="total-row"><span>${t('Позиций', 'Items')}</span><strong>${count}</strong></div>
    <div class="total-row"><span>${t('Товары', 'Products')}</span><strong>${formatPrice(total)}</strong></div>
    <div class="total-row"><span>${t('Доставка', 'Shipping')}</span><strong>${t('после заявки', 'after confirmation')}</strong></div>
    <div class="total-row total-strong"><span>${t('К оплате', 'Total due')}</span><strong>${formatPrice(total)}</strong></div>
    <p class="muted">${t('Следующий шаг — оформление заказа. Это основное измеримое целевое действие сайта.', 'Next step: checkout. This is the main measurable conversion action of the site.')}</p>
    <a class="button button-primary full cart-summary-cta checkout-cta" href="checkout.html">${t('Оформить заказ', 'Proceed to checkout')}</a>
    <a class="button button-ghost full product-secondary-action" href="catalog.html">${t('Продолжить покупки', 'Continue shopping')}</a>
    <button class="button button-ghost full product-secondary-action" id="clearCart" type="button">${t('Очистить корзину', 'Clear cart')}</button>`;
}

document.addEventListener('click', (event) => {
  const inc = event.target.closest('[data-inc]');
  const dec = event.target.closest('[data-dec]');
  const remove = event.target.closest('[data-remove-line]');
  const clear = event.target.closest('#clearCart');
  const cart = getCart();
  if (inc) {
    const line = cart.find((item) => item.lineId === inc.dataset.inc);
    if (line) changeCartQuantity(line.lineId, line.quantity + 1);
    render();
  }
  if (dec) {
    const line = cart.find((item) => item.lineId === dec.dataset.dec);
    if (line) changeCartQuantity(line.lineId, line.quantity - 1);
    render();
  }
  if (remove) { removeFromCart(remove.dataset.removeLine); render(); }
  if (clear) { clearCart(); render(); }
});

render();
