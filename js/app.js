/* ==========================================================================
   NEXUM — app.js (Versión Unificada y Corregida)
   ========================================================================== */

const GOOGLE_SHEETS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQd6dWPINt3RRD_Ttx4S9n2ncALrHFl2k8E4qAB6bqsAH6NmzCjURunilyldWJrb5lVMTMr94ahRgEv/pub?gid=0&single=true&output=tsv";

// --- 1. CARGA DE DATOS ASÍNCRONA (GOOGLE SHEETS) ---
async function cargarProductosDesdeSheets() {
  try {
    const respuesta = await fetch(GOOGLE_SHEETS_URL);
    const textoTSV = await respuesta.text();
    
    const filas = textoTSV.split("\n").slice(1); 
    
    window.NEXUM_PRODUCTS = filas.map(fila => {
      if (!fila.trim()) return null;

      const columnas = fila.split("\t");
      if (columnas.length < 6) return null; 

      return {
        id: parseInt(columnas[0].trim(), 10),
        category: columnas[1] ? columnas[1].trim() : "otros",
        imgUrl: columnas[2] ? columnas[2].trim() : "", 
        name: columnas[3] ? columnas[3].replace(/"/g, "").trim() : "Producto sin nombre",
        desc: columnas[4] ? columnas[4].replace(/"/g, "").trim() : "",
        price: columnas[5] ? parseFloat(columnas[5].trim()) : 0.00,
        unit: columnas[6] ? columnas[6].trim() : "unidad",
        badge: columnas[7] ? columnas[7].trim() : ""
      };
    }).filter(p => p !== null);

    // Pintamos los productos en el HTML
    renderizarCatalogo();

    // Avisamos al sistema del carrito (cart.js)
    document.dispatchEvent(new CustomEvent('productosCargados'));
    
    // Ocultamos el loader inicial de Nexum ya que todo cargó con éxito
    quitarLoader();

  } catch (error) {
    console.error("Error cargando el inventario de Google:", error);
    quitarLoader(); 
  }
}

// --- 2. RENDERIZADO DEL CATÁLOGO ---
function renderizarCatalogo() {
  const grid = document.getElementById('productsGrid') || document.querySelector('.products-grid');
  if (!grid) return; 
  
  grid.innerHTML = window.NEXUM_PRODUCTS.map(producto => `
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

  // Inicializamos los filtros justo DESPUÉS de pintar las tarjetas en el DOM
  configurarFiltrosCategorias();
}

// --- 3. INTERFAZ Y NAVEGACIÓN (Menú Hamburguesa y Loader) ---
function quitarLoader() {
  const loader = document.getElementById('loader');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => loader.style.display = 'none', 300);
  }
}

function configurarMenuMovil() {
  const hamburger = document.getElementById('hamburger');
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

// --- 4. FILTROS DE CATEGORÍAS EN TIEMPO REAL ---
function configurarFiltrosCategorias() {
  const botonesClasificacion = document.querySelectorAll('.cat-card');
  const tarjetasProductos = document.querySelectorAll('.product-card');

  botonesClasificacion.forEach(boton => {
    boton.onclick = () => {
      botonesClasificacion.forEach(b => b.classList.remove('active'));
      boton.classList.add('active');

      const filtroSeleccionado = boton.dataset.filter;

      tarjetasProductos.forEach(tarjeta => {
        if (filtroSeleccionado === 'todos' || tarjeta.dataset.category === filtroSeleccionado) {
          tarjeta.style.display = 'flex';
        } else {
          tarjeta.style.display = 'none';
        }
      });
    };
  });
}

// --- 5. CONTROLADOR DEL MOTOR DE BÚSQUEDA ---
function configurarBuscador() {
  const inputBuscar = document.getElementById('searchInput');
  if (!inputBuscar) return;

  inputBuscar.oninput = (e) => {
    const texto = e.target.value.toLowerCase().trim();
    const tarjetasProductos = document.querySelectorAll('.product-card');

    tarjetasProductos.forEach(tarjeta => {
      const nombre = tarjeta.querySelector('.product-name').textContent.toLowerCase();
      const descripcion = tarjeta.querySelector('.product-desc').textContent.toLowerCase();

      if (nombre.includes(texto) || descripcion.includes(texto)) {
        tarjeta.style.display = 'flex';
      } else {
        tarjeta.style.display = 'none';
      }
    });
  };
}

// --- 6. CONTROL DE APERTURA Y CIERRE DEL CARRITO SIDEBAR ---
function configurarAperturaCarrito() {
  const cartToggle = document.getElementById('cartToggle');   
  const cartClose = document.getElementById('cartClose');     
  const cartOverlay = document.getElementById('cartOverlay'); 
  const cartSidebar = document.getElementById('cartSidebar'); 

  if (cartToggle && cartSidebar && cartOverlay) {
    cartToggle.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation(); // Evita interferencias con otros clicks de la interfaz
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

// --- 7. ARRANQUE UNIFICADO DEL DOM ---
document.addEventListener('DOMContentLoaded', () => {
  configurarMenuMovil();
  configurarBuscador();
  configurarAperturaCarrito(); // Se inicializa junto con el resto de la interfaz
  cargarProductosDesdeSheets(); 
});