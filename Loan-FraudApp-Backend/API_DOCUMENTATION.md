# Loan Fraud Detection Backend API

Complete FastAPI backend for the Loan Fraud Detection System with Azure integration.

## 🚀 Features

- **Loan Application Management**: Create, retrieve, update, and delete loan applications
- **Document Upload**: Upload and manage KYC documents in Azure Blob Storage
- **Biometrics Tracking**: Capture behavioral patterns and device fingerprints
- **Fraud Analysis**: AI-powered concurrent agent orchestration for fraud detection
- **Dashboard Statistics**: Real-time analytics and reporting

## 📋 Prerequisites

- Python 3.10 or higher
- Azure subscription with:
  - Azure AI Foundry project
  - Cosmos DB account
  - Blob Storage account
- Azure CLI installed and authenticated

## 🛠️ Installation

1. **Clone the repository** (if not already done)

2. **Navigate to backend directory**:
   ```bash
   cd Loan-FraudApp-Backend
   ```

3. **Create virtual environment**:
   ```bash
   python -m venv venv
   
   # Windows
   .\venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   ```

4. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

5. **Configure environment variables**:
   - Copy `.env.example` to `.env`
   - Fill in your Azure credentials

   ```bash
   cp .env.example .env
   ```

   Update `.env` with your values:
   ```ini
   # Azure AI Foundry
   AZURE_AI_PROJECT_ENDPOINT=https://your-project.services.ai.azure.com
   AZURE_AI_MODEL_DEPLOYMENT_NAME=gpt-4
   
   # Cosmos DB
   COSMOS_DB_URL=https://your-cosmos-account.documents.azure.com:443/
   COSMOS_DB_KEY=your-key-here
   COSMOS_DB_NAME=loan-fraud-db
   COSMOS_PROJECTS_CONTAINER=loan-applications
   
   # Blob Storage
   AZURE_STORAGE_CONNECTION_STRING=your-connection-string
   AZURE_STORAGE_ACCOUNT_NAME=your-storage-account
   AZURE_STORAGE_ACCOUNT_KEY=your-storage-key
   AZURE_STORAGE_CONTAINER_NAME=loan-documents
   
   # API
   PORT=8000
   ```

6. **Authenticate with Azure CLI**:
   ```bash
   az login
   ```

## 🏃 Running the API

### Development Mode

```bash
# Run with auto-reload
python main.py

# Or using uvicorn directly
uvicorn main:app --reload --port 8000
```

### Production Mode

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

The API will be available at:
- **API Base**: http://localhost:8000
- **Interactive Docs**: http://localhost:8000/docs
- **OpenAPI Spec**: http://localhost:8000/openapi.json

## 📚 API Endpoints

### Health Check

#### `GET /`
Root endpoint - API health check

**Response**:
```json
{
  "status": "healthy",
  "service": "Loan Fraud Detection API",
  "version": "1.0.0",
  "timestamp": "2026-03-09T10:00:00Z"
}
```

#### `GET /health`
Detailed health check with service status

---

### Loan Application Management

#### `POST /api/loans/create`
Create a new loan application

**Request Body**:
```json
{
  "applicant_info": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "phone": "1234567890",
    "date_of_birth": "1990-01-01",
    "ssn": "123-45-6789",
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
    "annual_income": 75000,
    "employer_name": "Tech Corp",
    "years_employed": 3.5
  },
  "biometrics": {
    "keystroke_dynamics": {},
    "mouse_movements": {},
    "form_interaction_time": 180.5,
    "typing_speed": 45.2
  },
  "device_fingerprint": {
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/5.0...",
    "screen_resolution": "1920x1080",
    "timezone": "America/New_York",
    "platform": "Win32",
    "browser": "Chrome"
  }
}
```

**Response**:
```json
{
  "loan_app_id": "LN-App-001",
  "status": "draft",
  "created_at": "2026-03-09T10:00:00Z",
  "updated_at": "2026-03-09T10:00:00Z",
  "applicant_info": {...},
  "loan_details": {...},
  "documents_uploaded": 0,
  "fraud_score": null,
  "message": "Loan application created successfully. You can now upload documents."
}
```

#### `GET /api/loans/{loan_app_id}`
Get loan application details

**Path Parameters**:
- `loan_app_id`: Loan application ID (e.g., LN-App-001)

**Response**: Complete loan application with all data

#### `GET /api/loans?status=submitted&limit=50`
List all loan applications

**Query Parameters**:
- `status` (optional): Filter by status (draft, submitted, under_review, approved, rejected)
- `limit` (optional): Max results (default: 100)

