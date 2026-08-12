# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## Deploy en Railway

1. Sube la carpeta `web-admin` a un repositorio y selecciónala como **Root Directory** en Railway.
2. Railway detectará `railway.json` y ejecutará el build y el servidor Node automáticamente.
3. Configura estas variables en Railway:
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (secreto; nunca usar una clave publicable aquí)
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
4. Ejecuta en Supabase, en orden, los archivos de `supabase/migrations`.
5. En Railway, genera un dominio desde **Settings > Networking**.

Railway proporciona `PORT`; el servidor Nitro lo usa automáticamente.
