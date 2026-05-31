# ServeGo Platform

ServeGo is a platform that connects customers with trusted service providers such as electricians, plumbers, carpenters, AC technicians, cleaners, and other skilled professionals.

---

# Team Members

| Name    | Role          |
| ------- | ------------- |
| Kurma   | Project Owner |
| Aravind | Developer     |
| Prasad  | Developer     |
| Gupta   | Developer     |
| Purna   | Developer     |

---

# Tech Stack

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

# Prerequisites

Before starting development, install the following software:

### Node.js

Download and install the latest LTS version:

https://nodejs.org

Verify installation:

```bash
node -v
npm -v
```

### Git

Download and install Git:

https://git-scm.com/downloads

Verify installation:

```bash
git --version
```

### VS Code

Download:

https://code.visualstudio.com

Recommended Extensions:

* ESLint
* Prettier
* GitLens
* Tailwind CSS IntelliSense

---

# Clone Repository

Create a workspace folder:

```text
C:\Downloads\Projects
```

Open Command Prompt:

```bash
cd C:\Downloads\Projects
```

Clone the repository:

```bash
git clone https://github.com/ServeGo/servego-platform.git
```

Navigate to the project:

```bash
cd servego-platform
```

---

# Project Structure

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

# Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

---

# Backend Setup

Open a new terminal:

```bash
cd backend
npm install
npm run dev
```

Backend runs at:

```text
http://localhost:5000
```

Backend-specific details can be found in:

```text
backend/README.md
```

---

# Environment Variables

Create a file:

```text
backend/.env
```

Add:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```

Important:

* Never commit `.env` files to GitHub.
* Never share database credentials in chat or commits.

---

# Daily Development Workflow

## Step 1: Pull Latest Changes

Before starting work every day:

```bash
git checkout main
git pull origin main
```

---

## Step 2: Create a New Branch

Never work directly on the `main` branch.

Create a branch:

if you developing feature use:feature or if you fixing the feature bugs use bugfix
```bash
git checkout -b bugfix/your-branch-name
```

Example:

```bash
git checkout -b bugfix/update-readme
```

---

## Step 3: Make Your Changes

Work on your assigned task.

Check modified files:

```bash
git status
```

---

## Step 4: Add Changes

```bash
git add .
```

---

## Step 5: Commit Changes

```bash
git commit -m "your commit message"
```

Example:

```bash
git commit -m "update README with project setup instructions"
```

---

## Step 6: Push Your Branch

```bash
git push -u origin bugfix/your-branch-name
```

Example:

```bash
git push -u origin bugfix/update-readme
```

---

## Step 7: Create a Pull Request

After pushing, GitHub will display a link similar to:

```text
Create a pull request for 'bugfix/update-readme'
```

Open the link and create a Pull Request.

---

## Step 8: Review and Merge

The Project Owner (Kurma) will review the Pull Request and merge it into the `main` branch.

Contributors should not merge their own Pull Requests unless instructed.

---

## Step 9: Sync After Merge

After the Pull Request is merged:

```bash
git checkout main
git pull origin main
```

---

# Branch Naming Convention

Examples:

```text
bugfix/homepage
bugfix/authentication
bugfix/provider-dashboard
bugfix/services
bugfix/bookings
bugfix/update-readme
```

Choose a branch name that clearly describes the work being done.

---

# Team Rules

✅ Pull latest changes before starting work

✅ Create a new branch for every task

✅ Write meaningful commit messages

✅ Push changes to your own branch

✅ Create a Pull Request for every change

✅ Test your code before pushing

❌ Do not commit directly to main

❌ Do not force push to main

❌ Do not modify another developer's branch

---

# Repository

https://github.com/ServeGo/servego-platform

