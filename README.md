# 🛡️ SentinelPay – AI-Powered Secure Payment Processing API

![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-Auth-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Gemini-AI%20Fraud%20Detection-8E75C2?style=flat-square&logo=google-gemini&logoColor=white)

A production-style fintech backend API demonstrating secure payment processing, atomic wallet transfers, and real-time AI-powered fraud detection using the Google Gemini API. Built specifically to showcase skills in cybersecurity, payments, and AI integration for East African financial infrastructure.

> 🔴 **Live API:** `https://sentinelpay-api-j9o5.onrender.com`
> 🎨 **Live Dashboard (Vercel):** `https://sentinelpay-api.vercel.app`
> 📖 **Swagger Docs:** `https://sentinelpay-api-j9o5.onrender.com/api-docs`

---

## ✨ Features

- 🔐 **JWT Authentication** — access + refresh token dual-token system with bcrypt-hashed storage
- 👛 **Wallet System** — each user gets an auto-generated wallet with account number and KES balance
- 💸 **Atomic Money Transfers** — Prisma `$transaction()` ensures no money is lost if anything fails mid-transfer
- 🤖 **AI Fraud Detection** — Gemini AI (`gemini-3.1-flash-lite`) analyzes flagged transactions and returns risk score, reason, and recommendation
- 🚨 **Rule-Based Flagging** — 3 fraud rules trigger before AI analysis
- 📱 **M-Pesa Simulation** — fake STK push callback credits wallets and logs transactions
- 🛡️ **Role-Based Access Control** — CUSTOMER, EMPLOYEE, and ADMIN roles with protected routes
- 📊 **Admin Dashboard API** — users, transactions, fraud flags, and aggregate stats
- 📝 **Audit Logging** — every login, transfer, and failed auth is logged with IP and metadata
- 🚫 **Rate Limiting** — brute-force protection on auth and transaction routes
- 📖 **Swagger UI** — full interactive API documentation at `/api-docs`
- 🐳 **Fully Dockerised** — single command setup, zero manual configuration

---

## 🤖 How AI Fraud Detection Works

Every transfer is checked against 3 rules after completion:

| Rule | Condition | Action |
|---|---|---|
| Large Transfer | Amount > 100,000 KES | Flag |
| Velocity Check | Sender made > 5 transactions in 60 seconds | Flag |
| Repeat Transfer | Same sender → same receiver twice in 30 seconds | Flag |

If any rule triggers, the transaction is marked **FLAGGED** and the Gemini API is called asynchronously:

```json
Prompt sent to Gemini:
"You are a fraud detection AI for a fintech platform.
Analyze this transaction and return JSON with:
riskScore (0-100), reason (one sentence), recommendation (BLOCK/REVIEW/ALLOW)"

Gemini response stored in FraudFlag:
{
  "riskScore": 87,
  "reason": "Transfer significantly exceeds typical transaction thresholds.",
  "recommendation": "BLOCK"
}
```

The fraud check runs **fire-and-forget** — the user gets their response immediately, AI analysis happens in the background. If the Gemini API is unavailable, a fallback flag is stored and the app never crashes.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 |
| Language | TypeScript (strict mode) |
| Framework | Express.js |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| Auth | JWT (access + refresh tokens) |
| Hashing | bcrypt (12 rounds) |
| AI | Google Gemini API (gemini-flash-lite-latest) |
| Validation | Zod |
| Rate Limiting | express-rate-limit |
| API Docs | Swagger UI (swagger-jsdoc) |
| Containers | Docker + Docker Compose |

---

## 🚀 Getting Started

### Prerequisites
- Docker Desktop installed and running
- Gemini API key (free at aistudio.google.com)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/karndeep20047-design/sentinelpay-api.git
cd sentinelpay-api

# 2. Copy environment variables
cp .env.example .env

# 3. Add your Gemini API key to .env
GEMINI_API_KEY=AIzaSyYourKeyHere

# 4. Start everything
docker-compose up --build
```

API live at `http://localhost:3001`
Swagger UI at `http://localhost:3001/api-docs`

### Seed Accounts

| Email | Password | Role | Wallet Balance |
|---|---|---|---|
| admin@sentinelpay.com | Admin123! | ADMIN | — |
| employee@sentinelpay.com | Employee123! | EMPLOYEE | — |
| alice@example.com | User123! | CUSTOMER | 500,000 KES |
| bob@example.com | User123! | CUSTOMER | 250,000 KES |

