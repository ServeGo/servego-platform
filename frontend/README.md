# Frontend (React + Vite + TailwindCSS)

## Initialize
From the repository root:

```bash
cd frontend
npm install
npm run dev
```

Then open the URL printed in the terminal (usually `http://localhost:5173`).

## Folder structure
```text
frontend/
│
├── public/
│
└── src/
    │
    ├── assets/
    │   (images, icons, etc.)
    │
    ├── components/
    │   (reusable UI pieces)
    │
    ├── pages/
    │   (route-level screens)
    │
    ├── layouts/
    │   (shared layout wrappers)
    │
    ├── hooks/
    │   (custom React hooks)
    │
    ├── services/
    │   (axios/api clients, data access)
    │
    ├── context/
    │   (React context providers)
    │
    ├── routes/
    │   (React Router route definitions)
    │
    ├── utils/
    │   (helpers: formatting, validators, etc.)
    │
    └── styles/
        (Tailwind entry + any global CSS)

    App.jsx
    main.jsx

├── package.json
└── vite.config.js
```

## Where to add features
- Pages: `src/pages/*`
- Components: `src/components/*`
- Routing: `src/routes/*` (then wire it in `src/main.jsx` / `src/App.jsx`)
- API/axios: `src/services/*`
- Global styles: `src/styles/index.css`

