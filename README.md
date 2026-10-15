# Finanzas personales — frontend

Aplicación web para registrar y visualizar ingresos y egresos personales.

## Stack

- React 19 + Vite
- JavaScript y JSX
- Tailwind CSS v4
- Componentes shadcn/ui
- Recharts

## Inicio local

El backend Laravel debe estar activo en `http://127.0.0.1:8000`.

```powershell
npm install
npm run dev
```

Abre la URL que indique Vite, normalmente `http://127.0.0.1:5173`.

La URL del API se configura en `.env`:

```env
VITE_API_URL=http://127.0.0.1:8000/api
```

Puedes partir de `.env.example` para crear el archivo local.

## Verificación

```powershell
npm run build
```
