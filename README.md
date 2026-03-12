# Loan Fraud Detection System

An AI-powered multi-agent loan fraud detection platform built on **Microsoft Azure**. The system captures behavioural biometrics and device fingerprints during loan application submission, then runs four specialised AI agents concurrently via **Azure AI Foundry** to produce a comprehensive fraud risk report. A manager portal provides a full-detail view of each application and supports approve / reject decisions.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [AI Agents](#ai-agents)
- [API Reference](#api-reference)
- [Data Models](#data-models)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
  - [Backend](#backend-setup)
  - [Frontend](#frontend-setup)
- [How It Works](#how-it-works)
- [Manager Portal](#manager-portal)
- [Fraud Risk Scoring](#fraud-risk-scoring)
- [Database Schema](#database-schema)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        React Frontend                            │
│   Loan Application Form  │  Manager Dashboard (Banking Portal)  │
└─────────────────┬────────────────────────┬───────────────────────┘
                  │  REST API              │  REST API
┌─────────────────▼────────────────────────▼───────────────────────┐
│                     FastAPI Backend (Python)                      │
│                                                                   │
│  ┌──────────────┐  ┌─────────────────┐  ┌───────────────────┐   │
│  │ Cosmos DB    │  │  Azure Blob     │  │  Agent            │   │
│  │ Service      │  │  Storage Svc    │  │  Orchestrator     │   │
│  └──────────────┘  └─────────────────┘  └────────┬──────────┘   │
└──────────────────────────────────────────────────┼───────────────┘
                                                   │ Concurrent
                                                   │ (all 4 in parallel)
┌──────────────────────────────────────────────────▼───────────────┐
│                    Azure AI Foundry                               │
│                                                                   │
│  ┌─────────────────┐  ┌──────────────────┐                       │
│  │ Behavioural     │  │ Device           │                       │
│  │ Agent           │  │ Fingerprint Agent│                       │
│  └─────────────────┘  └──────────────────┘                       │
│  ┌─────────────────┐  ┌──────────────────┐                       │
│  │ Fraud Ring      │  │ KYC Agent        │                       │
│  │ Agent           │  │                  │                       │
│  └─────────────────┘  └──────────────────┘                       │
└───────────────────────────────────────────────────────────────────┘
         │                              │
┌────────▼──────────┐        ┌──────────▼────────────┐
│  Azure Cosmos DB  │        │  Azure Blob Storage   │
│  (Applications,   │        │  (KYC Documents,      │
│   Fraud Reports)  │        │   Uploads)            │
└───────────────────┘        └───────────────────────┘
```

---

## Key Features

### Applicant-facing
- Multi-step loan application form with real-time biometric capture
- Passive keystroke dynamics and mouse movement recording
- Automatic device fingerprinting (IP, browser, timezone, screen, canvas, WebGL)
- Document upload with support for PDF, DOCX, images, Excel and XML
- AWS Cognito authentication

### AI Fraud Analysis
- **4 specialised agents run concurrently** via `ConcurrentBuilder` (Microsoft Agent Framework)
- Each agent receives a clearly-labelled subset of application data and produces a structured plain-text report with `RISK_SCORE`, `CONFIDENCE`, `RECOMMENDATION`, findings list, and an analysis narrative
- Fresh Azure AI thread created **per analysis run** — no thread contamination between applications
- Agents registered once in AI Foundry at startup; instructions pushed on every restart via `UPDATE_FOUNDRY_AGENT=true`
- Overall risk score = weighted average (60%) + max component score (40%)
- Automatic status assignment: `approved` / `manual_review` / `rejected`
- Analysis stored to Cosmos DB and surfaced in the manager portal

### Manager Portal
- Filterable table of all applications with status badges and risk pills
- Full-detail popup modal per application:
  - KPI row (loan amount, overall risk score, term, submission date)
  - Applicant + loan info two-column layout
  - Visual risk gauge
  - 4 agent cards in a 2-column grid — each showing risk score, confidence %, recommendation, findings bullets, and full analysis narrative (expandable)
  - Critical issues and warnings panels
  - Manager decision record (if already reviewed)
- Approve / Reject workflow with mandatory comments and optional reviewer name

---

## Tech Stack

### Backend
| Component | Technology |
|---|---|
| API Framework | FastAPI 0.111+ |
| Runtime | Python 3.11+ / Uvicorn |
| AI Agents | Microsoft Agent Framework 1.0.0rc2 |
| Azure AI | azure-ai-agents 1.2.0b5 |
| Database | Azure Cosmos DB (NoSQL) |
| File Storage | Azure Blob Storage |
| Authentication | Azure CLI Credential / DefaultAzureCredential |
| Concurrency | asyncio + `asyncio.to_thread` for sync SDK calls |
| Data Validation | Pydantic v2 |
| Document Parsing | PyMuPDF (PDF), python-docx (Word), openpyxl (Excel) |

### Frontend
| Component | Technology |
|---|---|
| Framework | React 19 + Vite 7 |
| Routing | React Router v7 |
| Styling | CSS Modules |
| Charts | Recharts |
| Device Fingerprinting | @fingerprintjs/fingerprintjs v5 |
| Auth | AWS Amplify + Amazon Cognito |
| Alerts | SweetAlert2 |

---

## Project Structure

```
Loan Fraud App/
├── README.md
├── Loan-FraudApp-Backend/          # FastAPI backend
│   ├── main.py                     # All API routes + lifespan handler
│   ├── requirements.txt
│   ├── .env                        # Environment variables (not committed)
│   └── app/
│       ├── agents/
│       │   ├── agent_orchestrator.py   # Core: agent setup + run_workflow
│       │   ├── behavioural_agent.py    # Agent name + instructions
│       │   ├── device_fingerprint_agent.py
│       │   ├── fraud_ring_agent.py
│       │   └── kyc_agent.py
│       ├── models/
│       │   └── schemas.py          # Pydantic request/response models
│       └── services/
│           ├── cosmos_service.py   # Cosmos DB CRUD operations
│           └── blob_service.py     # Azure Blob Storage operations
│
└── Loan-Fraud-App-Frontend/        # React frontend
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── azure-config.js         # API base URL + endpoint map
        ├── Login.jsx
        ├── amplify-config.js       # AWS Cognito config
        ├── components/             # Shared UI components
        ├── context/
        │   └── AppContext.jsx
        └── pages/
            ├── BankingDashboard.jsx    # Manager portal
            ├── BankingDashboard.css
            ├── LoanDashboard.jsx       # Applicant form
            └── ...
```

---

## AI Agents

All four agents are created/updated in **Azure AI Foundry** at application startup. They run concurrently for every submitted loan application.

### `lfa_behavioural_agent` — Behavioural Analysis
Analyses keystroke dynamics, mouse movements, form completion speed, copy-paste patterns, hesitation patterns, and robotic behaviour indicators.

**Input data:** `biometrics_history` records (key timings, mouse events, interaction time, typing speed, pause patterns)

### `lfa_device_fingerprint_agent` — Device Fingerprint Analysis
Evaluates IP/geolocation consistency, VPN/proxy/Tor usage, device spoofing indicators, browser + OS fingerprint, screen characteristics, and cross-session device changes.

**Input data:** `device_fingerprint_history` records (IP, user agent, timezone, canvas fingerprint, WebGL, geolocation)

### `lfa_fraud_ring_agent` — Fraud Ring Detection
Detects organised fraud networks through shared contacts, address clustering, coordinated application timing, synthetic identity patterns, and cross-applicant data anomalies.

**Input data:** Full applicant info, device history, loan details, known cross-reference patterns

### `lfa_kyc_agent` — KYC Document Verification
Verifies identity documents, proof of address, income documents, checks name/address/DOB consistency across documents, detects tampering or expired documents.

**Input data:** Document contents retrieved from Azure Blob Storage (PDF text, DOCX content, image metadata)

### Agent Output Format
Each agent responds in a strict plain-text format:

```
RISK_SCORE: 45
CONFIDENCE: 80
RECOMMENDATION: MANUAL_REVIEW
ANOMALIES:
- Abnormal typing speed detected on income field
- Excessive copy-paste on address section
ANALYSIS:
The applicant's keystroke dynamics show significant irregularities...
```

---

## API Reference

### Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Root health check |
| `GET` | `/health` | Detailed health check |

### Loan Applications

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/loans/create` | Create a new loan application (draft) |
| `GET` | `/api/loans` | List all loan applications |
| `GET` | `/api/loans/{loan_app_id}` | Get a single application with full detail |
| `PUT` | `/api/loans/{loan_app_id}/status` | Update application status |
| `POST` | `/api/loans/{loan_app_id}/submit` | Submit application → triggers background fraud analysis |
| `POST` | `/api/loans/{loan_app_id}/review` | Manager approve/reject decision |
| `DELETE` | `/api/loans/{loan_app_id}` | Delete an application |

### Biometrics & Device Data

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/loans/{loan_app_id}/biometrics` | Add biometric + device fingerprint snapshot |

### Documents

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/loans/{loan_app_id}/documents/upload` | Upload a KYC document |
| `GET` | `/api/loans/{loan_app_id}/documents` | List all documents for an application |
| `GET` | `/api/loans/{loan_app_id}/documents/by-type/{document_type}` | Filter documents by type |
| `GET` | `/api/loans/{loan_app_id}/documents/{document_id}` | Get document metadata |
| `GET` | `/api/loans/{loan_app_id}/documents/{document_id}/download` | Download document content |
| `DELETE` | `/api/loans/{loan_app_id}/documents/{document_id}` | Delete a document |

### Fraud Analysis

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/loans/{loan_app_id}/analyze` | Manually trigger fraud analysis |
| `GET` | `/api/loans/{loan_app_id}/analysis` | Retrieve stored fraud analysis results |

### Dashboard

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/dashboard/statistics` | Aggregated stats (totals, risk distribution) |

---

## Data Models

### Loan Application (Cosmos DB document)

```json
{
  "loan_app_id": "LN-App-042",
  "status": "manual_review",
  "applicant_info": {
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "jane@example.com",
    "phone": "+44...",
    "date_of_birth": "1985-06-15",
    "address_line1": "...",
    "city": "...",
    "state": "...",
    "zip_code": "..."
  },
  "loan_details": {
    "loan_amount": 25000,
    "loan_term_months": 60,
    "loan_purpose": "Home Improvement",
    "employment_status": "Full-time",
    "employer_name": "...",
    "annual_income": 55000,
    "years_employed": 3
  },
  "biometrics_history": [ ... ],
  "device_fingerprint_history": [ ... ],
  "documents": [ ... ],
  "fraud_analysis": {
    "overall_risk_score": 52.4,
    "overall_recommendation": "MANUAL_REVIEW - Moderate risk requires human review",
    "application_status": "manual_review",
    "analyzed_at": "2026-03-12T10:30:00Z",
    "agent_results": {
      "lfa_behavioural_agent": {
        "risk_score": 35,
        "confidence": 85,
        "recommendation": "APPROVE",
        "findings": ["Normal typing speed", "No copy-paste detected"],
        "analysis": "Behavioural patterns are consistent with a genuine user..."
      },
      "lfa_device_fingerprint_agent": { ... },
      "lfa_fraud_ring_agent": { ... },
      "lfa_kyc_agent": { ... }
    },
    "critical_issues": [],
    "warnings": ["lfa_device_fingerprint_agent: Moderate risk detected"],
    "summary": "Fraud Detection Analysis Complete\nOverall Risk Score: 52.4/100"
  },
  "manager_review": {
    "decision": "approved",
    "comments": "Verified manually — risk acceptable.",
    "reviewer_name": "John Manager",
    "reviewed_at": "2026-03-12T11:00:00Z"
  },
  "created_at": "2026-03-12T09:00:00Z",
  "updated_at": "2026-03-12T11:00:00Z"
}
```

### Application Status Flow

```
draft → submitted → under_review → approved
                               ↘ manual_review → approved
                                               ↘ rejected
                               ↘ rejected
```

### Review Request (POST `/api/loans/{id}/review`)

```json
{
  "decision": "approved",
  "comments": "Documents verified. Risk within acceptable limits.",
  "reviewer_name": "John Manager"
}
```

---

## Prerequisites

- Python 3.11 or later
- Node.js 20 or later
- Azure subscription with:
  - **Azure AI Foundry** project (with a deployed model, e.g. `gpt-4o`)
  - **Azure Cosmos DB** account (NoSQL / Core API)
  - **Azure Blob Storage** account
- Azure CLI installed and logged in (`az login`) — used for `AzureCliCredential`
- AWS account with Cognito User Pool (for frontend authentication)

---

## Environment Variables

Create a `.env` file inside `Loan-FraudApp-Backend/`:

```env
# ── Azure AI Foundry ──────────────────────────────────────────────
AZURE_AI_PROJECT_ENDPOINT=https://<your-hub>.services.ai.azure.com/api/projects/<your-project>
AZURE_AI_MODEL_DEPLOYMENT_NAME=gpt-4o

# ── Azure Cosmos DB ───────────────────────────────────────────────
COSMOS_DB_URL=https://<your-account>.documents.azure.com:443/
COSMOS_DB_KEY=<your-primary-key>
COSMOS_DB_NAME=LoanFraudDB
COSMOS_PROJECTS_CONTAINER=LoanApplications

# ── Azure Blob Storage ────────────────────────────────────────────
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
AZURE_STORAGE_CONTAINER_NAME=loan-documents

# ── Agent Behaviour ───────────────────────────────────────────────
# Set to "true" to push updated instructions to Foundry agents on startup
UPDATE_FOUNDRY_AGENT=true
```

Create a `.env` file (or set variables) inside `Loan-Fraud-App-Frontend/`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

---

## Getting Started

### Backend Setup

```bash
cd Loan-FraudApp-Backend

# 1. Create and activate a virtual environment
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS / Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Log in to Azure (required for AzureCliCredential)
az login

# 4. Add your .env file (see Environment Variables section above)

# 5. Start the API server
python main.py
# OR: uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

On startup the server will:
1. Connect to Cosmos DB and Blob Storage
2. Register / update all 4 agents in Azure AI Foundry
3. Print agent IDs and confirm readiness

### Frontend Setup

```bash
cd Loan-Fraud-App-Frontend

# 1. Install dependencies
npm install

# 2. Create .env (or the default localhost:8000 will be used)
echo VITE_API_BASE_URL=http://localhost:8000 > .env

# 3. Start the development server
npm run dev
```

The frontend will be available at `http://localhost:5173`.

---

## How It Works

### Fraud Analysis Pipeline

When an applicant submits their loan application:

1. **`POST /api/loans/{id}/submit`** — The API immediately returns a success response to the applicant.
2. A **FastAPI background task** (`run_fraud_analysis_background`) starts asynchronously.
3. The background task:
   - Retrieves the complete application from Cosmos DB
   - Fetches all uploaded document contents from Blob Storage
   - Structures data into targeted subsets for each agent
   - Builds an enhanced prompt with clearly-labelled sections (applicant info, behavioural data, device data, fraud ring indicators, KYC documents)
4. **`AgentOrchestrator.run_workflow()`** is called:
   - Creates a **fresh** `AzureAIAgentClient` (new Azure AI threads — no contamination from prior runs)
   - Builds a `ConcurrentBuilder` workflow with all 4 agents
   - All agents execute **in parallel** against the same prompt
   - Each agent's plain-text response is parsed by `_extract_from_text()` to extract: `risk_score`, `confidence`, `recommendation`, `findings` (bullet list), `analysis` (narrative)
5. `_aggregate_results()` calculates the overall risk score and assigns final status
6. Results are stored to Cosmos DB via `update_detailed_agent_analysis()`
7. The manager portal reflects the new status and full agent analysis

### Thread Safety

The `AgentOrchestrator` instance is shared globally (initialised once at startup) but `run_workflow()` creates a new `AzureAIAgentClient` on every call. This means:
- Each loan application analysis starts on brand-new Azure AI threads
- Concurrent analyses for different applications do not share thread state
- Agents cannot inherit conversation history from previous analyses

---

## Manager Portal

Navigate to the **Banking Dashboard** in the frontend to access the manager portal.

### Application Table
- Filter by status: All / Needs Review / Approved / Rejected / Submitted
- Stats bar showing live counts for each category
- Each row shows: applicant name, loan ID, amount, submission date, status badge, and overall risk pill
- **View** button opens the full detail modal

### Detail Modal
- **Header:** Applicant name + status badge + loan ID
- **KPI row:** Loan amount · Overall risk score · Loan term · Submission date
- **Applicant info:** Name, email, phone, date of birth, address
- **Loan details:** Purpose, employment, income, employer, years employed
- **Risk gauge:** Visual bar showing overall risk score with colour coding
- **Agent Analysis grid (2-column):** One card per agent showing:
  - Agent name + confidence % badge + risk pill
  - APPROVE / MANUAL_REVIEW / REJECT recommendation
  - Findings bullet list (up to 6 items)
  - Analysis narrative (truncated with "Show full analysis" toggle)
- **Critical Issues / Warnings:** Flagged items from the risk aggregation
- **Manager Decision:** Recorded decision, reviewer name, date, and comments (shown after review)
- **Footer:** Close button + "Review This Application" button (visible only for `manual_review` status)

### Review Workflow
1. Click **Review This Application** in the detail modal footer
2. Select **Approve** or **Reject**
3. Optionally enter reviewer name
4. Enter mandatory comments (justification, min 5 chars)
5. Submit — the application status updates immediately and the decision is recorded

---

## Fraud Risk Scoring

| Score Range | Risk Level | Colour | Default Status |
|---|---|---|---|
| 0 – 39 | Low | Green | `approved` |
| 40 – 69 | Medium | Orange | `manual_review` |
| 70 – 100 | High | Red | `rejected` |

**Overall score formula:**
```
overall_risk = (average_of_agent_scores × 0.6) + (max_agent_score × 0.4)
```

This formula ensures that a single very high-risk signal (e.g. a clear fraud ring indicator) appropriately elevates the overall score even when other agents report low risk.

---

## Database Schema

### Cosmos DB

- **Database:** `LoanFraudDB` (configurable via `COSMOS_DB_NAME`)
- **Container:** `LoanApplications` (configurable via `COSMOS_PROJECTS_CONTAINER`)
- **Partition key:** `/loan_app_id`
- **Throughput:** 400 RU/s (auto-provisioned)

### Blob Storage

- **Container:** `loan-documents` (configurable via `AZURE_STORAGE_CONTAINER_NAME`)
- **Path pattern:** `{loan_app_id}/{document_id}/{filename}`
- **Supported formats:** PDF, DOCX, XLSX, PNG, JPG, XML, CSV

---

## Security Notes

- CORS is configured to allow all origins (`*`) for development. Update `allow_origins` in `main.py` with specific frontend domains before deploying to production.
- `SSN` fields are marked as optional and should be encrypted at rest in production.
- Azure CLI credentials are used locally. In production, use **Managed Identity** by removing the `AzureCliCredential` fallback and relying solely on `DefaultAzureCredential`.
- Cosmos DB keys in `.env` should be replaced with Managed Identity + RBAC in production.
- Document content returned by the download endpoint is streamed directly — ensure auth middleware is added in production.
