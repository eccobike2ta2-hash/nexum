/* ============================================
   NEXUM — cart.js
   Shopping cart state and rendering (Fixed Order)
   ============================================ */

// 1. FUNCIÓN PUENTE GLOBAL PRIMERO (Para que las tarjetas la encuentren siempre)
window.agregarAlCarrito = function(id) {
  if (!window.NEXUM_PRODUCTS) {
    console.warn("Los productos de Google Sheets aún no se han cargado en la memoria.");
    return;
  }

  const producto = window.NEXUM_PRODUCTS.find(p => p.id === id);
  
  if (!producto) {
    console.error("No se encontró ningún producto con el ID:", id);
    return;
  }

  // Enviamos los datos directo al motor interno del carrito
  window.NexumCart.add(producto);

  if (typeof window.mostrarToast === 'function') {
    window.mostrarToast(`${producto.name} agregado`);
  } else {
    console.log(`Agregado con éxito: ${producto.name}`);
  }
};


// 2. MOTOR DEL CARRITO (MÓDULO INTERNO)
window.NexumCart = (function() {
  let items = [];

  // Costo fijo de envío, se cobra en todos los pedidos sin importar la zona
  const SHIPPING_COST = 7;

  function getItems() { return items; }

  function getSubtotal() {
    return items.reduce((sum, i) => sum + i.price * i.qty, 0);
  }

  function getShipping() {
    return items.length === 0 ? 0 : SHIPPING_COST;
  }

  // Total = subtotal de productos + envío
  function getTotal() {
    return getSubtotal() + getShipping();
  }

  function getCount() {
    return items.reduce((sum, i) => sum + i.qty, 0);
  }

  function add(product) {
    const existing = items.find(i => i.id === product.id);
    if (existing) {
      existing.qty++;
    } else {
      items.push({ 
        id: product.id,
        name: product.name,
        price: product.price,
        unit: product.unit,
        imgUrl: product.imgUrl, 
        qty: 1 
      });
    }
    render();
    updateBadge();
    const btn = document.getElementById('cartToggle');
  if (btn) { btn.classList.remove('bump'); void btn.offsetWidth; btn.classList.add('bump'); }
    localStorage.setItem('nexum_cart_items', JSON.stringify(items));
  }

  function remove(id) {
    items = items.filter(i => i.id !== id);
    render();
    updateBadge();
    localStorage.setItem('nexum_cart_items', JSON.stringify(items));
  }

  function changeQty(id, delta) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) { remove(id); return; }
    render();
    updateBadge();
    localStorage.setItem('nexum_cart_items', JSON.stringify(items));
  }

  function clear() {
    items = [];
    render();
    updateBadge();
    localStorage.removeItem('nexum_cart_items');
  }

  function updateBadge() {
    const count = getCount();
    const badge = document.getElementById('cartCount');
    if (!badge) return;
    badge.textContent = count;
    count > 0 ? badge.classList.add('visible') : badge.classList.remove('visible');
  }

  function render() {
    const container  = document.getElementById('cartItems');
    const footer     = document.getElementById('cartFooter');
    const empty      = document.getElementById('cartEmpty');
    const subtotalEl = document.getElementById('cartSubtotal');
    const shippingEl = document.getElementById('cartShipping');
    const totalEl    = document.getElementById('cartTotal');

    if (!container) return;

    const prevItems = container.querySelectorAll('.cart-item');
    prevItems.forEach(el => el.remove());

    if (items.length === 0) {
      empty.style.display = 'flex';
      footer.style.display = 'none';
      return;
    }

    empty.style.display = 'none';
    footer.style.display = 'block';

    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'cart-item';
      el.dataset.id = item.id;
      
      el.innerHTML = `
        <div class="ci-img-preview">
          <img src="${item.imgUrl || 'https://via.placeholder.com/50'}" alt="${item.name}" style="width:40px; height:40px; object-fit:cover; border-radius:8px;">
        </div>
        <div class="ci-info">
          <div class="ci-name">${item.name}</div>
          <div class="ci-price">$${(item.price * item.qty).toFixed(2)} <small>/ ${item.unit || 'ud'}</small></div>
        </div>
        <div class="ci-controls">
          <button class="qty-btn" data-action="minus" data-id="${item.id}">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" data-action="plus"  data-id="${item.id}">+</button>
        </div>
        <button class="ci-remove" data-id="${item.id}" aria-label="Eliminar">✕</button>
      `;
      container.appendChild(el);
    });

    if (subtotalEl) subtotalEl.textContent = '$' + getSubtotal().toFixed(2);
    if (shippingEl) shippingEl.textContent = '$' + getShipping().toFixed(2);
    if (totalEl)    totalEl.textContent    = '$' + getTotal().toFixed(2);

    container.querySelectorAll('.qty-btn').forEach(btn => {
      btn.onclick = () => changeQty(Number(btn.dataset.id), btn.dataset.action === 'plus' ? 1 : -1);
    });
    container.querySelectorAll('.ci-remove').forEach(btn => {
      btn.onclick = () => remove(Number(btn.dataset.id));
    });

    // Acción de Checkout para WhatsApp (MODIFICADO CON VALIDACIÓN DE DIRECCIÓN Y ENVÍO)
    const checkoutBtn = document.querySelector('.btn-checkout');
    if (checkoutBtn) {
      checkoutBtn.onclick = (e) => {
        e.preventDefault(); 
        if (items.length === 0) return;

        // Capturamos los campos de nombre y dirección del HTML
        const nameInput    = document.getElementById('cartName');
        const addressInput = document.getElementById('cartAddress');
        const nombreRecibe = nameInput ? nameInput.value.trim() : "";
        const address      = addressInput ? addressInput.value.trim() : "";

        // VALIDACIÓN OBLIGATORIA: nombre
        if (nombreRecibe === "") {
          alert("⚠️ ¡El nombre de quien recibe es obligatorio!");
          if (nameInput) {
            nameInput.style.borderColor = "#ff4d4d";
            nameInput.focus();
          }
          return;
        }

        // VALIDACIÓN OBLIGATORIA: dirección
        if (address === "") {
          alert("⚠️ ¡La dirección es obligatoria! Por favor, escribe dónde entregar el pedido en Manzanillo.");
          if (addressInput) {
            addressInput.style.borderColor = "#ff4d4d"; // Pone el borde rojo
            addressInput.focus();
          }
          return;
        }

        // Si escribió ambos campos, restauramos el color normal del borde
        if (nameInput) nameInput.style.borderColor = "#ccd9e6";
        if (addressInput) addressInput.style.borderColor = "#ccd9e6";

        // Pon tu número real de administración aquí
        const TELEFONO_NEXUM = "5353462071"; 

        let mensaje = `👋 ¡Hola Nexum! Me gustaría realizar el siguiente pedido:\n\n`;
        mensaje += `🙋 *Recibe:* ${nombreRecibe}\n`;
        mensaje += `📍 *Dirección de Entrega:* ${address}\n\n`;
        mensaje += `=========================\n`;

        items.forEach(item => {
          const subtotalItem = item.price * item.qty;
          mensaje += `▪️ ${item.qty}x ${item.name}\n`;
          mensaje += `   Precio (mercado local): $${item.price.toFixed(2)} / Subtotal: $${subtotalItem.toFixed(2)}\n\n`;
        });

        mensaje += `=========================\n`;
        mensaje += `Subtotal productos: $${getSubtotal().toFixed(2)}\n`;
        mensaje += `ℹ️ _Precios de mercado local, sujetos a disponibilidad del día._\n\n`;
        mensaje += `🛵 *Envío: $${getShipping().toFixed(2)}*\n`;
        mensaje += `💰 *Total a pagar: $${getTotal().toFixed(2)}*\n\n`;
        mensaje += `🛵 _Pedido listo para procesar en Manzanillo._`;

        const mensajeCodificado = encodeURIComponent(mensaje);
        const urlWhatsApp = `https://api.whatsapp.com/send?phone=${TELEFONO_NEXUM}&text=${mensajeCodificado}`;

        // Limpieza tras enviar
        if (nameInput) nameInput.value = ""; // Limpia el nombre
        if (addressInput) addressInput.value = ""; // Limpia la caja de texto
        clear(); // Vacía el carrito usando la función del motor

        // Cierra el sidebar del carrito visualmente
        const sidebar = document.getElementById('cartSidebar');
        const overlay = document.getElementById('cartOverlay');
        if (sidebar && overlay) {
          sidebar.classList.remove('open');
          overlay.classList.remove('open');
        }

        window.open(urlWhatsApp, '_blank');
      };
    }
  }

  function init() {
    const saved = localStorage.getItem('nexum_cart_items');
    if (saved) {
      try { items = JSON.parse(saved); } catch(e) { items = []; }
    }
    render();
    updateBadge();
  }

  setTimeout(init, 50);

  return { getItems, getSubtotal, getShipping, getTotal, getCount, add, remove, changeQty, clear, render };
})();
