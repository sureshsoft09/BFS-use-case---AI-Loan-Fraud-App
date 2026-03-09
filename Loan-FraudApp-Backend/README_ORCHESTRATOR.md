# Loan Fraud Detection - Agent Orchestrator

A comprehensive fraud detection system for loan applications using Microsoft Agent Framework with concurrent orchestration. The system analyzes loan applications across four critical dimensions simultaneously using AI agents.

## Architecture

### Concurrent Orchestration
Unlike sequential handoff-based approaches, this system uses **concurrent orchestration** where all agents run in parallel, providing:
- **Faster analysis** - All agents analyze simultaneously
- **Independent assessments** - Each agent provides unbiased analysis
- **Comprehensive results** - Aggregated risk assessment from all dimensions

### Four Specialized Agents

1. **Behavioral Analysis Agent** (`lfa_behavioural_agent`)
   - Analyzes keystroke dynamics and typing patterns
   - Detects mouse movement anomalies
   - Identifies robotic or automated behavior
   - Monitors form completion patterns

2. **Device Fingerprint Agent** (`lfa_device_fingerprint_agent`)
   - Validates IP address and geolocation
   - Detects VPN, proxy, or Tor usage
   - Identifies device spoofing attempts
   - Tracks device consistency across sessions

3. **Fraud Ring Detection Agent** (`lfa_fraud_ring_agent`)
   - Identifies organized fraud networks
   - Detects shared contact information patterns
   - Finds synthetic identities
   - Validates application data integrity

4. **KYC Verification Agent** (`lfa_kyc_agent`)
   - Verifies identity documents
   - Validates proof of address and income
   - Detects document tampering or fraud
   - Ensures document completeness and consistency

## Setup

### 1. Prerequisites
- Python 3.10 or higher
- Azure AI Foundry project with a deployed model
- Azure CLI installed and authenticated

### 2. Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Authenticate with Azure CLI
az login
```

### 3. Configuration

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Update the `.env` file with your Azure AI Foundry details:

```env
AZURE_AI_PROJECT_ENDPOINT=https://your-project-name.services.ai.azure.com
AZURE_AI_MODEL_DEPLOYMENT_NAME=gpt-4
UPDATE_FOUNDRY_AGENT=true
```

## Usage

### Quick Start - Single Application Analysis

```python
import asyncio
import json
from app.agents.agent_orchestrator import run_loan_fraud_detection

async def analyze_application():
    # Prepare loan application data
    application_data = {
        "application_id": "LN-2026-00123",
        "applicant": {
            "name": "John Doe",
            "email": "john.doe@example.com",
            # ... more applicant details
        },
        "behavioral_data": {
            # Keystroke, mouse, timing data
        },
        "device_data": {
            # IP, geolocation, device fingerprint
        },
        "kyc_documents": {
            # Identity docs, proof of address, income verification
        }
    }
    
    # Run fraud detection
    report = await run_loan_fraud_detection(json.dumps(application_data))
    
    # Check results
    print(f"Risk Score: {report['overall_risk_score']}/100")
    print(f"Status: {report['application_status']}")
    print(f"Recommendation: {report['overall_recommendation']}")
    
    return report

# Run the analysis
asyncio.run(analyze_application())
```

### Batch Processing - Multiple Applications

```python
from app.agents.agent_orchestrator import get_orchestrator

async def analyze_batch():
    # Create orchestrator once for efficiency
    orchestrator = await get_orchestrator()
    
    try:
        applications = [app1, app2, app3]  # Your application data
        results = []
        
        for app in applications:
            report = await orchestrator.run_workflow(json.dumps(app))
            results.append(report)
        
        return results
    finally:
        await orchestrator.cleanup()

