/* ==========================================================================
   Efecto de "flotación" — inclinación 3D sutil en las tarjetas al mover el
   mouse, para reforzar la sensación de profundidad del tema espacial.
   Se desactiva solo en pantallas táctiles y si el usuario prefiere menos
   movimiento (accesibilidad).
   ========================================================================== */

(function () {
  const prefiereMenosMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tieneMouse = window.matchMedia('(pointer: fine)').matches;
  if (prefiereMenosMovimiento || !tieneMouse) return;

  function activarFlotacion(el) {
    const intensidad = 6; // grados máximos de inclinación

    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.transform = `perspective(900px) rotateX(${(-y * intensidad).toFixed(2)}deg) rotateY(${(x * intensidad).toFixed(2)}deg) translateY(-2px)`;
    });

    el.addEventListener('mouseleave', () => {
      el.style.transform = '';
    });
  }

  function iniciar() {
    document.querySelectorAll('.card, .scoreboard').forEach(activarFlotacion);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
