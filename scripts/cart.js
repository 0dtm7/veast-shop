import { calculateCart, changeCartQuantity, clearCart, escapeHtml, formatPrice, getCart, getProductById, initCommon,
  scheduleTranslation, removeFromCart } from '../app.js';

initCommon('');

const list = document.getElementById('cartList');
const summary = document.getElementById('cartSummary');

function render() {
  const cart = getCart();
  if (!cart.length) {
    list.innerHTML = `
      <div class="empty-state cart-empty">
        <h3>Your cart is empty</h3>
        <p>Add a product from the catalog to continue the main VEAST shopping flow.</p>
        <div class="inline-actions">
          <a class="button button-primary" href="catalog.html">Go to catalog</a>
          <a class="button button-ghost" href="favorites.html">View favorites</a>
        </div>
      </div>`;
    summary.innerHTML = `
      <h3>Summary</h3>
      <div class="total-row"><span>Products</span><strong>${formatPrice(0)}</strong></div>
      <p class="muted">Checkout becomes available after you add a product.</p>
      <a class="button button-primary full cart-summary-cta" href="catalog.html">Choose a product</a>`;
    requestAnimationFrame(scheduleTranslation);
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
          <p class="muted">Size: ${escapeHtml(item.size)} · ${escapeHtml(product.collection)}</p>
          <p>${formatPrice(product.price)} each</p>
        </div>
        <div class="cart-line-side">
          <div class="qty-control" aria-label="Product quantity">
            <button data-dec="${escapeHtml(item.lineId)}" type="button" aria-label="Decrease quantity">−</button>
            <strong>${item.quantity}</strong>
            <button data-inc="${escapeHtml(item.lineId)}" type="button" aria-label="Increase quantity">+</button>
          </div>
          <strong>${formatPrice(product.price * item.quantity)}</strong>
        </div>
      </div>
      <button class="square-button" data-remove-line="${escapeHtml(item.lineId)}" aria-label="Remove">×</button>
    </article>`;
  }).join('');

  const total = calculateCart(cart);
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  summary.innerHTML = `<h3>Summary</h3>
    <div class="total-row"><span>Items</span><strong>${count}</strong></div>
    <div class="total-row"><span>Products</span><strong>${formatPrice(total)}</strong></div>
    <div class="total-row"><span>Shipping</span><strong>after confirmation</strong></div>
    <div class="total-row total-strong"><span>Total due</span><strong>${formatPrice(total)}</strong></div>
    <p class="muted">Next step: checkout. This is the main measurable conversion action of the site.</p>
    <a class="button button-primary full cart-summary-cta checkout-cta" href="checkout.html">Proceed to checkout</a>
    <a class="button button-ghost full product-secondary-action" href="catalog.html">Continue shopping</a>
    <button class="button button-ghost full product-secondary-action" id="clearCart" type="button">Clear cart</button>`;
  requestAnimationFrame(scheduleTranslation);
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
