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

// Deja solo las apuestas que pertenecen al partido actual (por partidoId).
// Las apuestas viejas que no tengan partidoId (de antes de esta función)
// quedan fuera de las vistas en vivo — se conservan como historial.
function filtrarPorPartido(apuestas, partidoId) {
  if (!partidoId) return apuestas;
  return apuestas.filter((a) => a.partidoId === partidoId);
}

// Genera un identificador único y simple para un partido nuevo
function generarPartidoId() {
  return 'partido_' + Date.now();
}

// Convierte un PIN en un hash (SHA-256) antes de guardarlo o compararlo,
// para que el PIN nunca quede guardado en texto plano en la base de datos.
async function hashPin(pin) {
  const datos = new TextEncoder().encode(String(pin));
  const buffer = await crypto.subtle.digest('SHA-256', datos);
  return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// --- Cuentas de usuario (registro permanente, con saldo e historial) ---

// Escucha en tiempo real los datos de una cuenta específica (por cédula)
function listenUsuario(cedula, callback) {
  return db.collection('usuarios').doc(cedula).onSnapshot((doc) => {
    callback(doc.exists ? { id: doc.id, ...doc.data() } : null);
  });
}

// Escucha en tiempo real TODAS las cuentas registradas (para el admin)
function listenUsuarios(callback) {
  return db.collection('usuarios').orderBy('creado', 'desc').onSnapshot((snapshot) => {
    const usuarios = [];
    snapshot.forEach((doc) => usuarios.push({ id: doc.id, ...doc.data() }));
    callback(usuarios);
  });
}

// Escucha en tiempo real todas las solicitudes de recarga de saldo
function listenRecargas(callback) {
  return db.collection('recargas').orderBy('creado', 'desc').onSnapshot((snapshot) => {
    const recargas = [];
    snapshot.forEach((doc) => recargas.push({ id: doc.id, ...doc.data() }));
    callback(recargas);
  });
}

// Guarda/lee la sesión del usuario logueado (solo en este navegador)
function guardarSesion(cedula) {
  localStorage.setItem('quiniela_cedula_sesion', cedula);
}
function sesionActual() {
  return localStorage.getItem('quiniela_cedula_sesion');
}
function cerrarSesion() {
  localStorage.removeItem('quiniela_cedula_sesion');
}

// Calcula estadísticas de aciertos/fallas de un usuario, a partir de SU
// historial de apuestas verificadas y ya resueltas (partidos con resultado)
function calcularEstadisticasUsuario(historial) {
  const resueltas = historial.filter((h) => h.resultado); // solo partidos ya finalizados
  const ganadas = resueltas.filter((h) => h.prediccion === h.resultado);
  const total = resueltas.length;
  return {
    totalApuestas: historial.length,
    resueltas: total,
    ganadas: ganadas.length,
    perdidas: total - ganadas.length,
    porcentajeAciertos: total > 0 ? (ganadas.length / total) * 100 : 0,
    porcentajeFallas: total > 0 ? ((total - ganadas.length) / total) * 100 : 0
  };
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

// Suma cuánto dinero (ya verificado) se apostó a una predicción específica
// ("A", "B" o "EMPATE")
function totalPorPrediccion(apuestas, prediccion) {
  return apuestasVerificadas(apuestas)
    .filter((a) => a.prediccion === prediccion)
    .reduce((total, a) => total + Number(a.monto || 0), 0);
}

// Calcula el multiplicador POTENCIAL si esa predicción resultara ganadora
// (bote total ÷ lo apostado a esa predicción). Es una previa antes de que
// termine el partido — cambia en vivo según entran más apuestas.
function multiplicadorPotencial(apuestas, prediccion) {
  const bote = calcularBote(apuestas);
  const totalPrediccion = totalPorPrediccion(apuestas, prediccion);
  return totalPrediccion > 0 ? bote / totalPrediccion : null;
}
// Muestra un mensaje de éxito o error en un contenedor con clase .msg
function mostrarMensaje(el, texto, tipo) {
  el.textContent = texto;
  el.className = 'msg show ' + (tipo === 'ok' ? 'ok' : 'err');
}

// Muestra la bandera de un país en un elemento <img>, dado su código ISO.
// Si no hay código configurado todavía, oculta la imagen sin romper nada.
function mostrarBandera(idImg, codigo) {
  const img = document.getElementById(idImg);
  if (!img) return;
  if (codigo && typeof urlBandera === 'function') {
    img.src = urlBandera(codigo);
    img.style.display = 'inline-block';
  } else {
    img.style.display = 'none';
  }
}

// Marca el link activo en la barra de navegación según la página actual
function marcarNavActiva() {
  const pagina = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav.tabs a').forEach((a) => {
    if (a.getAttribute('href') === pagina) a.classList.add('active');
  });
}
document.addEventListener('DOMContentLoaded', marcarNavActiva);
