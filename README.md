# SentinelPay – AI-Powered Secure Payment Processing API

[![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker)](https://www.docker.com)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io)
[![JWT](https://img.shields.io/badge/JWT-Auth-000000?style=flat-square&logo=jsonwebtokens)](https://jwt.io)
[![Claude AI](https://img.shields.io/badge/Claude-AI%20Fraud%20Detection-FF6B35?style=flat-square)](https://anthropic.com)

SentinelPay is a production-grade fintech backend API simulating a secure digital wallet system with AI-powered fraud detection. It demonstrates real-time transaction monitoring using Anthropic Claude AI, atomic fund transfers with full audit trails, and M-Pesa payment simulation — built to the standards of a cybersecurity + payments startup.

---

## Features

- 🔐 **JWT Auth** — Access + refresh tokens with bcrypt-hashed refresh token storage
- 💰 **Digital Wallets** — Auto-created on registration with unique 10-digit account numbers (KES currency)
- 💸 **Atomic Transfers** — Fund transfers using Prisma `$transaction()` — fully atomic, rollback-safe
- 🤖 **AI Fraud Detection** — Claude `claude-3-haiku-20240307` analyzes flagged transactions and returns riskScore, reason, recommendation
- 🚨 **3-Rule Fraud Engine** — Large amount (>100K KES), high velocity (>5 tx/60s), duplicate receiver (2x in 30s)
- 📱 **M-Pesa Simulation** — Webhook endpoint that credits wallets and logs transactions
- 📋 **Audit Logging** — Every auth event and transfer logged with IP address and metadata
- 🛡️ **Rate Limiting** — Auth routes: 10 req/15 min; Transfer: 20 req/min
- 👑 **Admin Dashboard API** — Users, transactions, fraud flags, aggregate stats, top spenders
- 📚 **Swagger Docs** — Full OpenAPI 3.0 documentation at `/api-docs`
- 🐳 **Docker Ready** — One-command local setup with `docker-compose up --build`
- ✅ **Zod Validation** — All inputs validated with descriptive error messages

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 |
| Language | TypeScript 5.8 (strict mode) |
| Framework | Express.js 5 |
| Database | PostgreSQL 16 |
| ORM | Prisma 6 |
| Auth | JWT (jsonwebtoken) + bcrypt |
| Validation | Zod |
| AI | Anthropic Claude (`claude-3-haiku-20240307`) |
| Rate Limiting | express-rate-limit |
| API Docs | swagger-ui-express + swagger-jsdoc |
| Container | Docker + docker-compose |

---

## Quick Start

### Prerequisites
- Docker + Docker Compose
- Anthropic API key (for AI fraud detection)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/sentinelpay-api.git
cd sentinelpay-api

# 2. Configure environment
cp .env.example .env
# Edit .env and fill in:
#   JWT_ACCESS_SECRET=<random 64-char string>
#   JWT_REFRESH_SECRET=<random 64-char string>
#   ANTHROPIC_API_KEY=<your Claude API key>

# 3. Build and start
docker-compose up --build
```

The API will be live at `http://localhost:3000`.

---

## API Endpoints

### System
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | None | Health check |
| GET | `/api-docs` | None | Swagger UI |

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | None | Register user + auto-create wallet |
| POST | `/api/auth/login` | None | Login, returns JWT tokens |
| POST | `/api/auth/refresh` | None | Refresh access token |
| POST | `/api/auth/logout` | Bearer | Revoke refresh token |

### Wallet
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/wallet/me` | Bearer | Full wallet info |
| GET | `/api/wallet/balance` | Bearer | Current balance only |

### Transactions
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/transactions/transfer` | Bearer | Transfer funds to account number |
| GET | `/api/transactions` | Bearer | Paginated history (`?page=1&limit=20&startDate=&endDate=`) |
| GET | `/api/transactions/:id` | Bearer | Single transaction with fraud flag |

### M-Pesa
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/mpesa/callback` | None | Simulate STK push credit |

### Admin
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/users` | ADMIN | All users with wallets |
| GET | `/api/admin/transactions` | ADMIN | All transactions (`?status=FLAGGED`) |
| GET | `/api/admin/flags` | ADMIN | All fraud flags with AI analysis |
| GET | `/api/admin/stats` | ADMIN | Platform stats + top spenders |
| DELETE | `/api/admin/users/:id` | ADMIN | Delete a user |

---

## Example Requests

### Register
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "newuser@example.com", "password": "User123!"}'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "User123!"}'
```

### Transfer (triggers fraud flag — amount > 100,000 KES)
```bash
curl -X POST http://localhost:3000/api/transactions/transfer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "toAccountNumber": "1000000004",
    "amount": 150000,
    "description": "Large transfer test"
  }'
```

**Response (flagged):**
```json
{
  "success": true,
  "message": "Transaction flagged for review",
  "data": {
    "id": "txn-uuid",
    "amount": "150000.00",
    "status": "FLAGGED",
    "type": "TRANSFER",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### M-Pesa Credit
```bash
curl -X POST http://localhost:3000/api/mpesa/callback \
  -H "Content-Type: application/json" \
  -d '{
    "accountNumber": "1000000003",
    "amount": 5000,
    "mpesaRef": "QJK2LS9KDF",
    "phoneNumber": "254712345678"
  }'
```

### View Fraud Flags (Admin)
```bash
curl http://localhost:3000/api/admin/flags \
  -H "Authorization: Bearer <admin_access_token>"
```

**Response:**
```json
{
  "success": true,
  "message": "Fraud flags retrieved",
  "data": {
    "flags": [
      {
        "id": "flag-uuid",
        "riskScore": 87,
        "reason": "Transaction exceeds 100,000 KES threshold",
        "aiAnalysis": "{\"riskScore\":87,\"reason\":\"Large transfer significantly above normal limits\",\"recommendation\":\"REVIEW\"}",
        "transaction": {
          "amount": "150000.00",
          "status": "FLAGGED",
          "sender": { "email": "alice@example.com" },
          "receiver": { "email": "bob@example.com" }
        }
      }
    ]
  }
}
```

---

## Fraud Detection

SentinelPay runs automated fraud analysis after every transfer. Three rules are evaluated:

| Rule | Condition | Trigger |
|---|---|---|
| `LARGE_AMOUNT` | Transaction > 100,000 KES | Immediate flag |
| `HIGH_VELOCITY` | Sender has > 5 transactions in last 60 seconds | Velocity attack detection |
| `DUPLICATE_RECEIVER` | Same sender → same receiver, 2+ times in 30 seconds | Duplicate payment detection |

### Claude AI Integration

When any rule triggers:

1. Transaction status is updated to `FLAGGED`
2. Claude `claude-3-haiku-20240307` is called with transaction context
3. Claude returns structured JSON: `{ riskScore: 0-100, reason: string, recommendation: BLOCK|REVIEW|ALLOW }`
4. A `FraudFlag` record is created with the AI analysis
5. If Claude is unavailable, a fallback `FraudFlag` is stored — the request **never crashes**

> **Fire-and-forget design**: Claude analysis runs asynchronously after the transfer response is sent. Users get instant transfer confirmation; fraud analysis happens in the background.

---

## Seeded Test Accounts

| Email | Password | Role | Balance |
|---|---|---|---|
| `admin@sentinelpay.com` | `Admin123!` | ADMIN | — |
| `employee@sentinelpay.com` | `Employee123!` | EMPLOYEE | — |
| `alice@example.com` | `User123!` | CUSTOMER | 500,000 KES |
| `bob@example.com` | `User123!` | CUSTOMER | 250,000 KES |

Alice's account number: `1000000003`  
Bob's account number: `1000000004`

---

## Security

- **Password Hashing** — bcrypt with 12 salt rounds
- **JWT Access Tokens** — 15-minute expiry, signed with HS256
- **Refresh Tokens** — Hashed with bcrypt before storage, 7-day expiry
- **Rate Limiting** — Auth: 10 req/15 min; Transfers: 20 req/min
- **Input Validation** — Zod schemas on all endpoints
- **Atomic Transactions** — Prisma `$transaction()` prevents partial fund transfers
- **Audit Trail** — All auth events and transfers logged with IP address
- **Self-Transfer Prevention** — Sender cannot transfer to own account
- **No Balance Leakage** — Auth responses never include wallet balance

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SentinelPay API                          │
│                                                                 │
│  Client Request                                                 │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │ Rate Limiter│───▶│  Auth Middle │───▶│    Controller    │   │
│  └─────────────┘    └──────────────┘    └────────┬─────────┘   │
│                                                  │             │
│       ┌──────────────────────────────────────────┤             │
│       │                  │                       │             │
│       ▼                  ▼                       ▼             │
│  ┌─────────┐      ┌────────────┐         ┌────────────┐        │
│  │  Auth   │      │  Wallet    │         │Transaction │        │
│  │ Service │      │  Service   │         │  Service   │        │
│  └────┬────┘      └─────┬──────┘         └─────┬──────┘        │
│       │                 │                      │               │
│       └─────────────────┴──────────────────────┤               │
│                                               │               │
│                         ┌─────────────────────┤               │
│                         │ Fire-and-Forget      │               │
│                         ▼                      ▼               │
│                  ┌─────────────┐       ┌──────────────┐        │
│                  │Fraud Service│       │ Audit Service │        │
│                  └──────┬──────┘       └──────┬───────┘        │
│                         │                     │               │
│                         ▼                     │               │
│                  ┌─────────────┐              │               │
│                  │ Claude AI   │              │               │
│                  │  (Haiku)    │              │               │
│                  └──────┬──────┘              │               │
│                         │                     │               │
│                         ▼                     ▼               │
│                  ┌─────────────────────────────────┐          │
│                  │         PostgreSQL               │          │
│                  │  (Prisma ORM + $transaction())  │          │
│                  └─────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## License

MIT © SentinelPay
