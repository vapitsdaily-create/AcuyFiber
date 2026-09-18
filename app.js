/* AcuyFiber storefront. No backend, payment processing or hidden submissions. */
(() => {
  'use strict';

  const config = window.STORE_CONFIG;
  const products = window.CATALOG;
  if (!config || !Array.isArray(products)) {
    document.querySelector('#product-grid').textContent = 'Katalog belum dapat dimuat. Pastikan semua file website berada di folder yang sama.';
    return;
  }
  const byId = new Map(products.map(product => [product.id, product]));
  const categoryNames = { vas: 'Vas bunga', dekorasi: 'Dekorasi rumah', taman: 'Patung taman', trofi: 'Trofi & suvenir', all: 'Semua koleksi' };
  const styleNames = { natural: 'Natural yang hangat', minimalis: 'Putih yang tenang', klasik: 'Klasik yang berkarakter' };
  const maxQuantity = Number.isInteger(config.maxQuantity) ? Math.max(1, Math.min(config.maxQuantity, 999)) : 99;
  const state = {
    category: 'vas', style: null, sort: 'featured', cart: new Map(), favorites: new Set(),
    selectedProduct: null, detailQuantity: 1, heroIndex: 0,
    quoteItems: [], quoteDraft: null, quoteData: null, quoteReference: '',
  };
  const money = new Intl.NumberFormat(config.locale || 'id-ID', { style: 'currency', currency: config.currency || 'IDR', maximumFractionDigits: 0 });
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
  const icon = (name, extraClass = '') => `<svg class="icon ${extraClass}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const normalize = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('id-ID');
  const hasPrice = product => typeof product.price === 'number' && Number.isFinite(product.price) && product.price >= 0;
  const priceText = product => hasPrice(product) ? money.format(product.price) : 'Minta harga';
  const clampQuantity = value => Math.min(maxQuantity, Math.max(1, Math.floor(Number(value) || 1)));
  const totalCount = () => [...state.cart.values()].reduce((total, quantity) => total + quantity, 0);
  const validWhatsapp = () => {
    const number = String(config.whatsappNumber || '').replace(/[\s()+-]/g, '');
    return /^[1-9]\d{7,14}$/.test(number) ? number : '';
  };

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(config.storageKey) || 'null');
      if (!saved || saved.version !== 1) return;
      if (Array.isArray(saved.cart)) {
        for (const entry of saved.cart.slice(0, products.length)) {
          if (entry && byId.has(entry.id) && Number.isFinite(entry.quantity) && entry.quantity > 0) {
            state.cart.set(entry.id, clampQuantity(entry.quantity));
          }
        }
      }
      if (Array.isArray(saved.favorites)) {
        for (const id of saved.favorites.slice(0, products.length)) if (byId.has(id)) state.favorites.add(id);
      }
    } catch {
      // Storage can be blocked, unavailable, or contain data from a different version.
    }
  }

  function persistState() {
    try {
      localStorage.setItem(config.storageKey, JSON.stringify({
        version: 1,
        cart: [...state.cart].map(([id, quantity]) => ({ id, quantity })),
        favorites: [...state.favorites],
      }));
    } catch {
      // Current-session features continue to work even when persistence is unavailable.
    }
  }

  function syncCatalogLabels() {
    $$('.category-card').forEach(button => {
      const count = products.filter(product => product.category === button.dataset.category).length;
      const label = $('.category-count', button);
      if (label) label.textContent = `${count} karya pilihan`;
    });
    $$('#collection-menu [data-category]').forEach(button => {
      const label = $('span', button);
      if (label) label.textContent = String(products.filter(product => product.category === button.dataset.category).length).padStart(2, '0');
    });
    $$('[data-action="filter"] > span').forEach(label => {
      label.textContent = products.filter(product => product.category === label.parentElement.dataset.category).length;
    });
    const browseAll = $('.collection-bottom [data-category="all"]');
    if (browseAll) browseAll.innerHTML = `Jelajahi semua ${products.length} karya ${icon('arrow')}`;
  }

  function syncCounts() {
    const count = totalCount();
    $$('[data-cart-count]').forEach(element => { element.textContent = count; });
    $$('.cart-trigger').forEach(element => element.setAttribute('aria-label', `Buka keranjang, ${count} produk`));
    $$('[data-wishlist-count]').forEach(element => {
      element.textContent = state.favorites.size;
      element.hidden = state.favorites.size === 0;
    });
    $$('[data-action="favorite"]').forEach(button => {
      const saved = state.favorites.has(button.dataset.id);
      button.setAttribute('aria-pressed', String(saved));
      const product = byId.get(button.dataset.id);
      if (product && !button.classList.contains('detail-save')) button.setAttribute('aria-label', `${saved ? 'Hapus' : 'Simpan'} ${product.name} ${saved ? 'dari' : 'ke'} favorit`);
      if (button.classList.contains('detail-save')) button.innerHTML = `${icon('heart')} ${saved ? 'Tersimpan di favorit' : 'Simpan untuk nanti'}`;
    });
  }

  function closeCollections() {
    $('#collection-menu').hidden = true;
    $('[data-action="toggle-collections"]').setAttribute('aria-expanded', 'false');
  }

  function openDialog(id) {
    const target = document.getElementById(id);
    if (!target) return;
    closeCollections();
    $$('dialog[open]').forEach(dialog => { if (dialog !== target) dialog.close(); });
    if (!target.open) target.showModal();
    document.body.classList.add('modal-open');
  }

  function closeDialog(dialog) {
    if (dialog?.open) dialog.close();
    if (!$('dialog[open]')) document.body.classList.remove('modal-open');
  }

  function closeAllDialogs() {
    $$('dialog[open]').forEach(closeDialog);
    closeCollections();
  }

  let toastTimer;
  const toastElement = $('#toast-region');
  function toast(message, offerCart = false) {
    clearTimeout(toastTimer);
    const activeDialog = $('dialog[open]');
    (activeDialog || document.body).append(toastElement);
    toastElement.innerHTML = `${icon('check')}<span>${escape(message)}</span>${offerCart ? '<button data-action="cart">Lihat keranjang</button>' : ''}`;
    toastElement.classList.add('visible');
    toastTimer = setTimeout(() => { toastElement.classList.remove('visible'); }, 3400);
  }

  function productCard(product) {
    const saved = state.favorites.has(product.id);
    return `<article class="product-card" data-product-id="${product.id}">
      <div class="product-image-wrap">
        <button class="product-image-button" data-action="product" data-id="${product.id}" aria-label="Lihat detail ${escape(product.name)}">
          <img src="${product.thumbnail}" alt="${escape(product.alt)}" width="560" height="560" loading="lazy" decoding="async">
        </button>
        ${product.badge ? `<span class="product-badge">${escape(product.badge)}</span>` : ''}
        <button class="product-favorite" data-action="favorite" data-id="${product.id}" aria-pressed="${saved}" aria-label="${saved ? 'Hapus' : 'Simpan'} ${escape(product.name)} ${saved ? 'dari' : 'ke'} favorit">${icon('heart')}</button>
        <button class="quick-view" data-action="product" data-id="${product.id}">Lihat lebih dekat ${icon('arrow-up')}</button>
      </div>
      <div class="product-body"><p class="product-subtitle">${escape(product.subtitle)}</p>
        <h3 class="product-title"><button data-action="product" data-id="${product.id}">${escape(product.name)}</button></h3>
        <div class="product-bottom"><div class="price-block"><button class="product-price ${hasPrice(product) ? '' : 'quotation-price'}" data-action="product" data-id="${product.id}">${escape(priceText(product))}</button><span class="price-caption">${hasPrice(product) ? 'Belum termasuk pengiriman' : 'Sesuai detail pesanan'}</span></div><button class="add-circle" data-action="add" data-id="${product.id}" aria-label="Tambahkan ${escape(product.name)} ke keranjang">${icon('plus')}</button></div>
      </div></article>`;
  }

  function filteredProducts() {
    const result = products.filter(product =>
      (state.category === 'all' || product.category === state.category) &&
      (!state.style || product.styles.includes(state.style))
    );
    result.sort((first, second) => {
      if (state.sort === 'az') return first.name.localeCompare(second.name, 'id');
      if (state.sort === 'za') return second.name.localeCompare(first.name, 'id');
      if (state.sort === 'price-asc' || state.sort === 'price-desc') {
        if (!hasPrice(first) && !hasPrice(second)) return first.featured - second.featured;
        if (!hasPrice(first)) return 1;
        if (!hasPrice(second)) return -1;
        return state.sort === 'price-asc' ? first.price - second.price : second.price - first.price;
      }
      return first.featured - second.featured;
    });
    return result;
  }

  function renderCatalog() {
    const result = filteredProducts();
    $('#product-grid').innerHTML = result.length
      ? result.map(productCard).join('')
      : `<div class="empty-state">${icon('leaf')}<h3>Belum ada karya di sini.</h3><p>Coba kategori atau nuansa lainnya. Ada banyak sudut untuk dijelajahi.</p><button class="button button-primary" data-action="category" data-category="all">Lihat semua karya ${icon('arrow')}</button></div>`;
    $('#product-count').textContent = `${result.length} karya ${state.style ? `· ${styleNames[state.style]}` : 'untuk Anda'}`;
    const clearStyle = $('#clear-style');
    clearStyle.hidden = !state.style;
    $$('[data-action="filter"]').forEach(button => {
      const active = button.dataset.category === state.category;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function selectCategory(category, scroll = true) {
    if (!(category in categoryNames)) return;
    state.category = category;
    state.style = null;
    closeAllDialogs();
    renderCatalog();
    if (scroll) $('#koleksi').scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }

  function selectStyle(style) {
    if (!(style in styleNames)) return;
    state.style = style;
    state.category = 'all';
    closeAllDialogs();
    renderCatalog();
    $('#koleksi').scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }

  function reducedMotion() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  function setHeroSlide(index) {
    const slides = ['vas-lilit-flora', 'vas-cahaya-bambu', 'vas-kelopak-antik'];
    if (!Number.isInteger(index) || index < 0 || index >= slides.length) return;
    state.heroIndex = index;
    const product = byId.get(slides[index]);
    const image = $('#hero-photo');
    image.src = product.image;
    image.alt = product.alt;
    $('#hero-product-name').textContent = product.name;
    $('#hero-product-link').dataset.id = product.id;
    $('#hero-slide-number').textContent = String(index + 1).padStart(2, '0');
    $$('.slide-dot').forEach((button, itemIndex) => {
      button.classList.toggle('active', index === itemIndex);
      button.setAttribute('aria-pressed', String(index === itemIndex));
    });
  }

  function addToCart(id, quantity = 1) {
    const product = byId.get(id);
    if (!product) return;
    const before = state.cart.get(id) || 0;
    const after = Math.min(maxQuantity, before + clampQuantity(quantity));
    if (before >= maxQuantity) {
      toast(`Maksimal ${maxQuantity} pilihan per produk. Tulis jumlah tambahan pada catatan.`);
      return;
    }
    state.cart.set(id, after);
    persistState();
    syncCounts();
    if ($('#cart-dialog').open) renderCart();
    toast(`${product.name} ditambahkan ke keranjang${after - before < quantity ? ` (batas ${maxQuantity})` : ''}.`, true);
  }

  function toggleFavorite(id) {
    const product = byId.get(id);
    if (!product) return;
    const existed = state.favorites.has(id);
    if (existed) state.favorites.delete(id); else state.favorites.add(id);
    persistState();
    syncCounts();
    if ($('#wishlist-dialog').open) renderWishlist();
    toast(existed ? 'Produk dihapus dari favorit.' : 'Tersimpan di pilihan hati Anda.');
  }

  function quantityControl(id, quantity, context) {
    return `<div class="quantity-control" role="group" aria-label="Jumlah ${escape(byId.get(id)?.name || 'produk')}"><button data-action="quantity" data-context="${context}" data-id="${id}" data-delta="-1" aria-label="Kurangi jumlah ${escape(byId.get(id)?.name)}" ${quantity <= 1 ? 'disabled' : ''}>${icon('minus')}</button><span class="quantity-value" aria-live="polite">${quantity}</span><button data-action="quantity" data-context="${context}" data-id="${id}" data-delta="1" aria-label="Tambah jumlah ${escape(byId.get(id)?.name)}" ${quantity >= maxQuantity ? 'disabled' : ''}>${icon('plus')}</button></div>`;
  }

  function updateQuantity(button) {
    const { id, context } = button.dataset;
    if (!byId.has(id)) return;
    const delta = Number(button.dataset.delta);
    if (delta !== 1 && delta !== -1) return;
    if (context === 'detail') {
      state.detailQuantity = clampQuantity(state.detailQuantity + delta);
      const control = $('.quantity-control', $('#product-detail'));
      control.outerHTML = quantityControl(id, state.detailQuantity, 'detail');
    } else if (state.cart.has(id)) {
      state.cart.set(id, clampQuantity(state.cart.get(id) + delta));
      persistState();
      syncCounts();
      renderCart();
    }
    const root = context === 'detail' ? $('#product-detail') : $('#cart-items');
    const focusTarget = $(`[data-action="quantity"][data-id="${id}"][data-delta="${delta}"]:not(:disabled)`, root)
      || $(`[data-action="quantity"][data-id="${id}"]:not(:disabled)`, root);
    focusTarget?.focus({ preventScroll: true });
  }

  function cartRow(id, quantity) {
    const product = byId.get(id);
    return `<article class="cart-item"><button class="cart-item-image" data-action="product" data-id="${id}" aria-label="Detail ${escape(product.name)}"><img src="${product.thumbnail}" alt="${escape(product.alt)}" width="87" height="97"></button><div class="cart-item-info"><div class="cart-item-top"><h3><button data-action="product" data-id="${id}">${escape(product.name)}</button></h3><button class="remove-item" data-action="remove" data-id="${id}" aria-label="Hapus ${escape(product.name)} dari keranjang">${icon('trash')}</button></div><p>${escape(categoryNames[product.category])} · ${escape(product.color)}</p><div class="item-controls">${quantityControl(id, quantity, 'cart')}<span class="cart-item-price">${hasPrice(product) ? escape(money.format(product.price * quantity)) : 'Menunggu harga'}</span></div></div></article>`;
  }

  function renderCart() {
    const container = $('#cart-items');
    const footer = $('#cart-footer');
    if (!state.cart.size) {
      container.innerHTML = `<div class="empty-state">${icon('bag')}<h3>Ruang untuk pilihan Anda.</h3><p>Keranjang masih kosong. Mulai dari karya kecil yang membuat ruang terasa lebih berarti.</p><button class="button button-primary" data-action="category" data-category="vas">Jelajahi vas bunga ${icon('arrow')}</button></div>`;
      footer.innerHTML = '';
      footer.hidden = true;
      return;
    }
    footer.hidden = false;
    container.innerHTML = [...state.cart].map(([id, quantity]) => cartRow(id, quantity)).join('');
    const allPriced = [...state.cart.keys()].every(id => hasPrice(byId.get(id)));
    const total = [...state.cart].reduce((amount, [id, quantity]) => amount + (hasPrice(byId.get(id)) ? byId.get(id).price * quantity : 0), 0);
    footer.innerHTML = `<div class="cart-totals"><span>${state.cart.size} jenis · ${totalCount()} pilihan</span><strong>${allPriced ? escape(money.format(total)) : 'Harga melalui penawaran'}</strong></div><p class="small-note">${allPriced ? 'Subtotal belum termasuk ongkos kirim. ' : 'Belum ada harga final. '}Jumlah unit per paket, bahan, ukuran, ketersediaan, dan pengiriman dikonfirmasi sebelum pesanan disepakati.</p><button class="button button-primary" data-action="quote">Minta penawaran ${icon('arrow')}</button><button class="cart-continue" data-action="continue">Lanjutkan melihat koleksi</button>`;
  }

  function renderWishlist() {
    $('#wishlist-items').innerHTML = state.favorites.size ? [...state.favorites].map(id => {
      const product = byId.get(id);
      return `<article class="wishlist-item"><button data-action="product" data-id="${id}" aria-label="Detail ${escape(product.name)}"><img src="${product.thumbnail}" alt="${escape(product.alt)}" width="88" height="102"></button><div><h3><button data-action="product" data-id="${id}">${escape(product.name)}</button></h3><p>${escape(product.subtitle)}</p><div class="wishlist-item-actions"><button class="button button-outline" data-action="add" data-id="${id}">Ke keranjang ${icon('plus')}</button><button class="icon-button" data-action="favorite" data-id="${id}" aria-label="Hapus ${escape(product.name)} dari favorit" aria-pressed="true">${icon('trash')}</button></div></div></article>`;
    }).join('') : `<div class="empty-state">${icon('heart')}<h3>Mulai dari yang Anda suka.</h3><p>Ketuk ikon hati pada sebuah produk. Pilihan favorit akan tersimpan di browser ini.</p><button class="button button-primary" data-action="category" data-category="all">Temukan karya favorit ${icon('arrow')}</button></div>`;
  }

  function showProduct(id) {
    const product = byId.get(id);
    if (!product) return;
    state.selectedProduct = id;
    state.detailQuantity = 1;
    $('#product-detail').innerHTML = `<div class="detail-image"><img src="${product.image}" alt="${escape(product.alt)}" width="560" height="560"><span class="detail-image-caption">Foto referensi. Isi paket & aksesori dikonfirmasi terpisah.</span></div><div class="detail-copy"><button class="icon-button close-button" data-action="close" aria-label="Tutup detail produk">${icon('close')}</button><p class="eyebrow">KOLEKSI ACUYFIBER · ${escape(categoryNames[product.category])}</p><h2 id="detail-title">${escape(product.name)}</h2><p class="detail-subtitle">${escape(product.subtitle)}</p><p class="detail-price">${hasPrice(product) ? escape(money.format(product.price)) : 'Harga sesuai detail pesanan'}</p><p class="detail-price-note">${hasPrice(product) ? 'Belum termasuk pengiriman. Ketersediaan dikonfirmasi.' : 'Minta penawaran untuk harga dan ketersediaan.'}</p><p class="detail-description">${escape(product.description)}</p><dl class="detail-facts"><dt>Nuansa warna</dt><dd>${escape(product.color)}</dd><dt>Ukuran & bahan</dt><dd>Dikonfirmasi oleh toko</dd><dt>Ketersediaan</dt><dd>Ditanyakan saat penawaran</dd></dl><div class="detail-actions">${quantityControl(id, 1, 'detail')}<button class="button button-primary" data-action="add-detail" data-id="${id}">Tambah ke keranjang ${icon('bag')}</button></div><button class="detail-save" data-action="favorite" data-id="${id}" aria-pressed="${state.favorites.has(id)}">${icon('heart')} ${state.favorites.has(id) ? 'Tersimpan di favorit' : 'Simpan untuk nanti'}</button><p class="detail-note">${escape(product.note)}</p></div>`;
    $('#product-dialog').setAttribute('aria-labelledby', 'detail-title');
    $('#product-dialog').removeAttribute('aria-label');
    openDialog('product-dialog');
    $('#product-detail').scrollTop = 0;
  }

  function searchProducts(query) {
    const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
    return products.filter(product => {
      const haystack = normalize([product.name, product.description, product.subtitle, product.color, categoryNames[product.category], ...product.styles].join(' '));
      return terms.every(term => haystack.includes(term));
    });
  }

  function renderSearch() {
    const query = $('#search-input').value.trim();
    const results = query ? searchProducts(query) : products.slice(0, 6);
    $('#search-summary').textContent = query ? `${results.length} hasil untuk “${query}”` : 'Pilihan untuk memulai';
    $('#search-results').innerHTML = results.length ? results.map(product => `<button class="search-result" data-action="product" data-id="${product.id}"><img src="${product.thumbnail}" alt="" width="64" height="66"><div><h3>${escape(product.name)}</h3><p>${escape(categoryNames[product.category])} · ${escape(priceText(product))}</p></div>${icon('arrow-up')}</button>`).join('')
      : `<div class="empty-state">${icon('search')}<h3>Belum bertemu yang dicari.</h3><p>Coba kata yang lebih sederhana seperti “vas”, “emas”, “putih”, atau “bambu”.</p><button class="button button-outline" data-action="suggest" data-query="">Lihat karya pilihan</button></div>`;
  }

  function openSearch() {
    $('#search-input').value = '';
    renderSearch();
    openDialog('search-dialog');
    $('#search-input').focus();
  }

  function prepareQuote(fromCart = true) {
    state.quoteItems = fromCart ? [...state.cart].map(([id, quantity]) => ({ id, quantity })) : [];
    state.quoteDraft = null;
    state.quoteData = null;
    state.quoteReference = '';
    renderQuoteForm();
    openDialog('quote-dialog');
  }

  function renderQuoteForm() {
    const previous = state.quoteData || {};
    const hasItems = state.quoteItems.length > 0;
    const whatsapp = validWhatsapp();
    $('#quote-content').innerHTML = `<p class="quote-intro">${hasItems ? 'Pilihan Anda sudah terkumpul. Tambahkan detail agar toko dapat menyiapkan penawaran yang sesuai.' : 'Ceritakan sudut ruang, gaya, atau produk yang sedang Anda cari. Mulai dengan sebuah ringkasan kebutuhan.'}</p>
      ${!whatsapp ? `<div class="notice">${icon('info')}<p><strong>Mode pratinjau.</strong> Nomor WhatsApp toko belum diatur. Anda dapat membuat, menyalin, atau menyimpan ringkasan. Belum ada pesan atau pesanan yang dikirim.</p></div>` : `<div class="notice">${icon('info')}<p>Ini adalah permintaan penawaran, bukan pembayaran atau konfirmasi pesanan. Anda akan meninjau ringkasan sebelum membuka WhatsApp.</p></div>`}
      ${hasItems ? `<div class="quote-summary"><p>Pilihan Anda</p>${state.quoteItems.map(({ id, quantity }) => `<div class="quote-summary-item"><span>${escape(byId.get(id).name)}</span><span>× ${quantity}</span></div>`).join('')}</div>` : ''}
      <form class="quote-form" id="quote-form"><div class="quote-form-grid">
        <label class="form-field">Nama Anda <span class="sr-only">wajib diisi</span><input name="name" autocomplete="name" placeholder="Nama untuk permintaan penawaran" maxlength="80" required value="${escape(previous.name || '')}"></label>
        <label class="form-field">Nomor WhatsApp (opsional)<input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="08xxxxxxxxxx" maxlength="25" value="${escape(previous.phone || '')}"></label>
        <label class="form-field wide">Kota tujuan (opsional)<input name="city" autocomplete="address-level2" placeholder="Contoh: Bandung, Jawa Barat" maxlength="100" value="${escape(previous.city || '')}"><small>Untuk membantu konfirmasi pengiriman. Alamat lengkap belum diperlukan.</small></label>
        <label class="form-field wide">Ceritakan kebutuhan Anda${!hasItems ? ' (wajib)' : ' (opsional)'}<textarea name="notes" placeholder="Produk yang dicari, warna, ukuran, jumlah, atau nuansa ruangan…" maxlength="1500" ${!hasItems ? 'required' : ''}>${escape(previous.notes || '')}</textarea></label>
      </div><button class="button button-primary" type="submit">Buat ringkasan ${icon('arrow')}</button><p class="form-privacy">Data formulir tidak disimpan otomatis dan tidak dikirim ke server.<br>Anda memegang kendali atas ringkasan yang dibagikan.</p></form>`;
    $('#quote-form').addEventListener('submit', createQuote);
    $$('#quote-form input, #quote-form textarea').forEach(input => {
      input.addEventListener('input', () => input.setCustomValidity(''));
    });
  }

  function createQuote(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const details = {
      name: String(data.get('name') || '').trim().slice(0, 80),
      phone: String(data.get('phone') || '').trim().slice(0, 25),
      city: String(data.get('city') || '').trim().slice(0, 100),
      notes: String(data.get('notes') || '').trim().slice(0, 1500),
    };
    if (!details.name) {
      form.elements.name.setCustomValidity('Tuliskan nama Anda terlebih dahulu.');
      form.elements.name.reportValidity();
      return;
    }
    if (details.phone && !/^[+\d\s()-]{6,25}$/.test(details.phone)) {
      form.elements.phone.setCustomValidity('Gunakan angka, tanda +, spasi, atau tanda hubung untuk nomor telepon.');
      form.elements.phone.reportValidity();
      return;
    }
    if (!state.quoteItems.length && !details.notes) {
      form.elements.notes.setCustomValidity('Ceritakan produk atau kebutuhan dekorasi Anda.');
      form.elements.notes.reportValidity();
      return;
    }
    state.quoteData = details;
    const date = new Date();
    const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const randomPart = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 4).toUpperCase() : Math.random().toString(36).slice(2, 6).toUpperCase();
    state.quoteReference ||= `ACF-${datePart}-${randomPart}`;
    const lines = [
      `${String(config.name || 'AcuyFiber').toUpperCase()} — PERMINTAAN PENAWARAN`,
      `Referensi draf lokal: ${state.quoteReference}`,
      `Dibuat: ${date.toLocaleString('id-ID')}`,
      '',
      'DRAF LOKAL — BUKAN KONFIRMASI PESANAN / BUKTI PEMBAYARAN',
      '',
      `Nama: ${details.name}`,
      `WhatsApp: ${details.phone || 'Belum dicantumkan'}`,
      `Kota tujuan: ${details.city || 'Belum dicantumkan'}`,
      '',
      state.quoteItems.length ? 'PILIHAN PRODUK' : 'KONSULTASI DEKORASI',
    ];
    state.quoteItems.forEach(({ id, quantity }, index) => {
      const product = byId.get(id);
      lines.push(`${index + 1}. ${product.name} — ${quantity} pilihan`);
      lines.push(`   ${hasPrice(product) ? `Harga katalog: ${money.format(product.price)}; subtotal: ${money.format(product.price * quantity)}` : 'Harga: menunggu penawaran'}`);
      lines.push('   Jumlah unit per paket, ukuran, bahan, dan stok perlu dikonfirmasi.');
    });
    const allPriced = state.quoteItems.length > 0 && state.quoteItems.every(({ id }) => hasPrice(byId.get(id)));
    if (allPriced) {
      const subtotal = state.quoteItems.reduce((amount, { id, quantity }) => amount + byId.get(id).price * quantity, 0);
      lines.push('', `Subtotal katalog: ${money.format(subtotal)}`);
    }
    lines.push('', `Catatan: ${details.notes || 'Tidak ada catatan tambahan.'}`,
      '', 'Harga final, isi paket, ongkos kirim, metode pembayaran, serta waktu pengerjaan/pengiriman perlu disepakati dengan toko.',
      'Aksesori pada foto belum tentu termasuk. Mohon konfirmasi detail sebelum pembayaran.',
      '', 'Mohon informasikan penawaran dan ketersediaan. Terima kasih.');
    state.quoteDraft = lines.join('\n');
    renderQuoteResult();
  }

  function renderQuoteResult() {
    const whatsapp = validWhatsapp();
    $('#quote-content').innerHTML = `<div class="success-badge">${icon('check')}</div><h3 class="success-heading">Ringkasan Anda sudah siap.</h3><p class="success-copy">Ini masih draf di perangkat Anda—belum menjadi pesanan dan belum dikirim. Tinjau detail sebelum membagikannya kepada toko.</p><pre class="quote-output" id="quote-output" tabindex="0" aria-label="Ringkasan permintaan penawaran"></pre><div class="quote-result-actions"><button class="button button-primary" data-action="copy-quote">${icon('copy')} Salin ringkasan</button><button class="button button-outline" data-action="download-quote">${icon('download')} Simpan ringkasan (.txt)</button></div>${whatsapp ? `<a class="button button-primary quote-whatsapp" id="quote-whatsapp" target="_blank" rel="noopener noreferrer">${icon('message')} Lanjutkan ke WhatsApp</a><p class="form-privacy">WhatsApp akan terbuka dengan teks ringkasan. Anda tetap perlu menekan kirim sendiri.</p>` : `<div class="notice" style="margin-top:15px">${icon('info')}<p>Pengiriman WhatsApp belum aktif karena nomor toko belum diisi. Tidak ada pesanan yang dikirim otomatis.</p></div>`}<button class="quote-edit" data-action="edit-quote">Kembali mengubah detail</button>`;
    $('#quote-output').textContent = state.quoteDraft;
    if (whatsapp) $('#quote-whatsapp').href = `https://wa.me/${whatsapp}?text=${encodeURIComponent(state.quoteDraft)}`;
    $('#quote-dialog').scrollTop = 0;
    $('[data-action="copy-quote"]').focus({ preventScroll: true });
  }

  async function copyQuote() {
    if (!state.quoteDraft) return;
    let copied = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(state.quoteDraft);
        copied = true;
      }
    } catch { /* Fallback is useful for local-file previews and restricted browsers. */ }
    if (!copied) {
      const field = document.createElement('textarea');
      field.value = state.quoteDraft;
      field.style.cssText = 'position:fixed;left:0;top:0;opacity:0;pointer-events:none';
      $('#quote-dialog').append(field);
      field.focus();
      field.select();
      try { copied = document.execCommand('copy'); } catch { /* Browser may reject clipboard permissions. */ }
      field.remove();
    }
    if (copied) toast('Ringkasan disalin. Belum ada pesan yang dikirim.');
    else {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents($('#quote-output'));
      selection.removeAllRanges();
      selection.addRange(range);
      toast('Gunakan Ctrl+C atau Salin untuk menyalin teks yang dipilih.');
    }
    $('[data-action="copy-quote"]')?.focus({ preventScroll: true });
  }

  function downloadQuote() {
    if (!state.quoteDraft) return;
    const blob = new Blob(['\uFEFF', state.quoteDraft], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${state.quoteReference || 'acuyfiber'}-permintaan-penawaran.txt`;
    $('#quote-dialog').append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast('Ringkasan disiapkan untuk disimpan di perangkat.');
  }

  function dispatchAction(event) {
    const button = event.target.closest('[data-action]');
    if (!button || button.disabled) return;
    const action = button.dataset.action;
    const id = button.dataset.id;
    switch (action) {
      case 'toggle-collections': {
        const open = $('#collection-menu').hidden;
        $('#collection-menu').hidden = !open;
        button.setAttribute('aria-expanded', String(open));
        break;
      }
      case 'category': selectCategory(button.dataset.category); break;
      case 'filter': selectCategory(button.dataset.category, false); break;
      case 'style': selectStyle(button.dataset.style); break;
      case 'clear-style': state.style = null; renderCatalog(); break;
      case 'slide': setHeroSlide(Number(button.dataset.slide)); break;
      case 'product': showProduct(id); break;
      case 'favorite': toggleFavorite(id); break;
      case 'add': addToCart(id); break;
      case 'add-detail': addToCart(id, state.detailQuantity); break;
      case 'quantity': updateQuantity(button); break;
      case 'remove': {
        if (!state.cart.has(id)) break;
        const name = byId.get(id).name;
        state.cart.delete(id);
        persistState(); syncCounts(); renderCart();
        const focusTarget = $('#cart-items button') || $('#cart-dialog .close-button');
        focusTarget?.focus({ preventScroll: true });
        toast(`${name} telah dihapus dari keranjang.`);
        break;
      }
      case 'cart': renderCart(); openDialog('cart-dialog'); break;
      case 'wishlist': renderWishlist(); openDialog('wishlist-dialog'); break;
      case 'search': openSearch(); break;
      case 'suggest': $('#search-input').value = button.dataset.query || ''; renderSearch(); $('#search-input').focus(); break;
      case 'menu': openDialog('menu-dialog'); break;
      case 'close': closeDialog(button.closest('dialog')); break;
      case 'continue': closeAllDialogs(); break;
      case 'quote': if (state.cart.size) prepareQuote(true); break;
      case 'consult': prepareQuote(false); break;
      case 'edit-quote': renderQuoteForm(); break;
      case 'copy-quote': copyQuote(); break;
      case 'download-quote': downloadQuote(); break;
      case 'privacy': openDialog('info-dialog'); break;
      case 'clear-local': {
        if (!window.confirm('Hapus keranjang dan favorit AcuyFiber yang tersimpan di browser ini?')) break;
        state.cart.clear(); state.favorites.clear();
        try { localStorage.removeItem(config.storageKey); } catch { /* Keep current state cleared. */ }
        syncCounts(); renderCatalog(); renderCart(); renderWishlist();
        toast('Keranjang dan favorit di perangkat ini telah dihapus.');
        break;
      }
      default: break;
    }
  }

  document.addEventListener('click', dispatchAction);
  document.addEventListener('click', event => {
    if (!event.target.closest('.nav-collection')) closeCollections();
    const link = event.target.closest('[data-close-dialog]');
    if (link) closeDialog(link.closest('dialog'));
  });
  document.addEventListener('keydown', event => {
    // Keep keyboard focus within the active modal, including at tab boundaries.
    if (event.key === 'Tab') {
      const modal = $('dialog[open]');
      if (modal) {
        const focusable = $$('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])', modal)
          .filter(element => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden' && element.tabIndex >= 0);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (first && event.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) {
          event.preventDefault(); last.focus();
        } else if (first && !event.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) {
          event.preventDefault(); first.focus();
        }
      }
    }
    if (event.key === 'Escape') {
      const modal = $('dialog[open]');
      if (modal) {
        event.preventDefault();
        closeDialog(modal);
      }
      closeCollections();
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault(); openSearch();
    }
  });
  $$('dialog').forEach(dialog => {
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeDialog(dialog);
    });
    dialog.addEventListener('close', () => {
      if (!$('dialog[open]')) document.body.classList.remove('modal-open');
      if (dialog.contains(toastElement)) document.body.append(toastElement);
    });
  });
  $('#sort-select').addEventListener('change', event => {
    state.sort = event.target.value;
    renderCatalog();
    if (state.sort.startsWith('price') && filteredProducts().every(product => !hasPrice(product))) {
      toast('Harga belum diisi. Produk ditampilkan sesuai urutan pilihan.');
    }
  });
  $('#search-input').addEventListener('input', renderSearch);
  $('#search-input').addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const first = $('#search-results [data-action="product"]');
      if (first) showProduct(first.dataset.id);
    }
  });
  window.addEventListener('storage', event => {
    if (event.key !== config.storageKey && event.key !== null) return;
    state.cart.clear(); state.favorites.clear();
    loadState(); syncCounts(); renderCatalog();
    if ($('#cart-dialog').open) renderCart();
    if ($('#wishlist-dialog').open) renderWishlist();
  });

  // Contact destinations are opt-in: no demo phone number or email is exposed.
  function initializeStoreIdentity() {
    const storeName = String(config.name || 'AcuyFiber');
    $$('[data-store-name]').forEach(element => { element.textContent = storeName; });
    const contactMethods = $('#contact-methods');
    const whatsapp = validWhatsapp();
    if (whatsapp && contactMethods) {
      const link = document.createElement('a');
      link.className = 'contact-method';
      link.href = `https://wa.me/${whatsapp}`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'WhatsApp toko';
      contactMethods.append(link);
    }
    const email = String(config.contactEmail || '').trim();
    if (contactMethods && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !/[<>"\r\n]/.test(email)) {
      const link = document.createElement('a');
      link.className = 'contact-method';
      link.href = `mailto:${encodeURIComponent(email)}`;
      link.textContent = email;
      contactMethods.append(link);
    }
    if (contactMethods) contactMethods.hidden = !contactMethods.children.length;
  }

  initializeStoreIdentity();
  loadState();
  syncCatalogLabels();
  renderCatalog();
  syncCounts();
  $('#copyright-year').textContent = new Date().getFullYear();

  // Optional product deep link; no tracking or server call is made.
  const initialProduct = new URLSearchParams(window.location.search).get('product');
  if (initialProduct && byId.has(initialProduct)) showProduct(initialProduct);
})();
