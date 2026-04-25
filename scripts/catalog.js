import { categories, escapeHtml, formatPrice, initCommon, productCard, products } from '../app.js';

initCommon('catalog');

const params = new URLSearchParams(location.search);
const defaultMaxPrice = Math.max(...products.map((product) => product.price));

const state = {
  category: params.get('category') || 'all',
  query: params.get('q') || '',
  sale: params.get('tag') === 'sale',
  inStock: true,
  sizes: new Set(),
  color: 'all',
  minPrice: '',
  maxPrice: '',
  sort: 'new',
};

const grid = document.getElementById('productGrid');
const count = document.getElementById('resultCount');
const search = document.getElementById('localSearch');
const categoryFilter = document.getElementById('categoryFilter');
const sizeFilter = document.getElementById('sizeFilter');
const colorFilter = document.getElementById('colorFilter');
const saleToggle = document.getElementById('saleToggle');
const stockToggle = document.getElementById('stockToggle');
const sortSelect = document.getElementById('sortSelect');
const minPrice = document.getElementById('minPrice');
const maxPrice = document.getElementById('maxPrice');
const activeFilters = document.getElementById('activeFilters');

search.value = state.query;
saleToggle.checked = state.sale;
stockToggle.checked = state.inStock;
maxPrice.placeholder = String(Math.ceil(defaultMaxPrice / 500) * 500);

const sizes = [...new Set(products.flatMap((product) => product.sizes))];
const colors = [...new Set(products.map((product) => product.color))];

categoryFilter.innerHTML = categories.map((category) => `<button type="button" class="${state.category === category.id ? 'active' : ''}" data-category="${category.id}">${escapeHtml(category.title)}</button>`).join('');
sizeFilter.innerHTML = sizes.map((size) => `<label><input type="checkbox" value="${escapeHtml(size)}" /> <span>${escapeHtml(size)}</span></label>`).join('');
colorFilter.innerHTML = ['all', ...colors].map((color) => `<button type="button" class="swatch ${escapeHtml(color)} ${state.color === color ? 'active' : ''}" data-color="${escapeHtml(color)}" aria-label="${color === 'all' ? 'Все цвета' : escapeHtml(color)}"></button>`).join('');

function getFiltered() {
  const q = state.query.trim().toLowerCase();
  const min = Number(state.minPrice) || 0;
  const max = Number(state.maxPrice) || Infinity;

  let list = products.filter((product) => {
    const matchesCategory = state.category === 'all' || product.category === state.category;
    const matchesColor = state.color === 'all' || product.color === state.color;
    const matchesSale = !state.sale || Boolean(product.oldPrice);
    const matchesStock = !state.inStock || product.stock > 0;
    const matchesSize = state.sizes.size === 0 || [...state.sizes].some((size) => product.sizes.includes(size));
    const matchesPrice = product.price >= min && product.price <= max;
    const text = [product.title, product.collection, product.categoryTitle, product.material, product.colorTitle, product.description, product.fit].join(' ').toLowerCase();
    const matchesQuery = !q || text.includes(q);
    return matchesCategory && matchesColor && matchesSale && matchesStock && matchesSize && matchesPrice && matchesQuery;
  });

  list = [...list].sort((a, b) => {
    if (state.sort === 'price-asc') return a.price - b.price;
    if (state.sort === 'price-desc') return b.price - a.price;
    if (state.sort === 'sale') return Number(Boolean(b.oldPrice)) - Number(Boolean(a.oldPrice));
    if (state.sort === 'popular') return b.rating - a.rating;
    return products.indexOf(a) - products.indexOf(b);
  });
  return list;
}

function renderActiveFilters() {
  const chips = [];
  const category = categories.find((item) => item.id === state.category);
  if (state.query) chips.push(`Поиск: ${escapeHtml(state.query)}`);
  if (category && category.id !== 'all') chips.push(`Категория: ${escapeHtml(category.title)}`);
  if (state.minPrice) chips.push(`От ${formatPrice(Number(state.minPrice))}`);
  if (state.maxPrice) chips.push(`До ${formatPrice(Number(state.maxPrice))}`);
  if (state.sizes.size) chips.push(`Размеры: ${[...state.sizes].map(escapeHtml).join(', ')}`);
  if (state.color !== 'all') chips.push(`Цвет: ${escapeHtml(state.color)}`);
  if (state.sale) chips.push('Sale');
  if (state.inStock) chips.push('В наличии');

  activeFilters.innerHTML = chips.length
    ? chips.map((chip) => `<span>${chip}</span>`).join('')
    : '<span>Фильтры не выбраны — показана вся капсула VEAST.</span>';
}

function render() {
  const list = getFiltered();
  count.textContent = `${list.length} ${plural(list.length, ['товар', 'товара', 'товаров'])}`;
  grid.innerHTML = list.length ? list.map(productCard).join('') : `
    <div class="empty-state catalog-empty">
      <h3>Ничего не найдено</h3>
      <p>Измени поиск, убери часть фильтров или вернись ко всей капсуле. Пустое состояние помогает пользователю не застрять в каталоге.</p>
      <button class="button button-primary" id="emptyReset" type="button">Сбросить фильтры</button>
    </div>
  `;
  categoryFilter.querySelectorAll('button').forEach((button) => button.classList.toggle('active', button.dataset.category === state.category));
  colorFilter.querySelectorAll('button').forEach((button) => button.classList.toggle('active', button.dataset.color === state.color));
  renderActiveFilters();
}

function plural(number, words) {
  const n = Math.abs(number) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return words[2];
  if (n1 > 1 && n1 < 5) return words[1];
  if (n1 === 1) return words[0];
  return words[2];
}

function resetFilters() {
  state.category = 'all';
  state.query = '';
  state.sale = false;
  state.inStock = true;
  state.sizes = new Set();
  state.color = 'all';
  state.minPrice = '';
  state.maxPrice = '';
  state.sort = 'new';
  search.value = '';
  minPrice.value = '';
  maxPrice.value = '';
  saleToggle.checked = false;
  stockToggle.checked = true;
  sortSelect.value = 'new';
  sizeFilter.querySelectorAll('input').forEach((input) => { input.checked = false; });
  render();
}

categoryFilter.addEventListener('click', (event) => {
  const button = event.target.closest('[data-category]');
  if (!button) return;
  state.category = button.dataset.category;
  render();
});

sizeFilter.addEventListener('change', () => {
  state.sizes = new Set([...sizeFilter.querySelectorAll('input:checked')].map((input) => input.value));
  render();
});

colorFilter.addEventListener('click', (event) => {
  const button = event.target.closest('[data-color]');
  if (!button) return;
  state.color = button.dataset.color;
  render();
});

saleToggle.addEventListener('change', () => { state.sale = saleToggle.checked; render(); });
stockToggle.addEventListener('change', () => { state.inStock = stockToggle.checked; render(); });
search.addEventListener('input', () => { state.query = search.value; render(); });
minPrice.addEventListener('input', () => { state.minPrice = minPrice.value; render(); });
maxPrice.addEventListener('input', () => { state.maxPrice = maxPrice.value; render(); });
sortSelect.addEventListener('change', () => { state.sort = sortSelect.value; render(); });
document.getElementById('resetFilters').addEventListener('click', resetFilters);
document.addEventListener('click', (event) => {
  if (event.target.closest('#emptyReset')) resetFilters();
});

render();
