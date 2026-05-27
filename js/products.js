const GOOGLE_SHEETS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQd6dWPINt3RRD_Ttx4S9n2ncALrHFl2k8E4qAB6bqsAH6NmzCjURunilyldWJrb5lVMTMr94ahRgEv/pub?gid=0&single=true&output=tsv";

async function cargarProductosDesdeSheets() {
  try {
    const respuesta = await fetch(GOOGLE_SHEETS_URL);
    const textoTSV = await respuesta.text();
    
    // Separamos por filas omitiendo los encabezados
    const filas = textoTSV.split("\n").slice(1); 
    
    window.NEXUM_PRODUCTS = filas.map(fila => {
      if (!fila.trim()) return null;

      // Separamos por tabulador (Formato TSV)
      const columnas = fila.split("\t");
      if (columnas.length < 6) return null; // Validación mínima de seguridad

      return {
        id: parseInt(columnas[0].trim(), 10) || Date.now(),
        category: columnas[1] ? columnas[1].trim() : "otros",
        imgUrl: columnas[2] ? columnas[2].trim() : "", 
        name: columnas[3] ? columnas[3].replace(/"/g, "").trim() : "Producto sin nombre",
        desc: columnas[4] ? columnas[4].replace(/"/g, "").trim() : "",
        price: columnas[5] ? parseFloat(columnas[5].trim()) : 0.00,
        unit: columnas[6] ? columnas[6].trim() : "unidad",
        badge: columnas[7] ? columnas[7].trim() : ""
      };
    }).filter(p => p !== null);

    // 1. Pintamos las tarjetas reales en el HTML usando el contenedor correcto
    renderizarCatalogo();

    // 2. Despertamos al carrito avisándole que los productos ya existen
    document.dispatchEvent(new CustomEvent('productosCargados'));
    
  } catch (error) {
    console.error("Error cargando el inventario de Google:", error);
  }
}

// Función única encargada de inyectar el HTML dinámico
function renderizarCatalogo() {
  // Buscamos primero por ID (que es el que tiene tu sección de productos) o por clase como respaldo
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
}

// Una única llamada para inicializar la carga al abrir la página
cargarProductosDesdeSheets();