#### `PUT /api/loans/{loan_app_id}/status`
Update loan application status

**Request Body**:
```json
{
  "status": "submitted"
}
```

#### `DELETE /api/loans/{loan_app_id}`
Delete loan application and all documents

---

### Biometrics & Device Fingerprint

#### `POST /api/loans/{loan_app_id}/biometrics`
Add biometrics and device fingerprint data

**Request Body**:
```json
{
  "loan_app_id": "LN-App-001",
  "event_type": "data_entry",
  "biometrics": {
    "keystroke_dynamics": {...},
    "mouse_movements": {...},
    "form_interaction_time": 120.5,
    "typing_speed": 48.3,
    "pause_patterns": [2.1, 3.5, 1.8]
  },
  "device_fingerprint": {
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/5.0...",
    "geolocation": {"latitude": 40.7128, "longitude": -74.0060}
  }
}
```

**Event Types**:
- `data_entry`: During form filling
- `document_upload`: During document upload
- `form_submit`: On final submission

---

### Document Management

#### `POST /api/loans/{loan_app_id}/documents/upload`
Upload a document

**Form Data**:
- `file`: File to upload (multipart/form-data)
- `document_type`: Type of document (identity_proof, address_proof, income_proof, etc.)
- `biometrics` (optional): JSON string of biometrics data
- `device_fingerprint` (optional): JSON string of device fingerprint

**Example using cURL**:
```bash
curl -X POST "http://localhost:8000/api/loans/LN-App-001/documents/upload" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/path/to/document.pdf" \
  -F "document_type=identity_proof"
```

**Response**:
```json
{
  "loan_app_id": "LN-App-001",
  "document_id": "550e8400-e29b-41d4-a716-446655440000",
  "file_name": "passport.pdf",
  "file_size": 1024567,
  "content_type": "application/pdf",
  "blob_url": "https://...",
  "uploaded_at": "2026-03-09T10:05:00Z",
  "message": "Document uploaded successfully"
}
```

#### `GET /api/loans/{loan_app_id}/documents`
List all documents for a loan application

#### `GET /api/loans/{loan_app_id}/documents/{document_id}`
Get document download URL with SAS token

**Response**:
```json
{
  "loan_app_id": "LN-App-001",
  "document_id": "550e8400...",
  "download_url": "https://...?sas_token=...",
  "expires_in_hours": 24,
  "message": "Use the download_url to retrieve the document"
}
```

#### `DELETE /api/loans/{loan_app_id}/documents/{document_id}`
Delete a specific document

---

### Fraud Analysis

#### `POST /api/loans/{loan_app_id}/analyze`
Run fraud analysis using AI agents

**Response**:
```json
{
  "loan_app_id": "LN-App-001",
  "overall_risk_score": 45.8,
  "risk_level": "MEDIUM",
  "agent_results": {
    "behavioral_agent": {
      "risk_score": 35.0,
      "findings": ["Normal typing patterns", "Consistent interaction behavior"]
    },
    "device_fingerprint_agent": {
      "risk_score": 50.0,
      "findings": ["VPN detected", "Geolocation mismatch"]
    },
    "fraud_ring_agent": {
      "risk_score": 40.0,
      "findings": ["No suspicious connections found"]
    },
    "kyc_agent": {
      "risk_score": 55.0,
      "findings": ["Document verification pending", "Address needs validation"]
    }
  },
  "recommendations": [
    "Request additional address verification",
    "Follow up on VPN usage",
    "Schedule manual review"
  ],
  "analyzed_at": "2026-03-09T10:10:00Z",
  "processing_time_seconds": 8.5
}
```

**Risk Levels**:
- `LOW`: 0-33
- `MEDIUM`: 34-66
- `HIGH`: 67-100

#### `GET /api/loans/{loan_app_id}/analysis`
Retrieve fraud analysis results

---

### Dashboard & Statistics

#### `GET /api/dashboard/statistics`
Get dashboard statistics

**Response**:
```json
{
  "total_applications": 150,
  "status_breakdown": {
    "draft": 10,
    "submitted": 45,
    "under_review": 50,
    "approved": 30,
    "rejected": 15
  },
  "high_risk_applications": 12,
  "recent_applications": [
    {
      "loan_app_id": "LN-App-025",
      "applicant_name": "John Doe",
      "loan_amount": 50000,
      "status": "submitted",
      "risk_level": "MEDIUM",
      "created_at": "2026-03-09T09:00:00Z"
    }
  ]
}
```

---

## 🔄 Typical Workflow

