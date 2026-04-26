import { calculateCart, changeCartQuantity, clearCart, escapeHtml, formatPrice, getCart, getProductById, initCommon, removeFromCart } from '../app.js';

initCommon('');

const list = document.getElementById('cartList');
const summary = document.getElementById('cartSummary');

function render() {
  const cart = getCart();
  if (!cart.length) {
    list.innerHTML = `
      <div class="empty-state cart-empty">
        <h3>Корзина пустая</h3>
        <p>Добавь товар из каталога, чтобы продолжить основной коммерческий сценарий VEAST.</p>
        <div class="inline-actions">
          <a class="button button-primary" href="catalog.html">В каталог</a>
          <a class="button button-ghost" href="favorites.html">Посмотреть избранное</a>
        </div>
      </div>`;
    summary.innerHTML = `
      <h3>Итого</h3>
      <div class="total-row"><span>Товары</span><strong>${formatPrice(0)}</strong></div>
      <p class="muted">Checkout станет доступен после добавления товара.</p>
      <a class="button button-primary full" href="catalog.html">Выбрать товар</a>`;
    return;
  }

  list.innerHTML = cart.map((item) => {
    const product = getProductById(item.productId);
    if (!product) return '';
    return `<article class="cart-row">
      <div class="cart-row-main">
        <a href="product.html?id=${product.id}"><img src="${product.cardImage || product.image}" alt="${escapeHtml(product.title)}" /></a>
        <div>
          <p class="eyebrow">${escapeHtml(product.categoryTitle)}</p>
          <h3><a href="product.html?id=${product.id}">${escapeHtml(product.title)}</a></h3>
          <p class="muted">Размер: ${escapeHtml(item.size)} · ${escapeHtml(product.collection)}</p>
          <p>${formatPrice(product.price)} за единицу</p>
        </div>
        <div class="cart-line-side">
          <div class="qty-control" aria-label="Количество товара">
            <button data-dec="${escapeHtml(item.lineId)}" type="button" aria-label="Уменьшить количество">−</button>
            <strong>${item.quantity}</strong>
            <button data-inc="${escapeHtml(item.lineId)}" type="button" aria-label="Увеличить количество">+</button>
          </div>
          <strong>${formatPrice(product.price * item.quantity)}</strong>
        </div>
      </div>
      <button class="square-button" data-remove-line="${escapeHtml(item.lineId)}" aria-label="Удалить">×</button>
    </article>`;
  }).join('');

  const total = calculateCart(cart);
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  summary.innerHTML = `<h3>Итого</h3>
    <div class="total-row"><span>Позиций</span><strong>${count}</strong></div>
    <div class="total-row"><span>Товары</span><strong>${formatPrice(total)}</strong></div>
    <div class="total-row"><span>Доставка</span><strong>после заявки</strong></div>
    <div class="total-row total-strong"><span>К оплате</span><strong>${formatPrice(total)}</strong></div>
    <p class="muted">Следующий шаг — оформление заказа. Это основное измеримое целевое действие сайта.</p>
    <a class="button button-primary full" href="checkout.html">Оформить заказ</a>
    <a class="button button-ghost full product-secondary-action" href="catalog.html">Продолжить покупки</a>
    <button class="button button-ghost full product-secondary-action" id="clearCart" type="button">Очистить корзину</button>`;
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
