# Cloud Anomaly Detection System — Deployment Guide

This document outlines the architecture, configuration, and manual steps needed to deploy the backend services (Flask) and database (PostgreSQL) on Render, and the frontend (React) on Vercel.

---

## 1. Backend Service Configuration (Render)

Create a new **Web Service** on Render with the following settings:

* **Repository:** `https://github.com/soumi-saha12/cloud_anomaly_detection_system`
* **Runtime:** `Python`
* **Root Directory:** *(Leave blank to keep repository root)*
* **Build Command:**
  ```bash
  # 1. Download Git LFS client in user-space
  mkdir -p bin && curl -L https://github.com/git-lfs/git-lfs/releases/download/v3.4.0/git-lfs-linux-amd64-v3.4.0.tar.gz | tar xz -C bin --strip-components=1
  
  # 2. Add to PATH and fetch LFS serialized model assets
  export PATH=$PATH:$(pwd)/bin
  git lfs install
  git lfs pull
  
  # 3. Install dependencies
  pip install -r requirements.txt
  ```
* **Start Command:**
  ```bash
  gunicorn --chdir backend --bind 0.0.0.0:$PORT app:app
  ```

---

## 2. Database Service Configuration (Render PostgreSQL)

1. Create a new **PostgreSQL Database** on Render.
2. Choose the **Free** tier (or desired paid plan).
3. Connect the database to your Web Service:
   * Under the Web Service dashboard, go to **Environment**.
   * Link the database. Render automatically populates the `DATABASE_URL` environment variable for your Flask service.

---

## 3. Environment Variables (Web Service Dashboard)

Configure the following variables in the **Environment** tab of the Render Web Service:

| Key | Recommended Value | Purpose |
|---|---|---|
| `FLASK_ENV` | `production` | Enables production mode optimizations |
| `SECRET_KEY` | *(Create a 32-byte secure random hex)* | Key for session encryption |
| `JWT_SECRET_KEY` | *(Create a separate secure random hex)* | Key for signing JWT tokens |
| `CORS_ORIGINS` | `https://<your-app>.vercel.app` | Restricts API access to the React frontend |
| `DATABASE_URL` | *(Automatically populated by Render)* | PostgreSQL connection URL |

*To generate secure keys, run locally:*
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## 4. Production Database Migrations

Since migrations are tracked inside `backend/migrations`, execute this command in the Render **Shell** tab (or set it as a post-build release command) to create the PostgreSQL tables:

```bash
PYTHONPATH=backend FLASK_APP=backend/app.py flask db upgrade -d backend/migrations
```

---

## 5. Security & Auditing Checklist

1. **Verify Passwords:** Plaintext passwords are never stored. Werkzeug hashing functions (`generate_password_hash` and `check_password_hash`) are used in `auth_service.py`.
2. **Verify JWT Protection:** All history, dashboard, and analyze endpoints must have the `@jwt_required()` decorator.
3. **Verify CORS Settings:** In production, prevent origin wildcards (`*`) by populating the `CORS_ORIGINS` variable with the exact Vercel deployment URL.
4. **Token Revocation:** User logout successfully blocks JTI tokens in the `revoked_tokens` table.

---

## 6. Frontend Deployment (Vercel)

1. Deploy the React project folder to Vercel.
2. In the Vercel dashboard, configure the environment variable:
   * `REACT_APP_API_URL` = `https://<your-backend-app>.onrender.com`
