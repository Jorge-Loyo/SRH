/** @type {import('tailwindcss').Config} */
// Config dedicado a app/public/landing.html (portal de enlaces servido en "/").
// Separado del tailwind.config.js de la SPA a propósito: distinta paleta/fuente
// y así el purge no escanea ni infla el CSS del sistema React.
export default {
  // Resuelto relativo al cwd desde donde corre el CLI (frontend/, ver script "build:landing")
  content: ['../app/public/landing.html'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
      },
      colors: {
        brand: {
          fondo: '#0d2737',
          tituloverde: '#236231',
          tituloazul: '#213a4d',
          tituloamarillo: '#bb9109',
          fondoVerde: '#eef8f2',
          fondoAzul: '#eef0fa',
          fondoAmarillo: '#fcf8eb',
        },
      },
    },
  },
  plugins: [],
}
