# ⚽ Quiniela Final Mundial 2026

Sistema simple de apuestas grupales para la final del Mundial 2026. Cada
participante entra desde su celular o computadora, registra su nombre, su
aportación al bote y su predicción (equipo A, equipo B o empate). Al terminar
el partido, el administrador registra el resultado real y el sistema reparte
el bote **en partes iguales entre todos los que acertaron**.

## Páginas

- `index.html` — Página principal: marcador en vivo del bote y formulario para apostar (con o sin cuenta).
- `apuestas.html` — Lista transparente de todas las apuestas registradas, con resumen de dinero y multiplicador potencial por equipo.
- `resultados.html` — Muestra el resultado final y cuánto le toca a cada ganador.
- `registro.html` — Crear una cuenta (nombre, apellido, cédula, teléfono, correo, país y PIN de 4 dígitos).
- `login.html` — Iniciar sesión con cédula + PIN.
- `perfil.html` — Saldo, historial de apuestas, % de aciertos/fallas, y solicitud de recarga de saldo.
- `admin.html` — Panel protegido con contraseña para configurar el partido, gestionar códigos de acceso, verificar apuestas y recargas, gestionar usuarios, e ingresar el resultado final.

## Cuentas de usuario y billetera (nuevo)

Además de apostar como invitado (con código de acceso, igual que antes), ahora cualquier persona puede **crear una cuenta permanente**:

- Al crear la cuenta, empieza con **saldo $0**.
- Desde su perfil, puede **solicitar una recarga** de saldo — tú la apruebas desde el admin después de que te paguen por fuera del sistema, y el monto se suma automáticamente a su saldo.
- Al apostar con su cuenta, el monto se **descuenta de su saldo al momento** (ya no hace falta que verifiques el pago de esa apuesta en particular, porque el dinero ya viene de un saldo que tú mismo aprobaste antes) — pero **todavía necesita un código de acceso** para registrar la apuesta, igual que los invitados.
- Cuando registras el resultado final del partido, el sistema **acredita automáticamente el premio ganado directo al saldo** de cada ganador que tenga cuenta.
- El perfil de cada usuario guarda su historial completo de apuestas, cuántas ganó/perdió, y sus porcentajes de aciertos y fallas — pensado para ir creciendo partido tras partido, no solo esta final.
- Quien prefiera **no registrarse**, puede darle a "Omitir registro y apostar directo" y usar el sistema exactamente como antes (código + datos + verificación manual del pago).

**Nota de seguridad honesta (igual que con la clave de admin):** el login de cédula + PIN no usa autenticación real de servidor (Firebase Authentication) — es una verificación simple contra la base de datos, protegida solo por reglas de Firestore. El PIN se guarda cifrado (hash), nunca en texto plano, pero técnicamente alguien con conocimientos técnicos podría leer la lista de cuentas registradas (nombre, cédula, teléfono, correo) desde la consola del navegador. Para un grupo de amigos esto es un riesgo bajo y razonable; si más adelante quieres subir el nivel de seguridad, Firebase Authentication es el siguiente paso.

## Paso 1: Crear tu base de datos gratuita en Firebase

Este sistema necesita un lugar compartido donde se guarden las apuestas de
todos (no puede ser el navegador de una sola persona). Usamos **Firebase
Firestore**, que tiene un plan gratuito más que suficiente para un grupo de
amigos.

