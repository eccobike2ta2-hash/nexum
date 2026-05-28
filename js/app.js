/* ==========================================================================
   NEXUM — app.js (Categorías dinámicas + columna "visible" desde Sheets)
   ========================================================================== */

const GOOGLE_SHEETS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQd6dWPINt3RRD_Ttx4S9n2ncALrHFl2k8E4qAB6bqsAH6NmzCjURunilyldWJrb5lVMTMr94ahRgEv/pub?gid=0&single=true&output=tsv";

// Emojis automáticos por nombre de categoría (ampliable)
const CATEGORIA_EMOJIS = {
  alimentos:        "🛍️",
  cárnicos:         "🥩",
  carnicos:         "🥩",
  bebidas:          "🥤",
  aseo:             "🧴",
  electrodomésticos:"📺",
  electrodomesticos:"📺",
  combos:           "📦",
  frutas:           "🍎",
  verduras:         "🥦",
  panadería:        "🍞",
  panaderia:        "🍞",
  lácteos:          "🥛",
  lacteos:          "🥛",
  otros:            "🏷️",
  enlatados:        "🥫",
  café:             "☕",
  granos:           "🫘",
};

// --- 1. CARGA DE DATOS ASÍNCRONA (GOOGLE SHEETS) ---
async function cargarProductosDesdeSheets() {
  try {
    const respuesta = await fetch(`${GOOGLE_SHEETS_URL}&t=${Date.now()}`, {
      cache: "no-store"
    });
    const textoTSV = await respuesta.text();

    const filas = textoTSV.split("\n").slice(1);

    window.NEXUM_PRODUCTS = filas.map(fila => {
      if (!fila.trim()) return null;

      const col = fila.split("\t");
      if (col.length < 6) return null;

      const visibleRaw = col[8] ? col[8].trim().toLowerCase() : "si";
      const visible = (visibleRaw !== "no");

      return {
        id:       parseInt(col[0].trim(), 10) || Date.now(),
        category: col[1] ? col[1].trim().toLowerCase() : "otros",
        imgUrl:   col[2] ? col[2].trim() : "",
        name:     col[3] ? col[3].replace(/"/g, "").trim() : "Producto sin nombre",
        desc:     col[4] ? col[4].replace(/"/g, "").trim() : "",
        price:    col[5] ? parseFloat(col[5].trim()) : 0.00,
        unit:     col[6] ? col[6].trim() : "unidad",
        badge:    col[7] ? col[7].trim() : "",
        visible
      };
    }).filter(p => p !== null);

    renderizarCategorias();  // 1ro: crea las cat-card y asigna el listener UNA SOLA VEZ
    renderizarCatalogo();    // 2do: crea las product-card

    document.dispatchEvent(new CustomEvent('productosCargados'));
    quitarLoader();

  } catch (error) {
    console.error("Error cargando el inventario de Google:", error);
    quitarLoader();
  }
}

// --- 2. CATEGORÍAS DINÁMICAS DESDE LOS DATOS ---
function renderizarCategorias() {
  const grid = document.querySelector('.categories-grid');
  if (!grid) return;

  const categorias = [...new Set(
    window.NEXUM_PRODUCTS
      .filter(p => p.visible)
      .map(p => p.category)
  )];

  const html = `
    <div class="cat-card" data-filter="todos">
      <div class="cat-emoji">🔍</div>
      <span>Todos</span>
    </div>
    ${categorias.map(cat => {
      const emoji = CATEGORIA_EMOJIS[cat] || "🏷️";
      const nombre = cat.charAt(0).toUpperCase() + cat.slice(1);
      return `
        <div class="cat-card" data-filter="${cat}">
          <div class="cat-emoji">${emoji}</div>
          <span>${nombre}</span>
        </div>`;
    }).join('')}
  `;

  grid.innerHTML = html;

  const primero = grid.querySelector('.cat-card');
  if (primero) primero.classList.add('active');

  // ✅ El listener se asigna aquí, UNA SOLA VEZ, después de crear el HTML
  configurarFiltrosCategorias();
}

// --- 3. RENDERIZADO DEL CATÁLOGO ---
function renderizarCatalogo() {
  const grid = document.getElementById('productsGrid') || document.querySelector('.products-grid');
  if (!grid) return;

  const productosVisibles = window.NEXUM_PRODUCTS.filter(p => p.visible);

  grid.innerHTML = productosVisibles.map(producto => `
    <div class="product-card" data-category="${producto.category}">
      <div class="product-img">
        ${producto.badge ? `<span class="product-badge">${producto.badge}</span>` : ''}
        <img src="${producto.imgUrl || 'https://via.placeholder.com/150'}" alt="${producto.name}" loading="lazy">
      </div>
      <div class="product-info">
        <h3 class="product-name">${producto.name}</h3>
        <p class="product-desc">${producto.desc}</p>
        <div class="product-footer">
          <span class="product-price">$${producto.price.toFixed(2)} <small>/ ${producto.unit}</small></span>
          <button class="add-btn" onclick="agregarAlCarrito(${producto.id})">+</button>
        </div>
      </div>
    </div>
  `).join('');

  // ✅ NO se llama configurarFiltrosCategorias() aquí — evita duplicar listeners
}

// --- 4. LOADER ---
function quitarLoader() {
  const loader = document.getElementById('loader');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => loader.style.display = 'none', 300);
  }
}