asyncio.run(analyze_batch())
```

### Run Example Script

```bash
python example_usage.py
```

## Application Data Format

The system expects loan application data in JSON format with the following structure:

```json
{
  "application_id": "LN-2026-00123",
  "timestamp": "2026-03-09T10:30:00Z",
  
  "applicant": {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1-555-0123",
    "address": "123 Main St, Springfield, IL 62701",
    "ssn_last4": "1234",
    "date_of_birth": "1985-06-15"
  },
  
  "loan_details": {
    "amount_requested": 50000,
    "purpose": "Home Renovation",
    "term_months": 60,
    "stated_income": 85000
  },
  
  "behavioral_data": {
    "form_completion_time_seconds": 180,
    "keystroke_patterns": {
      "average_keystroke_interval_ms": 150,
      "typing_speed_wpm": 45,
      "copy_paste_count": 2,
      "backspace_count": 15
    },
    "mouse_movements": {
      "total_movements": 234,
      "suspicious_patterns": false
    }
  },
  
  "device_data": {
    "ip_address": "192.168.1.100",
    "geolocation": {
      "country": "US",
      "state": "Illinois",
      "city": "Springfield"
    },
    "device_info": {
      "user_agent": "Mozilla/5.0...",
      "os": "Windows 10",
      "browser": "Chrome 120.0"
    },
    "network_info": {
      "vpn_detected": false,
      "proxy_detected": false
    }
  },
  
  "kyc_documents": {
    "identity_document": {
      "type": "drivers_license",
      "uploaded": true,
      "expiration_date": "2028-06-15"
    },
    "proof_of_address": {
      "type": "utility_bill",
      "uploaded": true
    },
    "income_verification": {
      "type": "pay_stub",
      "uploaded": true
    }
  }
}
```

## Output Format

The orchestrator returns a comprehensive fraud assessment report:

```json
{
  "application_status": "APPROVED|MANUAL_REVIEW|REJECTED",
  "overall_risk_score": 35.5,
  "overall_recommendation": "APPROVE - Low fraud risk",
  "timestamp": "2026-03-09T10:35:00Z",
  
  "agent_analyses": {
    "lfa_behavioural_agent": {
      "agent": "behavioral",
      "risk_score": 25,
      "confidence": 85,
      "anomalies": [],
      "recommendation": "Normal behavior patterns"
    },
    "lfa_device_fingerprint_agent": {
      "agent": "device_fingerprint",
      "risk_score": 30,
      "confidence": 90,
      "red_flags": [],
      "recommendation": "Device checks passed"
    },
    "lfa_fraud_ring_agent": {
      "agent": "fraud_ring",
      "risk_score": 40,
      "confidence": 75,
      "connections_found": [],
      "recommendation": "No fraud ring indicators"
    },
    "lfa_kyc_agent": {
      "agent": "kyc",
      "risk_score": 20,
      "confidence": 95,
      "document_status": {
        "identity_verified": true,
        "address_verified": true,
        "income_verified": true
      },
      "recommendation": "All documents verified"
    }
  },
  
  "critical_issues": [],
  "warnings": [],
  "summary": "Fraud Detection Analysis Complete..."
}
```

## Risk Score Interpretation

- **0-39**: Low Risk → APPROVE
- **40-69**: Moderate Risk → MANUAL_REVIEW
- **70-100**: High Risk → REJECT

## Agent Configuration

Each agent is configured with specific parameters optimized for fraud detection:

- **Temperature**: 0.3-0.4 (lower for consistent, deterministic analysis)
- **Top-P**: 0.9-0.95 (focused sampling)
- **Max Tokens**: 4000-6000 (sufficient for detailed analysis)

## Troubleshooting

### Authentication Issues
```bash
# Re-authenticate with Azure CLI
az login
az account show
```

### Missing Environment Variables
Ensure your `.env` file contains all required variables:
- `AZURE_AI_PROJECT_ENDPOINT`
- `AZURE_AI_MODEL_DEPLOYMENT_NAME`

### Agent Update Issues
If you want to force agent updates, set:
```env
UPDATE_FOUNDRY_AGENT=true
```

## Integration

### FastAPI Integration Example

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

class LoanApplication(BaseModel):
    # Define your application model
    pass

@app.post("/analyze-loan")
async def analyze_loan(application: LoanApplication):
    try:
        report = await run_loan_fraud_detection(
            application.json()
        )
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

## Performance

- **Concurrent execution**: All 4 agents run in parallel
- **Average analysis time**: 5-10 seconds (depending on model and data complexity)
- **Scalability**: Reuse orchestrator instance for batch processing

## Security Considerations

- All data is processed in Azure AI Foundry (data stays in your Azure tenant)
- No data is stored by the orchestrator (stateless design)
- Use Azure RBAC to control access to AI Foundry
- Implement rate limiting for production deployments

## Support

For issues or questions:
1. Check Azure AI Foundry project status
2. Verify authentication with `az account show`
3. Review agent logs in Azure AI Foundry portal
4. Check model deployment status

## License

[Your License Here]
