# ServeGo Platform

ServeGo is a platform that connects customers with trusted service providers such as electricians, plumbers, carpenters, AC technicians, cleaners, and other skilled professionals.

---

## Team Members

* Member 1 :kurma
* Member 2 :Aravind
* Member 3 :prasad
* Member 4 :Gupta
* Member 5 :Purna

---

## Tech Stack

### Frontend

* React
* Vite
* Tailwind CSS

### Backend

* Node.js
* Express.js

### Database

* MongoDB

### Authentication

* JWT

### Version Control

* Git & GitHub

---

## Initial Setup Guide

### Step 1: Install Required Software

#### Node.js (Required)

Download and install the latest LTS version:

https://nodejs.org

Verify installation:

```bash
node -v
npm -v
```

#### Git

Download and install Git:

https://git-scm.com/downloads

Verify installation:

```bash
git --version
```

#### VS Code

Download:

https://code.visualstudio.com

Recommended Extensions:

* ESLint
* Prettier
* GitLens
* Tailwind CSS IntelliSense

---

## Clone the Repository

Create a working folder.

Example:

```text
C:\Downloads\Projects
```

Open Command Prompt:

```bash
cd C:\Downloads\Projects
```

Clone repository:

```bash
git clone https://github.com/ServeGo/servego-platform.git
```

Move into project:

```bash
cd servego-platform
```

---

## Project Structure

```text
servego-platform/
│
├── frontend/
├── backend/
├── docs/
├── README.md
└── .gitignore
```

---

## Frontend Setup

Navigate to frontend:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Run frontend:

```bash
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

---

## Backend Setup

Open a new terminal.

Navigate to backend:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Start backend:

```bash
npm run dev
```

Backend URL:

```text
http://localhost:5000
```

---

## Backend README

Backend-specific setup, env variables, and folder structure are documented here:

- `backend/README.md`

---

## Git Workflow

Never work directly on main.

Create a branch:

```bash
git checkout -b bugfix/your-bugfix-name
```

Examples:

```bash
git checkout -b bugfix/homepage
```

```bash
git checkout -b bugfix/authentication
```

```bash
git checkout -b bugfix/provider-dashboard
```

---

## Commit Changes

Check status:

```bash
git status
```

Add files:

```bash
git add .
```

Commit:

```bash
git commit -m "Added login page"
```

Push:

```bash
git push origin bugfix/authentication
```

---

## Pull Latest Changes

Before starting work every day:

```bash
git checkout main
git pull origin main
```

Switch back to your branch:

```bash
git checkout bugfix/your-bugfix-name
```

---

## Important Team Rules

1. Never push directly to main.
2. Always create a bugfix branch.
3. Pull latest changes before starting work.
4. Write meaningful commit messages.
5. Test your code before pushing.
6. Create a Pull Request before merging.

---

## Branch Naming Convention

```text
bugfix/homepage
bugfix/authentication
bugfix/services
bugfix/provider-dashboard
bugfix/bookings
bugfix/login-issue
```

---

## Environment Variables

Backend `.env`

Create `backend/.env` (do not commit to git):

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```

---

## Repository

https://github.com/ServeGo/servego-platform