// --- 5. MENÚ MÓVIL ---
function configurarMenuMovil() {
  const hamburger  = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  if (hamburger && mobileMenu) {
    hamburger.onclick = () => {
      hamburger.classList.toggle('active');
      mobileMenu.classList.toggle('active');
    };
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.onclick = () => {
        hamburger.classList.remove('active');
        mobileMenu.classList.remove('active');
      };
    });
  }
}

// --- 6. FILTROS DE CATEGORÍAS ---
// ✅ Usa delegación de eventos: el listener va en el contenedor, no en cada tarjeta.
// Esto funciona tanto en desktop como en móvil, sin importar cuándo se creó el HTML.
function configurarFiltrosCategorias() {
  const catGrid = document.querySelector('.categories-grid');
  const prodGrid = document.getElementById('productsGrid') || document.querySelector('.products-grid');
  if (!catGrid || !prodGrid) return;

  catGrid.addEventListener('click', (e) => {
    const boton = e.target.closest('.cat-card');
    if (!boton) return;

    // Quitar activo de todos y activar el clickeado
    catGrid.querySelectorAll('.cat-card').forEach(b => b.classList.remove('active'));
    boton.classList.add('active');

    const filtro = boton.dataset.filter;

    // Filtrar productos
    prodGrid.querySelectorAll('.product-card').forEach(tarjeta => {
      const mostrar = filtro === 'todos' || tarjeta.dataset.category === filtro;
      tarjeta.style.display = mostrar ? 'flex' : 'none';
    });
  });
}

// --- 7. BUSCADOR ---
function configurarBuscador() {
  const inputBuscar = document.getElementById('searchInput');
  if (!inputBuscar) return;

  inputBuscar.oninput = (e) => {
    const texto = e.target.value.toLowerCase().trim();
    document.querySelectorAll('.product-card').forEach(tarjeta => {
      const nombre = tarjeta.querySelector('.product-name').textContent.toLowerCase();
      const desc   = tarjeta.querySelector('.product-desc').textContent.toLowerCase();
      tarjeta.style.display = (nombre.includes(texto) || desc.includes(texto)) ? 'flex' : 'none';
    });
  };
}

// --- 8. CARRITO SIDEBAR ---
function configurarAperturaCarrito() {
  const cartToggle  = document.getElementById('cartToggle');
  const cartClose   = document.getElementById('cartClose');
  const cartOverlay = document.getElementById('cartOverlay');
  const cartSidebar = document.getElementById('cartSidebar');

  if (cartToggle && cartSidebar && cartOverlay) {
    cartToggle.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      cartSidebar.classList.add('open');
      cartOverlay.classList.add('open');
    };
  }
  if (cartClose && cartSidebar && cartOverlay) {
    cartClose.onclick = () => {
      cartSidebar.classList.remove('open');
      cartOverlay.classList.remove('open');
    };
  }
  if (cartOverlay && cartSidebar) {
    cartOverlay.onclick = () => {
      cartSidebar.classList.remove('open');
      cartOverlay.classList.remove('open');
    };
  }
}

// --- 9. ARRANQUE ---
document.addEventListener('DOMContentLoaded', () => {
  configurarMenuMovil();
  configurarBuscador();
  configurarAperturaCarrito();
  cargarProductosDesdeSheets();
});
