import { escapeHtml, formatPrice, initCommon } from '../app.js';

initCommon('project');

const ADMIN_KEY_STORAGE = 'veast_admin_status_key_v1';
const CATEGORY_TITLES = {
  hoodie: 'Худи',
  tee: 'Футболки',
  longsleeve: 'Лонгсливы',
  outerwear: 'Верхняя одежда',
  pants: 'Брюки',
  accessory: 'Аксессуары',
};

const adminKeyForm = document.getElementById('adminKeyForm');
const adminKeyInput = document.getElementById('adminKeyInput');
const adminMessage = document.getElementById('adminMessage');
const productForm = document.getElementById('productForm');
const productFormTitle = document.getElementById('productFormTitle');
const productFormMessage = document.getElementById('productFormMessage');
const productsList = document.getElementById('productsList');
const refreshProducts = document.getElementById('refreshProducts');
const resetProductForm = document.getElementById('resetProductForm');
const previewProductData = document.getElementById('previewProductData');

let products = [];

function getAdminKey() {
  return adminKeyInput.value.trim();
}

function setMessage(node, text, type = '') {
  if (!node) return;
  node.innerHTML = text ? `<span class="${type}">${escapeHtml(text)}</span>` : '';
}

function slugify(value = '') {
  const map = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
    к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
    х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  };
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[а-яё]/g, (char) => map[char] || char)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function splitList(value = '') {
  return String(value || '')
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinList(value = []) {
  return Array.isArray(value) ? value.join(', ') : '';
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve('');
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Не удалось прочитать изображение'));
    reader.readAsDataURL(file);
  });
}

async function getImageValue(formData, inputName, fileName) {
  const fileInput = productForm.elements[fileName];
  const file = fileInput?.files?.[0];
  if (file) return readFileAsDataUrl(file);
  return String(formData.get(inputName) || '').trim();
}

async function getGalleryValue(formData) {
  const gallery = splitList(formData.get('gallery'));
  const files = Array.from(productForm.elements.galleryFiles?.files || []);
  for (const file of files) gallery.push(await readFileAsDataUrl(file));
  return gallery;
}

async function collectProductData() {
  const formData = new FormData(productForm);
  const title = String(formData.get('title') || '').trim();
  const baseSlug = slugify(formData.get('slug') || title);
  const id = String(formData.get('id') || '').trim() || `vst-${baseSlug}`;
  const category = String(formData.get('category') || 'accessory').trim();

  return {
    id,
    slug: String(formData.get('slug') || '').trim() || baseSlug,
    title,
    category,
    categoryTitle: String(formData.get('categoryTitle') || '').trim() || CATEGORY_TITLES[category] || 'Товар',
    collection: String(formData.get('collection') || 'Orbit Drop').trim(),
    price: Number(formData.get('price') || 0),
    oldPrice: String(formData.get('oldPrice') || '').trim(),
    color: String(formData.get('color') || 'black').trim(),
    colorTitle: String(formData.get('colorTitle') || 'Washed Black / Chrome').trim(),
    sizes: splitList(formData.get('sizes')),
    stock: Number(formData.get('stock') || 0),
    status: String(formData.get('status') || 'В наличии').trim(),
    badges: splitList(formData.get('badges')),
    featureTags: splitList(formData.get('featureTags')),
    wearWith: splitList(formData.get('wearWith')),
    cardImage: await getImageValue(formData, 'cardImage', 'cardImageFile'),
    cardImageAlt: await getImageValue(formData, 'cardImageAlt', 'cardImageAltFile'),
    image: await getImageValue(formData, 'image', 'imageFile'),
    imageAlt: await getImageValue(formData, 'imageAlt', 'imageAltFile'),
    gallery: await getGalleryValue(formData),
    description: String(formData.get('description') || '').trim(),
    material: String(formData.get('material') || '').trim(),
    fit: String(formData.get('fit') || '').trim(),
    care: String(formData.get('care') || '').trim(),
    measurements: String(formData.get('measurements') || '').trim(),
    rating: Number(formData.get('rating') || 4.8),
  };
}

function setField(name, value = '') {
  const field = productForm.elements[name];
  if (!field) return;
  field.value = value ?? '';
}

function clearFileInputs() {
  ['cardImageFile', 'cardImageAltFile', 'imageFile', 'imageAltFile', 'galleryFiles'].forEach((name) => {
    const field = productForm.elements[name];
    if (field) field.value = '';
  });
}

function resetForm() {
  productForm.reset();
  setField('editingId', '');
  setField('collection', 'Orbit Drop');
  setField('category', 'accessory');
  setField('color', 'black');
  setField('colorTitle', 'Washed Black / Chrome');
  setField('status', 'В наличии');
  setField('rating', '4.8');
  productFormTitle.textContent = 'Новый товар';
  setMessage(productFormMessage, '');
  clearFileInputs();
}

