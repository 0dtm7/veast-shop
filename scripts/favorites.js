import { getFavorites, initCommon, productCard, products } from '../app.js';
initCommon('favorites');
const favorites = new Set(getFavorites());
const list = products.filter((product) => favorites.has(product.id));
document.getElementById('favoritesGrid').innerHTML = list.length ? list.map(productCard).join('') : '<div class="empty-state"><h3>Избранное пустое</h3><p>Добавь товары через сердечко на карточках каталога.</p><a class="button button-primary" href="catalog.html">В каталог</a></div>';
