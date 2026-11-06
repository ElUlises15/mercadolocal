# MercadoLocal · TodoHierro

Marketplace funcional de una única ferretería ficticia. Catálogo con 12 productos, búsqueda, categorías, orden por precio, detalle, carrito, checkout simulado y mostrador del vendedor. Precios en ARS y lenguaje rioplatense. No procesa pagos ni solicita datos personales.

## Ejecutar con backend local

Requiere Node.js 20 o superior y npm. Desde la raíz del proyecto:

```bash
cd server
npm install && npm start
```

Abrí **http://localhost:3847**. El servidor Express sirve también `frontend/`. SQLite se ejecuta mediante `sql.js`, sin compiladores, servicios externos ni cuentas pagas. La base se crea y carga automáticamente en `server/mercadolocal.sqlite`; cada escritura se persiste en disco. Se puede configurar `PORT` y `DB_PATH` por variables de entorno.

En **Mi mostrador**, ingresá la clave **demo**. Podés publicar productos, actualizar precio y stock, o marcar una unidad como vendida. Las fotos disponibles para nuevos productos son ilustrativas y reutilizan los cinco recursos generados.

## Frontend estático / GitHub Pages

Se publica **únicamente `frontend/`**. El workflow `.github/workflows/pages.yml` es manual (`workflow_dispatch`): tras subir el repositorio por tu cuenta, seleccioná GitHub Actions en Settings → Pages y ejecutá “Frontend en GitHub Pages”. No se ha hecho git push ni despliegue.

Para probar el frontend estático por separado:

```bash
python3 -m http.server 8080 --directory frontend
```

Abrí http://localhost:8080. Al iniciar, el frontend consulta `/api/health` con timeout. Si no responde con una API válida, utiliza los productos semilla y guarda productos, stock, ventas y carrito en `localStorage`. Funciona también bajo un subdirectorio de GitHub Pages gracias a recursos relativos y rutas hash. La API local se utiliza cuando el frontend se abre desde el servidor Node; Pages funciona de forma independiente, sin intentar acceder a localhost.

Los datos del modo estático pertenecen a ese navegador y origen; no se sincronizan con SQLite ni con otros dispositivos. Para reiniciar la demo estática, borrá las claves `th-products`, `th-orders` y `th-cart` del almacenamiento del sitio. Para reiniciar SQLite, detené el servidor y eliminá `server/mercadolocal.sqlite`.

## API

- `GET /api/health`: disponibilidad.
- `GET /api/products`: catálogo y existencias actuales.
- `POST /api/login`: `{ "password": "demo" }`, devuelve token de sesión.
- `POST /api/products`: publicar; requiere `Authorization: Bearer <token>`.
- `PATCH /api/products/:id`: actualizar; requiere token.
- `POST /api/checkout`: `{ "items": [{ "id": 1, "qty": 1 }] }`.

Checkout calcula precios en el servidor, combina cantidades repetidas y valida stock dentro de una transacción. Si cualquier producto falla, no descuenta ninguno. Registra el pedido en SQLite. “Marcar vendido” utiliza el mismo circuito de venta. Las sesiones del servidor se reinician al apagarlo.

La clave compartida y el modo local son deliberadamente de demostración: este proyecto está pensado para ejecución local y una muestra estática, sin cobros reales. Todas las páginas incluyen `noindex,nofollow`.

## Validación

```bash
cd server
npm test
```

Prueba sobre base temporal: autenticación, publicación, validación de stock, rollback completo, cantidades duplicadas y persistencia tras reiniciar el servidor. También se verificaron con navegador real carrito/checkout, panel vendedor, fallback sin API, persistencia local y vistas 1280/390 px.

## Diseño e imágenes

Paleta de etiquetas amarillas, verde de taller y metal claro; fotografía del local, tipografía condensada y nota manuscrita. Plan en `spec.md`.

Se generaron seis imágenes originales con la herramienta integrada imagegen, guardadas en `frontend/assets/images/`: `hero-local.png`, `taladro.png`, `pintura.png`, `tornillos.png`, `manguera.png` y `candado.png`. Prompts completos en `image-prompts.json`. Fotos ilustrativas generadas con IA, sin marcas comerciales. Tipografías de Google Fonts con alternativas del sistema si no hay conexión.