---

## 📡 API Endpoints

### Auth (`/api/auth`) — Public, Rate Limited

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user + auto-create wallet |
| POST | `/api/auth/login` | Login, receive JWT tokens |
| POST | `/api/auth/refresh` | Get new access token |
| POST | `/api/auth/logout` | Invalidate refresh token |

### Wallet (`/api/wallet`) — Protected

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/wallet/me` | Full wallet info (balance + account number) |
| GET | `/api/wallet/balance` | Balance only |

### Transactions (`/api/transactions`) — Protected

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/transactions/transfer` | Send money to account number |
| GET | `/api/transactions` | Own transaction history (paginated) |
| GET | `/api/transactions/:id` | Single transaction with fraud flag if present |

### M-Pesa (`/api/mpesa`) — Public Webhook

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/mpesa/callback` | Simulate STK push credit to wallet |

### Admin (`/api/admin`) — ADMIN only

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/users` | All users |
| GET | `/api/admin/transactions` | All transactions with filters |
| GET | `/api/admin/flags` | All fraud flags with AI analysis |
| GET | `/api/admin/stats` | Aggregate stats |
| DELETE | `/api/admin/users/:id` | Delete a user |

### System

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api-docs` | Swagger UI |

---

## 🧪 Example: Transfer + Fraud Flag

### Trigger a flagged transfer (over 100,000 KES)

```bash
curl -X POST http://localhost:3001/api/transactions/transfer \
  -H "Authorization: Bearer <alice_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "toAccountNumber": "bob_account_number",
    "amount": 150000,
    "description": "Payment"
  }'
```

```json
{
  "success": true,
  "message": "Transfer completed",
  "data": {
    "id": "uuid",
    "amount": "150000",
    "status": "FLAGGED",
    "type": "TRANSFER"
  }
}
```

### Check fraud flag (as admin, after a few seconds)

```bash
curl http://localhost:3001/api/admin/flags \
  -H "Authorization: Bearer <admin_access_token>"
```

```json
{
  "success": true,
  "data": [{
    "riskScore": 87,
    "reason": "Transfer significantly exceeds typical transaction thresholds.",
    "aiAnalysis": "{\"riskScore\":87,\"reason\":\"Transfer significantly exceeds typical transaction thresholds.\",\"recommendation\":\"BLOCK\"}",
    "transaction": {
      "amount": "150000",
      "status": "FLAGGED"
    }
  }]
}
```

---

## 🔒 Security Design

| Feature | Implementation |
|---|---|
| Password hashing | bcrypt, 12 salt rounds |
| Refresh token storage | bcrypt-hashed in DB, plain token never persisted |
| Access token expiry | 15 minutes |
| Refresh token expiry | 7 days, revoked on logout |
| Atomic transfers | Prisma `$transaction()` — full rollback on failure |
| Brute force protection | Rate limiting on auth + transfer routes |
| Input validation | Zod schemas on every endpoint |
| Role enforcement | Middleware-level RBAC |
| Audit trail | Every action logged with IP and metadata |
| AI graceful degradation | Gemini failure stores fallback flag, never crashes app |

---

## 🏗️ Architecture

```
Client Request
      │
      ▼
Rate Limiter → Auth Middleware → RBAC
      │
      ▼
Controller (thin — validates, calls service, returns response)
      │
      ▼
Service Layer (business logic)
      │
      ├── Prisma $transaction() ──→ PostgreSQL
      │
      └── fraud.service (async, fire-and-forget)
                │
                ├── Rule engine (3 rules)
                │
                └── Gemini API ──→ FraudFlag stored in DB
```

---

## 📁 Project Structure

```
sentinelpay-api/
├── prisma/seed.ts
├── src/
│   ├── controllers/        # auth, wallet, transaction, mpesa, admin
│   ├── middleware/         # auth, rateLimiter, errorHandler
│   ├── routes/             # 5 route groups
│   ├── services/           # auth, token, wallet, transaction, fraud, audit
│   ├── swagger/            # Swagger config
│   ├── prisma/             # schema.prisma
│   ├── utils/              # ApiResponse, AppError, prisma client
│   └── index.ts
├── Dockerfile
├── docker-compose.yml
├── docker-entrypoint.sh
└── .env.example
```

---

## 📄 License

MIT © Karndeep Singh Bhamrah
