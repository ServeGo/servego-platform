# Servego Backend

Express + MongoDB + JWT backend.

## Folder structure

```text
backend/
│
├── src/
│   │
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── validators/
│   │
│   ├── app.js
│   └── server.js
│
├── package.json
└── .env
```

## Environment variables

Create a file `backend/.env`:

```bash
PORT=5000
MONGODB_URI=mongodb://localhost:27017/servego
JWT_SECRET=replace-me
```

> Notes:
> - The app currently loads env vars using `dotenv`.
> - If your code uses additional variables in `src/config/env`, add them to `.env`.

## Setup

```bash
cd backend
npm i
```

## Run (dev)

```bash
cd backend
npm run dev
```

## Run (prod)

```bash
cd backend
npm start
```

## API health check

- `GET /health`

## Authentication

All auth endpoints are mounted under:

- `/auth`

