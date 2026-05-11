import { initCommon, productCard, products } from '../app.js';
initCommon('home');
document.getElementById('homeProducts').innerHTML = products.slice(0, 6).map(productCard).join('');

const lookbookImage = document.querySelector('[data-lookbook-rotator]');
const lookbookImages = [
  { src: 'assets/veast-premium/orbit-puffer-jacket-front.jpg', alt: 'VEAST Orbit Puffer Jacket — вид спереди' },
  { src: 'assets/veast-premium/orbit-puffer-jacket-back-new.jpg', alt: 'VEAST Orbit Puffer Jacket — вид со спины' },
  { src: 'assets/veast-premium/orbit-puffer-jacket-detail1.jpg', alt: 'VEAST Orbit Puffer Jacket — деталь логотипа' },
  { src: 'assets/veast-premium/orbit-puffer-jacket-detail2.jpg', alt: 'VEAST Orbit Puffer Jacket — деталь графики' },
  { src: 'assets/veast-premium/orbit-puffer-jacket-product.jpg', alt: 'VEAST Orbit Puffer Jacket — товар отдельно' },
];

if (lookbookImage && lookbookImages.length > 1) {
  lookbookImages.forEach((item) => {
    const preload = new Image();
    preload.src = item.src;
  });

  let currentLookbookIndex = 0;
  setInterval(() => {
    currentLookbookIndex = (currentLookbookIndex + 1) % lookbookImages.length;
    const nextImage = lookbookImages[currentLookbookIndex];
    lookbookImage.classList.add('is-switching');
    window.setTimeout(() => {
      lookbookImage.src = nextImage.src;
      lookbookImage.alt = nextImage.alt;
      lookbookImage.classList.remove('is-switching');
    }, 220);
  }, 4500);
}

