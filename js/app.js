/* ==========================================================================
   NEXUM — app.js — versión definitiva móvil
   ========================================================================== */

const GOOGLE_SHEETS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQd6dWPINt3RRD_Ttx4S9n2ncALrHFl2k8E4qAB6bqsAH6NmzCjURunilyldWJrb5lVMTMr94ahRgEv/pub?gid=0&single=true&output=tsv";

const CATEGORIA_EMOJIS = {
  alimentos:         "🛍️",
  cárnicos:          "🥩",
  carnicos:          "🥩",
  bebidas:           "🥤",
  aseo:              "🧴",
  electrodomésticos: "📺",
  electrodomesticos: "📺",
  combos:            "📦",
  frutas:            "🍎",
  verduras:          "🥦",
  panadería:         "🍞",
  panaderia:         "🍞",
  lácteos:           "🥛",
  lacteos:           "🥛",
  otros:             "🏷️",
  enlatados:         "🥫",
  café:              "☕",
  granos:            "🫘",
};

// ── FILTRO ──
window.filtrarCategoria = function(filtro, elClicado) {
  document.querySelectorAll('.cat-card').forEach(c => c.classList.remove('active'));
  elClicado.classList.add('active');
  document.querySelectorAll('.product-card').forEach(tarjeta => {
    const mostrar = filtro === 'todos' || tarjeta.dataset.category === filtro;
    tarjeta.classList.toggle('oculto', !mostrar);
  });
};

// ── CARGA DESDE GOOGLE SHEETS ──
async function cargarProductosDesdeSheets() {
  try {
    const respuesta = await fetch(`${GOOGLE_SHEETS_URL}&t=${Date.now()}`, { cache: "no-store" });
    const textoTSV  = await respuesta.text();
    const filas     = textoTSV.split("\n").slice(1);

    window.NEXUM_PRODUCTS = filas.map(fila => {
      if (!fila.trim()) return null;
      const col = fila.split("\t");
      if (col.length < 6) return null;

      const visibleRaw = col[8] ? col[8].trim().toLowerCase() : "si";
      return {
        id:       parseInt(col[0].trim(), 10) || Date.now(),
        category: col[1] ? col[1].trim().toLowerCase() : "otros",
        imgUrl:   col[2] ? col[2].trim() : "",
        name:     col[3] ? col[3].replace(/"/g, "").trim() : "Producto sin nombre",
        desc:     col[4] ? col[4].replace(/"/g, "").trim() : "",
        price:    col[5] ? parseFloat(col[5].trim()) : 0.00,
        unit:     col[6] ? col[6].trim() : "unidad",
        badge:    col[7] ? col[7].trim() : "",
        visible:  visibleRaw !== "no",
      };
    }).filter(Boolean);

    renderizarCategorias();
    renderizarCatalogo();
    document.dispatchEvent(new CustomEvent('productosCargados'));
    quitarLoader();

  } catch (error) {
    console.error("Error cargando inventario:", error);
    quitarLoader();
  }
}

// ── CATEGORÍAS ──
function renderizarCategorias() {
  const grid = document.querySelector('.categories-grid');
  if (!grid) return;

  const todasLasCategorias = [...new Set(
    window.NEXUM_PRODUCTS.filter(p => p.visible).map(p => p.category)
  )];

  const categorias = [
    ...todasLasCategorias.filter(c => c !== "otros"),
    ...todasLasCategorias.filter(c => c === "otros")
  ];

  const html = `
    <div class="cat-card active" onclick="filtrarCategoria('todos', this)">
      <div class="cat-emoji">🔍</div>
      <span>Todos</span>
    </div>
    ${categorias.map(cat => {
      const emoji  = CATEGORIA_EMOJIS[cat] || "🏷️";
      const nombre = cat.charAt(0).toUpperCase() + cat.slice(1);
      return `
        <div class="cat-card" onclick="filtrarCategoria('${cat}', this)">
          <div class="cat-emoji">${emoji}</div>
          <span>${nombre}</span>
        </div>`;
    }).join('')}
  `;

  grid.innerHTML = html;
}

// ── CATÁLOGO ──
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
}

// ── LOADER ──
function quitarLoader() {
  const loader = document.getElementById('loader');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => loader.style.display = 'none', 300);
  }
}

// ── MENÚ MÓVIL ──
function configurarMenuMovil() {
  const hamburger  = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  if (hamburger && mobileMenu) {
    hamburger.onclick = () => {
      hamburger.classList.toggle('active');
      mobileMenu.classList.toggle('open');
    };
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.onclick = () => {
        hamburger.classList.remove('active');
        mobileMenu.classList.remove('open');
      };
    });
  }
}