1. Ve a [https://console.firebase.google.com](https://console.firebase.google.com) e inicia sesión con una cuenta de Google.
2. Clic en **"Agregar proyecto"**, ponle un nombre (ej. `quiniela-mundial-2026`) y créalo.
3. En el menú lateral, ve a **Compilación > Firestore Database**.
4. Clic en **"Crear base de datos"**.
   - Elige una ubicación (cualquiera cercana a ti está bien).
   - Selecciona **"Iniciar en modo de prueba"** (esto permite leer/escribir
     libremente por 30 días; ver la sección de seguridad más abajo para
     dejarlo funcionando después de esos 30 días).
5. En el menú lateral, ve a **Configuración del proyecto** (ícono de engrane, arriba a la izquierda).
6. Baja hasta **"Tus apps"**, clic en el ícono `</>` (Web).
7. Ponle un apodo a la app (ej. "quiniela-web") y clic en **"Registrar app"**.
8. Firebase te va a mostrar un bloque de código con un objeto `firebaseConfig`. Cópialo completo.

## Paso 2: Pegar tu configuración

Abre el archivo `js/firebase-config.js` y reemplaza el objeto de ejemplo con
el que copiaste de Firebase:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "quiniela-mundial-2026.firebaseapp.com",
  projectId: "quiniela-mundial-2026",
  storageBucket: "quiniela-mundial-2026.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

En el mismo archivo, cambia también la contraseña de administrador:

```javascript
const ADMIN_PASSWORD = "pon-aqui-tu-propia-clave";
```

## Paso 3: Probarlo en tu computadora (local)

No puedes simplemente abrir `index.html` haciendo doble clic (los navegadores
bloquean algunas cosas al abrir archivos directamente). Necesitas un
servidor local muy simple. Si tienes Python instalado, desde la carpeta del
proyecto ejecuta:

```bash
python3 -m http.server 8000
```

Y abre `http://localhost:8000` en tu navegador.

Si tienes Node.js, también puedes usar:

```bash
npx serve
```

## Paso 4: Reglas de seguridad de Firestore (importante)

Por defecto, el "modo de prueba" deja de funcionar después de 30 días. Antes
de que eso pase (o desde ya, para más seguridad), ve a **Firestore Database
> Reglas** en la consola de Firebase y pega esto:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /apuestas/{apuestaId} {
      allow read: if true;
      allow create: if request.resource.data.monto is number
                    && request.resource.data.monto >= 1
                    && request.resource.data.monto <= 10000000
                    && request.resource.data.nombre is string
                    && request.resource.data.estado == 'pendiente'
                    && request.resource.data.prediccion in ['A', 'B', 'EMPATE'];
      allow update, delete: if true; // el panel admin necesita poder verificar/rechazar (ver nota abajo)
    }
    match /codigos/{codigoId} {
      allow read: if true;
      allow create, update, delete: if true; // el panel admin genera y actualiza códigos (ver nota abajo)
    }
    match /config/{doc} {
      allow read: if true;
      allow write: if true; // ver nota de seguridad abajo
    }
    match /usuarios/{cedula} {
      allow read: if true;
      allow create: if request.resource.data.saldo == 0
                    && request.resource.data.nombre is string
                    && request.resource.data.cedula is string
                    && request.resource.data.pin is string;
      allow update, delete: if true; // saldo se ajusta desde apuestas, recargas y el panel admin (ver nota abajo)
    }
    match /recargas/{recargaId} {
      allow read: if true;
      allow create: if request.resource.data.monto is number
                    && request.resource.data.monto >= 1
                    && request.resource.data.monto <= 10000000
                    && request.resource.data.estado == 'pendiente';
      allow update, delete: if true; // el panel admin aprueba/rechaza (ver nota abajo)
    }
  }
}
```

**Nota de seguridad honesta:** estas reglas evitan que alguien meta datos
basura por accidente, y el sistema de **código de acceso de un solo uso**
evita que gente ajena al grupo (o que se haga pasar por otra persona)
registre una apuesta sin que tú se lo hayas autorizado primero. Aun así,
como el panel de admin solo esconde sus botones detrás de una contraseña en
el navegador (no es una autenticación real de servidor), alguien con
conocimientos técnicos podría editar el resultado final, verificar apuestas
falsas o generar códigos directamente desde la consola del navegador. Para
un grupo de amigos de confianza esto es normal y suficiente. Si quisieras
una seguridad más fuerte (por ejemplo, un grupo grande o dinero
considerable), el siguiente paso sería agregar **Firebase Authentication**
para el login del administrador, lo cual es más avanzado.

## Paso 5: Subir a GitHub y publicarlo con GitHub Pages

```bash
git init
git add .
git commit -m "Quiniela final Mundial 2026"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

Luego, en GitHub:
1. Ve a tu repositorio > **Settings > Pages**.
2. En "Source", elige la rama `main` y la carpeta `/ (root)`.
3. Guarda. En un par de minutos tu sitio estará en
   `https://TU_USUARIO.github.io/TU_REPO/`.

Comparte ese link con tu grupo para que todos puedan apostar desde su
celular.

## Cómo usarlo el día del partido

1. Antes de que empiece el partido: entra a `admin.html`, configura los
   nombres de los dos equipos y guarda.
2. **Genera un código de acceso por cada persona que va a apostar** (sección
   "Códigos de acceso" en `admin.html`). Entrégale su código a cada quien en
   persona o por WhatsApp — ese código es de un solo uso.
3. Comparte el link principal (`index.html`) con el grupo. Cada quien
   necesita SU propio código para poder registrar su apuesta; sin código
   válido no se puede apostar.
4. Cuando alguien registra su apuesta, queda como **"Pendiente"** — todavía
   no cuenta para el bote. Ve a `admin.html`, sección "Apuestas pendientes
   de verificar", y dale clic en **"Verificar"** solo después de confirmar
   que esa persona ya te pagó de verdad. Si algo no cuadra, usa "Rechazar"
   (borra la apuesta y libera el código para volver a usarlo).
5. Un rato antes de que arranque el partido, entra a `admin.html` y
   **cierra las apuestas** para que nadie apueste tarde.
6. Al terminar el partido, entra a `admin.html` y **registra el resultado
   final** (quién ganó o si fue empate).
7. Todos pueden ver el reparto automático del premio en `resultados.html`
   (solo se toman en cuenta las apuestas ya verificadas).
8. El dinero se entrega por fuera del sistema (efectivo, transferencia,
   etc.) — el sistema solo calcula cuánto le toca a cada quien.

## Reglas de la quiniela (resumen)

- Cada persona necesita un **código de acceso único**, generado por el
  administrador, para poder registrar su apuesta. Esto evita que alguien
  ajeno al grupo apueste, o que alguien se haga pasar por otra persona.
- Cada apuesta empieza como **"Pendiente"** y solo cuenta para el bote y el
  reparto una vez que el administrador la marca como **"Verificada"**
  (después de confirmar que la persona pagó de verdad).
- Cada persona apuesta una sola vez (por nombre).
- Se apuesta solo por el ganador (equipo A, equipo B o empate) — no por marcador exacto.
- Cada quien apuesta el monto que quiera, no hay un monto fijo.
- El bote es la suma de todo lo que aportaron los participantes **verificados** (ganadores y perdedores).
- El reparto es **proporcional a lo apostado** (estilo "pari-mutuel", como Polymarket y la mayoría de casas de apuestas): cada ganador recibe `(lo que apostó ÷ total apostado por todos los ganadores) × bote total`. Todos los ganadores obtienen el mismo multiplicador sobre su apuesta, pero quien arriesgó más en pesos, gana más en pesos.
- Si nadie acierta, no se reparte nada (puedes decidir manualmente qué hacer con el bote en ese caso).
