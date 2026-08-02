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

## Desplegar en internet (para usarla desde el iPhone)

Para usar la app desde tu celular necesitas que quede accesible en una URL, no solo en `localhost`. La forma mas facil es con **Render**:

1. Crea una cuenta gratis en [render.com](https://render.com) y conectala con tu cuenta de GitHub.
2. En el dashboard elige **New > Blueprint** y selecciona este repositorio. Render detectara el archivo `render.yaml` incluido y configurara el servicio automaticamente (genera `JWT_SECRET` por ti).
3. Espera a que termine el build (unos minutos) y Render te dara una URL publica, por ejemplo `https://presupuesto-casa.onrender.com`.
4. Abre esa URL en Safari desde tu iPhone, crea tu cuenta y luego toca **Compartir > Anadir a pantalla de inicio** para instalarla como app.

**Importante sobre el plan gratuito de Render:** el disco no es persistente, asi que los datos (tus facturas y quincenas) se pueden borrar cuando el servicio se "duerme" por inactividad o cuando hay un nuevo deploy. Para guardar los datos de forma permanente, cambia el servicio a un plan pago (~$7 USD/mes) y activa el disco persistente que ya viene comentado en `render.yaml`.

**Alternativa con almacenamiento persistente mas barato:** [Railway](https://railway.app) permite anadir un volumen persistente aun en planes economicos. Solo necesitas crear un proyecto nuevo desde el repo, definir la variable de entorno `JWT_SECRET`, y montar un volumen en la carpeta `data/`.

## API

Todas las rutas bajo `/api/bills`, `/api/paydays` y `/api/dashboard` requieren el header `Authorization: Bearer <token>` obtenido en `/api/auth/login` o `/api/auth/register`.

- `POST /api/auth/register` / `POST /api/auth/login`
- `GET /api/bills` · `POST /api/bills` · `PUT /api/bills/:id` · `DELETE /api/bills/:id`
- `GET /api/paydays?month=YYYY-MM` · `POST /api/paydays` (reparte automáticamente) · `DELETE /api/paydays/:id`
- `GET /api/dashboard?month=YYYY-MM`
