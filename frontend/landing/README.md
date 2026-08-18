# Build de Tailwind para la landing page

`app/public/landing.html` (la página que se sirve en `/`) usa clases de Tailwind,
pero **no** forma parte de la SPA de React — es HTML estático. Para no depender
del CDN de Tailwind (bloqueado por la CSP del backend) se compila un CSS propio
y chico, aparte del build de la SPA, usando este config dedicado.

## Cómo regenerar `app/public/landing/landing.css`

Cada vez que cambies clases de Tailwind en `app/public/landing.html`:

```bash
cd frontend
npm run build:landing
```

Esto lee `landing/tailwind.config.js` (que apunta a `app/public/landing.html`
como fuente de clases) y `landing/input.css`, y escribe el resultado minificado
en `app/public/landing/landing.css`. Ese archivo **se versiona en git** (no hay
paso de build de frontend en el CI/CD, así que el CSS compilado tiene que estar
commiteado, igual que las imágenes y la fuente en `app/public/landing/`).
