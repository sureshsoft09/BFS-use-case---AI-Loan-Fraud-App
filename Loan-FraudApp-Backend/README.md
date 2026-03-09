# Loan Fraud Detection Backend

🚀 **AI-Powered Multi-Agent Fraud Analysis System**

Complete FastAPI backend for loan fraud detection using Microsoft Agent Framework, Azure Cosmos DB, and Azure Blob Storage.

## ✨ Key Features

- 📝 **Loan Application Management** - Create, track, and manage loan applications
- 📄 **Document Management** - Secure upload and storage in Azure Blob Storage
- 🔍 **Biometric Tracking** - Capture keystroke patterns, mouse movements, and device fingerprints
- 🤖 **AI Fraud Detection** - 4 concurrent AI agents analyzing applications in real-time
- 📊 **Dashboard Analytics** - Real-time statistics and risk reporting

## 🚦 Quick Start

### 1. Install Dependencies

```bash
# Create virtual environment
python -m venv venv
.\venv\Scripts\activate  # Windows

# Install packages
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env` and add your Azure credentials:

```ini
# Azure AI Foundry
AZURE_AI_PROJECT_ENDPOINT=https://your-project.services.ai.azure.com
AZURE_AI_MODEL_DEPLOYMENT_NAME=gpt-4

# Cosmos DB
COSMOS_DB_URL=https://your-cosmos.documents.azure.com:443/
COSMOS_DB_KEY=your-key
COSMOS_DB_NAME=loan-fraud-db
COSMOS_PROJECTS_CONTAINER=loan-applications

# Blob Storage
AZURE_STORAGE_CONNECTION_STRING=your-connection-string
AZURE_STORAGE_ACCOUNT_NAME=your-account
AZURE_STORAGE_ACCOUNT_KEY=your-key
AZURE_STORAGE_CONTAINER_NAME=loan-documents
```

### 3. Authenticate with Azure

```bash
az login
```

### 4. Run the API

```bash
python main.py
```

API will be available at:
- **Base URL**: http://localhost:8000
- **Swagger Docs**: http://localhost:8000/docs

## 📋 API Workflow

### 1️⃣ Create Loan Application

```bash
POST /api/loans/create
```

Returns `loan_app_id` (e.g., **LN-App-001**)

### 2️⃣ Upload Documents

```bash
POST /api/loans/LN-App-001/documents/upload
```

Files stored in Blob Storage under `LN-App-001/` folder

### 3️⃣ Capture Biometrics

```bash
POST /api/loans/LN-App-001/biometrics
```

Track user behavior during data entry and document upload

### 4️⃣ Run Fraud Analysis

```bash
POST /api/loans/LN-App-001/analyze
```

Executes 4 AI agents concurrently:
- 🧠 **Behavioral Agent** - Keystroke & mouse patterns
- 💻 **Device Fingerprint Agent** - IP, location, device analysis
- 🔗 **Fraud Ring Agent** - Network & connection detection
- ✅ **KYC Agent** - Document verification

Returns overall risk score (0-100) and risk level (LOW/MEDIUM/HIGH)

### 5️⃣ Get Results

```bash
GET /api/loans/LN-App-001/analysis
```

## 📚 Documentation

- **[Complete API Documentation](./API_DOCUMENTATION.md)** - All endpoints with examples
- **[Agent Orchestrator Guide](./README_ORCHESTRATOR.md)** - AI agent configuration
- **[Quick Start Guide](./QUICKSTART.md)** - Step-by-step setup

## 🏗️ Architecture

```
Backend/
├── app/
│   ├── agents/              # AI Agent definitions
│   │   ├── agent_orchestrator.py      # Concurrent orchestration
│   │   ├── behavioural_agent.py       # Biometric analysis
│   │   ├── device_fingerprint_agent.py
│   │   ├── fraud_ring_agent.py
│   │   └── kyc_agent.py
│   ├── models/
│   │   └── schemas.py       # Pydantic models
│   └── services/
│       ├── cosmos_service.py   # Cosmos DB operations
│       └── blob_service.py     # Blob Storage operations
├── main.py                  # FastAPI application
├── requirements.txt
└── .env.example
```

## 🔑 Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/loans/create` | Create new application |
| `GET` | `/api/loans/{id}` | Get application details |
| `GET` | `/api/loans` | List all applications |
| `POST` | `/api/loans/{id}/documents/upload` | Upload document |
| `GET` | `/api/loans/{id}/documents` | List documents |
| `POST` | `/api/loans/{id}/biometrics` | Add biometrics data |
| `POST` | `/api/loans/{id}/analyze` | Run fraud analysis |
| `GET` | `/api/loans/{id}/analysis` | Get analysis results |
| `GET` | `/api/dashboard/statistics` | Dashboard stats |

## 🧪 Testing

### Interactive Docs (Swagger UI)

Visit http://localhost:8000/docs

### Sample Request

```bash
curl -X POST "http://localhost:8000/api/loans/create" \
  -H "Content-Type: application/json" \
  -d '{
    "applicant_info": {
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "phone": "1234567890",
      "date_of_birth": "1990-01-01",
      "address_line1": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zip_code": "10001",
      "country": "USA"
    },
    "loan_details": {
      "loan_amount": 50000,
      "loan_purpose": "Home Improvement",
      "loan_term_months": 60,
      "employment_status": "Employed",
      "annual_income": 75000
    }
  }'
```

## 📊 Database Schema

### Cosmos DB
- **Container**: `loan-applications`
- **Partition Key**: `/loan_app_id`
- **ID Format**: `LN-App-001`, `LN-App-002`, etc.

### Blob Storage
- **Container**: `loan-documents`
- **Structure**: `{loan_app_id}/{document_id}_{filename}`
- **Example**: `LN-App-001/uuid_passport.pdf`

## 🔐 Security Features

- ✅ Auto-generated application IDs
- ✅ SAS tokens for document access (24hr expiry)
- ✅ Biometric tracking for fraud detection
- ✅ Device fingerprinting
- ✅ CORS configuration
- ✅ Input validation with Pydantic

## 🚀 Production Deployment

### Azure App Service

```bash
az webapp up --name loan-fraud-api --runtime "PYTHON:3.10"
```

### Docker

```bash
docker build -t loan-fraud-api .
docker run -p 8000:8000 --env-file .env loan-fraud-api
```

## 📞 Support

For detailed API documentation, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

---

**Built with**: FastAPI | Azure AI Foundry | Cosmos DB | Blob Storage | Microsoft Agent Framework
