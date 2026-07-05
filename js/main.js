/* ==========================================================================
   Funciones compartidas por todas las páginas
   ========================================================================== */

// Formatea un número como moneda (ajusta el símbolo si no usas MXN/USD)
function formatMoney(n) {
  return '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Escucha en tiempo real el documento de configuración del partido
// (equipos, si las apuestas están abiertas, y el resultado final)
function listenConfig(callback) {
  return db.collection('config').doc('partido').onSnapshot((doc) => {
    if (doc.exists) {
      callback(doc.data());
    } else {
      // Si no existe todavía, usamos valores por defecto
      callback({
        equipoA: 'Equipo A',
        equipoB: 'Equipo B',
        abierta: true,
        resultado: null
      });
    }
  });
}

// Escucha en tiempo real la lista completa de apuestas, ordenadas por fecha
function listenApuestas(callback) {
  return db.collection('apuestas').orderBy('timestamp', 'asc').onSnapshot((snapshot) => {
    const apuestas = [];
    snapshot.forEach((doc) => apuestas.push({ id: doc.id, ...doc.data() }));
    callback(apuestas);
  });
}

// Escucha en tiempo real todos los códigos de acceso generados por el admin
function listenCodigos(callback) {
  return db.collection('codigos').orderBy('creado', 'desc').onSnapshot((snapshot) => {
    const codigos = [];
    snapshot.forEach((doc) => codigos.push({ id: doc.id, ...doc.data() }));
    callback(codigos);
  });
}

// Genera un código de acceso aleatorio de 6 caracteres, fácil de leer en voz alta
// (evita caracteres que se confunden como 0/O o 1/I/L)
function generarCodigo() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let codigo = '';
  for (let i = 0; i < 6; i++) {
    codigo += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return codigo;
}

// Solo las apuestas ya VERIFICADAS por el admin cuentan para el bote y el reparto.
// Las "pendiente" (todavía sin confirmar el pago) no cuentan oficialmente.
function apuestasVerificadas(apuestas) {
  return apuestas.filter((a) => a.estado === 'verificada');
}

// Suma el monto total apostado (el bote) — SOLO cuenta apuestas verificadas
function calcularBote(apuestas) {
  return apuestasVerificadas(apuestas).reduce((total, a) => total + Number(a.monto || 0), 0);
}

// Dado un resultado real ("A", "B" o "EMPATE"), regresa quiénes acertaron
// SOLO entre las apuestas ya verificadas por el admin
function calcularGanadores(apuestas, resultado) {
  return apuestasVerificadas(apuestas).filter((a) => a.prediccion === resultado);
}

// Reparto PROPORCIONAL (estilo pari-mutuel / Polymarket): cada ganador
// recibe una parte del bote total proporcional a lo que él mismo apostó,
// comparado con el total apostado por todos los ganadores juntos.
// Devuelve un arreglo de ganadores con un campo extra "premio" agregado.
function calcularReparto(apuestas, resultado) {
  const bote = calcularBote(apuestas);
  const ganadores = calcularGanadores(apuestas, resultado);
  const totalGanadores = ganadores.reduce((sum, g) => sum + Number(g.monto || 0), 0);

  return ganadores.map((g) => {
    const proporcion = totalGanadores > 0 ? Number(g.monto) / totalGanadores : 0;
    return { ...g, premio: proporcion * bote, multiplicador: totalGanadores > 0 ? bote / totalGanadores : 0 };
  });
}

// Muestra un mensaje de éxito o error en un contenedor con clase .msg
function mostrarMensaje(el, texto, tipo) {
  el.textContent = texto;
  el.className = 'msg show ' + (tipo === 'ok' ? 'ok' : 'err');
}

// Marca el link activo en la barra de navegación según la página actual
function marcarNavActiva() {
  const pagina = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav.tabs a').forEach((a) => {
    if (a.getAttribute('href') === pagina) a.classList.add('active');
  });
}
document.addEventListener('DOMContentLoaded', marcarNavActiva);
