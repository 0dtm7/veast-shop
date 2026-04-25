import { initCommon, productCard, products } from '../app.js';
initCommon('home');
document.getElementById('homeProducts').innerHTML = products.slice(0, 6).map(productCard).join('');