1. **Create Application**: `POST /api/loans/create`
   - Captures initial applicant info and loan details
   - Records biometrics and device fingerprint during form entry
   - Returns `loan_app_id` (e.g., LN-App-001)

2. **Upload Documents**: `POST /api/loans/{loan_app_id}/documents/upload`
   - Upload identity proof, address proof, income documents
   - Files stored in Blob Storage under loan_app_id folder
   - Captures biometrics during upload process

3. **Add Additional Biometrics**: `POST /api/loans/{loan_app_id}/biometrics`
   - Track behavioral patterns throughout the process
   - Multiple captures for behavioral analysis

4. **Submit Application**: `PUT /api/loans/{loan_app_id}/status`
   - Change status to "submitted"

5. **Run Fraud Analysis**: `POST /api/loans/{loan_app_id}/analyze`
   - Executes all 4 AI agents concurrently
   - Analyzes biometrics, device data, documents, fraud rings
   - Returns overall risk score and recommendations

6. **Review Results**: `GET /api/loans/{loan_app_id}`
   - View complete application with fraud analysis
   - Make decision based on risk level

---

## 🏗️ Architecture

### Services

- **CosmosDBService**: Handles all database operations
  - Generates loan_app_id in format: LN-App-001, LN-App-002, etc.
  - Stores application data with partition key: loan_app_id
  - Tracks biometrics history and device fingerprint history

- **BlobStorageService**: Handles document storage
  - Uploads files to container under loan_app_id folder
  - Generates SAS tokens for secure access
  - Manages document metadata

- **Agent Orchestrator**: Fraud detection system
  - 4 concurrent AI agents
  - Microsoft Agent Framework integration
  - Real-time analysis and scoring

### Data Models

- **LoanApplication**: Main application data
- **BiometricsData**: Keystroke, mouse, interaction patterns
- **DeviceFingerprintData**: IP, browser, device characteristics
- **DocumentMetadata**: File information and blob references
- **FraudAnalysis**: Agent results and risk scores

---

## 🧪 Testing

### Using FastAPI Docs (Swagger UI)

Navigate to http://localhost:8000/docs for interactive API testing

### Using cURL

```bash
# Create application
curl -X POST "http://localhost:8000/api/loans/create" \
  -H "Content-Type: application/json" \
  -d @sample_application.json

# Upload document
curl -X POST "http://localhost:8000/api/loans/LN-App-001/documents/upload" \
  -F "file=@document.pdf" \
  -F "document_type=identity_proof"

# Run analysis
curl -X POST "http://localhost:8000/api/loans/LN-App-001/analyze"

# Get results
curl "http://localhost:8000/api/loans/LN-App-001/analysis"
```

### Using Postman

Import the API from: http://localhost:8000/openapi.json

---

## 📊 Database Schema

### Cosmos DB Container: loan-applications

**Partition Key**: `/loan_app_id`

**Document Structure**:
```json
{
  "id": "LN-App-001",
  "loan_app_id": "LN-App-001",
  "status": "submitted",
  "applicant_info": {...},
  "loan_details": {...},
  "biometrics_history": [...],
  "device_fingerprint_history": [...],
  "documents": [...],
  "fraud_analysis": {...},
  "created_at": "2026-03-09T10:00:00Z",
  "updated_at": "2026-03-09T10:00:00Z",
  "document_type": "loan_application"
}
```

### Blob Storage Container: loan-documents

**Folder Structure**:
```
loan-documents/
  ├── LN-App-001/
  │   ├── uuid1_passport.pdf
  │   ├── uuid2_bank_statement.pdf
  │   └── uuid3_income_proof.pdf
  ├── LN-App-002/
  │   └── uuid4_identity.pdf
  └── LN-App-003/
      └── ...
```

---

## 🔐 Security Considerations

- Store sensitive data encrypted in Cosmos DB
- Use SAS tokens with expiration for document access
- Implement rate limiting in production
- Add authentication/authorization (JWT, OAuth)
- Validate file uploads (size, type, content)
- Sanitize user inputs
- Enable CORS only for trusted origins

---

## 🚀 Deployment

### Azure App Service

```bash
# Login to Azure
az login

# Create App Service
az webapp up --name loan-fraud-api --runtime "PYTHON:3.10"

# Configure environment variables
az webapp config appsettings set --name loan-fraud-api \
  --settings COSMOS_DB_URL="..." COSMOS_DB_KEY="..."
```

### Docker

```dockerfile
FROM python:3.10-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 📝 License

MIT License

## 🤝 Support

For issues or questions, please open an issue on GitHub.