function fillProduct(product) {
  resetForm();
  setField('editingId', product.id);
  Object.entries({
    id: product.id,
    slug: product.slug,
    title: product.title,
    category: product.category,
    categoryTitle: product.categoryTitle,
    collection: product.collection,
    price: product.price,
    oldPrice: product.oldPrice || '',
    color: product.color,
    colorTitle: product.colorTitle,
    sizes: joinList(product.sizes),
    stock: product.stock,
    status: product.status,
    badges: joinList(product.badges),
    featureTags: joinList(product.featureTags),
    wearWith: joinList(product.wearWith),
    cardImage: product.cardImage,
    cardImageAlt: product.cardImageAlt,
    image: product.image,
    imageAlt: product.imageAlt,
    gallery: Array.isArray(product.gallery) ? product.gallery.join('\n') : '',
    description: product.description,
    material: product.material,
    fit: product.fit,
    care: product.care,
    measurements: product.measurements,
    rating: product.rating,
  }).forEach(([key, value]) => setField(key, value));
  productFormTitle.textContent = `Редактирование: ${product.title}`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderProducts() {
  productsList.innerHTML = products.length ? products.map((product) => `
    <article class="admin-product-item" data-product-id="${escapeHtml(product.id)}">
      <div class="admin-product-thumb">
        ${product.cardImage ? `<img src="${escapeHtml(product.cardImage)}" alt="${escapeHtml(product.title)}" />` : '<span>VEAST</span>'}
      </div>
      <div class="admin-product-info">
        <strong>${escapeHtml(product.title)}</strong>
        <p>${escapeHtml(product.categoryTitle || product.category)} · ${formatPrice(product.price || 0)}</p>
        <p class="muted">${escapeHtml(product.sizes?.join(', ') || 'OS')} · ${Number(product.stock || 0)} шт.</p>
      </div>
      <div class="admin-product-actions">
        <button class="button button-ghost" type="button" data-edit-product="${escapeHtml(product.id)}">Редактировать</button>
        <button class="button button-danger" type="button" data-delete-product="${escapeHtml(product.id)}">Удалить</button>
      </div>
    </article>
  `).join('') : '<div class="empty-state"><h3>Товаров пока нет</h3><p>Добавь первую карточку через форму.</p></div>';
}

async function loadProducts() {
  const adminKey = getAdminKey();
  if (!adminKey) {
    productsList.innerHTML = '<div class="empty-state"><h3>Введите ключ</h3><p>После входа здесь появится каталог.</p></div>';
    return;
  }

  productsList.innerHTML = '<div class="empty-state"><h3>Загружаем товары</h3><p>Проверяем каталог.</p></div>';
  try {
    const response = await fetch('/api/admin/products', { headers: { 'x-admin-key': adminKey } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Не удалось загрузить товары');
    products = Array.isArray(data.products) ? data.products : [];
    renderProducts();
  } catch (error) {
    productsList.innerHTML = `<div class="empty-state api-error-state"><h3>Не удалось загрузить товары</h3><p>${escapeHtml(error.message)}</p></div>`;
  }
}

async function saveProduct() {
  const adminKey = getAdminKey();
  if (!adminKey) {
    setMessage(productFormMessage, 'Сначала укажи ключ.', 'error-text');
    return;
  }

  setMessage(productFormMessage, 'Сохраняем товар...', 'api-alert api-alert-loading');
  try {
    const editingId = productForm.elements.editingId.value.trim();
    const payload = await collectProductData();
    const url = editingId ? `/api/admin/products/${encodeURIComponent(editingId)}` : '/api/admin/products';
    const method = editingId ? 'PATCH' : 'POST';
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || 'Не удалось сохранить товар');
    setMessage(productFormMessage, 'Товар сохранён. Он появится в каталоге.', 'api-alert api-alert-success');
    resetForm();
    await loadProducts();
  } catch (error) {
    setMessage(productFormMessage, error.message, 'error-text');
  }
}

async function deleteProduct(productId) {
  const adminKey = getAdminKey();
  if (!adminKey) return;
  const product = products.find((item) => item.id === productId);
  const ok = window.confirm(`Удалить товар ${product?.title || productId}?`);
  if (!ok) return;

  try {
    const response = await fetch(`/api/admin/products/${encodeURIComponent(productId)}`, {
      method: 'DELETE',
      headers: { 'x-admin-key': adminKey },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || 'Не удалось удалить товар');
    await loadProducts();
  } catch (error) {
    setMessage(adminMessage, error.message, 'error-text');
  }
}

adminKeyInput.value = localStorage.getItem(ADMIN_KEY_STORAGE) || '';

adminKeyForm.addEventListener('submit', (event) => {
  event.preventDefault();
  localStorage.setItem(ADMIN_KEY_STORAGE, getAdminKey());
  setMessage(adminMessage, 'Ключ сохранён. Загружаем товары.', 'api-alert api-alert-success');
  loadProducts();
});

productForm.addEventListener('submit', (event) => {
  event.preventDefault();
  saveProduct();
});

resetProductForm.addEventListener('click', resetForm);
refreshProducts.addEventListener('click', loadProducts);

previewProductData.addEventListener('click', async () => {
  try {
    const payload = await collectProductData();
    setMessage(productFormMessage, `Проверка: ${payload.title || 'без названия'} · ${payload.sizes.join(', ') || 'размеры не указаны'} · ${formatPrice(payload.price || 0)}`, 'api-alert api-alert-success');
  } catch (error) {
    setMessage(productFormMessage, error.message, 'error-text');
  }
});

productForm.elements.title.addEventListener('input', () => {
  const title = productForm.elements.title.value.trim();
  if (!productForm.elements.slug.value.trim()) productForm.elements.slug.value = slugify(title);
  if (!productForm.elements.id.value.trim()) productForm.elements.id.value = `vst-${slugify(title)}`;
});

productForm.elements.category.addEventListener('change', () => {
  if (!productForm.elements.categoryTitle.value.trim()) {
    productForm.elements.categoryTitle.value = CATEGORY_TITLES[productForm.elements.category.value] || 'Товар';
  }
});

document.addEventListener('click', (event) => {
  const editButton = event.target.closest('[data-edit-product]');
  if (editButton) {
    const product = products.find((item) => item.id === editButton.dataset.editProduct);
    if (product) fillProduct(product);
    return;
  }

  const deleteButton = event.target.closest('[data-delete-product]');
  if (deleteButton) deleteProduct(deleteButton.dataset.deleteProduct);
});

resetForm();
loadProducts();
