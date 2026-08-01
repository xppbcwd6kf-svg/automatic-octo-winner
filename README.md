# Presupuesto de la Casa

App web para organizar el presupuesto del hogar: registra tus facturas mensuales y, cada vez que recibes tu pago quincenal, la app reparte automáticamente la mitad del monto de cada factura y te muestra cuánto dinero te queda disponible.

## Cómo funciona

1. Creas una cuenta (correo y contraseña) para poder acceder desde cualquier dispositivo.
2. Registras tus facturas mensuales (renta, luz, agua, internet, etc.) con su monto mensual.
3. Cada quincena, cuando recibes tu dinero, registras la fecha y el monto recibido.
4. La app aparta automáticamente la mitad del monto mensual de cada factura activa y te muestra el total apartado y lo que te queda disponible para gastar.
5. El resumen del mes muestra el avance de ahorro de cada factura (cuánto llevas apartado vs. el total que necesitas) y marca como "Cubierta" las que ya juntaste completas.

## Stack

- Backend: Node.js + Express + SQLite (`better-sqlite3`), autenticación con JWT.
- Frontend: HTML/CSS/JS sin build (servido como archivos estáticos por Express).

## Instalación y uso local

```bash
npm install
cp .env.example .env   # ajusta JWT_SECRET si quieres
npm start
```

Abre http://localhost:3000 en el navegador.

Los datos se guardan en un archivo SQLite en `data/budget.db` (se crea automáticamente).

## API

Todas las rutas bajo `/api/bills`, `/api/paydays` y `/api/dashboard` requieren el header `Authorization: Bearer <token>` obtenido en `/api/auth/login` o `/api/auth/register`.

- `POST /api/auth/register` / `POST /api/auth/login`
- `GET /api/bills` · `POST /api/bills` · `PUT /api/bills/:id` · `DELETE /api/bills/:id`
- `GET /api/paydays?month=YYYY-MM` · `POST /api/paydays` (reparte automáticamente) · `DELETE /api/paydays/:id`
- `GET /api/dashboard?month=YYYY-MM`