// ── LOGO ANIMADO ──
function configurarLogoAnimado() {
  const brand = document.querySelector('.nav-inner .brand');
  if (!brand) return;

  const NEXUM_HTML = '<span class="brand-n">N</span>exum';

  const CARRO_HTML = `
    <div style="display:flex;align-items:center;gap:7px;line-height:1;">
      <svg width="44" height="28" viewBox="0 0 56 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Cuerpo principal -->
        <rect x="2" y="11" width="34" height="14" rx="3" fill="#0A66A4"/>
        <!-- Cabina -->
        <path d="M24 11 L24 5 Q24 3 26 3 L38 3 Q43 3 45 7 L47 11 Z" fill="#004B80"/>
        <!-- Ventana -->
        <path d="M27 5 L27 10 L41 10 L39 6 Q38 5 36 5 Z" fill="#E6F2FF" opacity="0.85"/>
        <!-- Lateral cabina -->
        <rect x="36" y="11" width="13" height="14" rx="2" fill="#004B80"/>
        <!-- Bumper delantero -->
        <rect x="47" y="19" width="3" height="4" rx="1" fill="#0A66A4"/>
        <!-- Línea decorativa -->
        <rect x="2" y="17" width="34" height="2" fill="#004B80" opacity="0.35"/>
        <!-- Rueda trasera -->
        <circle cx="11" cy="26" r="5" fill="#0F1D2A"/>
        <circle cx="11" cy="26" r="3" fill="#CCD9E6"/>
        <circle cx="11" cy="26" r="1.2" fill="#0F1D2A"/>
        <!-- Rueda delantera -->
        <circle cx="40" cy="26" r="5" fill="#0F1D2A"/>
        <circle cx="40" cy="26" r="3" fill="#CCD9E6"/>
        <circle cx="40" cy="26" r="1.2" fill="#0F1D2A"/>
      </svg>
      <span style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:20px;color:#0A66A4;letter-spacing:-0.5px;">Nexum</span>
    </div>`;

  const textos = [NEXUM_HTML, CARRO_HTML];
  let i = 0;

  setInterval(() => {
    i = (i + 1) % textos.length;
    brand.style.opacity = '0';
    brand.style.transform = 'translateY(-6px)';
    setTimeout(() => {
      brand.innerHTML = textos[i];
      brand.style.opacity = '1';
      brand.style.transform = 'translateY(0)';
    }, 300);
  }, 3000);
}

// ── BUSCADOR ──
function configurarBuscador() {
  const inputBuscar = document.getElementById('searchInput');
  if (!inputBuscar) return;

  inputBuscar.addEventListener('input', (e) => {
    const texto = e.target.value.toLowerCase().trim();
    document.querySelectorAll('.product-card').forEach(tarjeta => {
      const nombre = tarjeta.querySelector('.product-name')?.textContent.toLowerCase() || '';
      const desc   = tarjeta.querySelector('.product-desc')?.textContent.toLowerCase() || '';
      tarjeta.classList.toggle('oculto', !(nombre.includes(texto) || desc.includes(texto)));
    });
  });
}

// ── CARRITO SIDEBAR ──
function configurarAperturaCarrito() {
  const cartToggle  = document.getElementById('cartToggle');
  const cartClose   = document.getElementById('cartClose');
  const cartOverlay = document.getElementById('cartOverlay');
  const cartSidebar = document.getElementById('cartSidebar');

  function abrirCarrito() {
    cartSidebar.classList.add('open');
    cartOverlay.classList.add('open');
    history.pushState({ carrito: true }, '');
  }

  function cerrarCarrito() {
    cartSidebar.classList.remove('open');
    cartOverlay.classList.remove('open');
  }

  if (cartToggle) cartToggle.onclick = (e) => {
    e.preventDefault(); e.stopPropagation();
    abrirCarrito();
  };
  if (cartClose) cartClose.onclick = () => {
    cerrarCarrito();
    history.back();
  };
  if (cartOverlay) cartOverlay.onclick = () => {
    cerrarCarrito();
    history.back();
  };

  window.addEventListener('popstate', () => {
    if (cartSidebar.classList.contains('open')) cerrarCarrito();
  });
}

// ── TOAST ──
window.mostrarToast = function(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
};

// ── ARRANQUE ──
document.addEventListener('DOMContentLoaded', () => {
  configurarMenuMovil();
  configurarBuscador();
  configurarAperturaCarrito();
  cargarProductosDesdeSheets();
  configurarLogoAnimado();
});
