# Loan Fraud Detection System - Quick Start Guide

## What I've Built For You

A complete fraud detection orchestrator using **Microsoft Agent Framework with Concurrent Orchestration** (no MCP servers, no HandoffBuilder).

## File Structure

```
Loan-FraudApp-Backend/
├── app/
│   ├── __init__.py                     # Package initializer
│   └── agents/
│       ├── __init__.py                 # Agents package initializer
│       ├── behavioural_agent.py        # ✅ Updated with detailed instructions
│       ├── device_fingerprint_agent.py # ✅ Updated with detailed instructions
│       ├── fraud_ring_agent.py         # ✅ Updated with detailed instructions
│       ├── kyc_agent.py                # ✅ Updated with detailed instructions
│       └── agent_orchestrator.py       # ✅ NEW: Concurrent orchestrator
├── example_usage.py                    # ✅ NEW: Example scripts
├── .env.example                        # ✅ NEW: Environment template
├── README_ORCHESTRATOR.md              # ✅ NEW: Complete documentation
└── requirements.txt                    # Already has all dependencies
```

## Key Features

### ✨ Concurrent Orchestration (Not Handoff)
- All 4 agents run **in parallel** simultaneously
- Results aggregated into comprehensive fraud report
- Faster than sequential processing
- Each agent provides independent assessment

### 🤖 Four Specialized Agents

1. **Behavioral Agent** - Analyzes typing patterns, mouse movements, form behavior
2. **Device Fingerprint Agent** - Checks IP, geolocation, VPN/proxy detection
3. **Fraud Ring Agent** - Detects organized fraud networks and suspicious patterns
4. **KYC Agent** - Verifies identity documents and supporting documentation

### 📊 Comprehensive Output

- Overall risk score (0-100)
- Individual agent assessments
- Automatic recommendation: APPROVE / MANUAL_REVIEW / REJECT
- Critical issues and warnings
- Human-readable summary

## Quick Setup (3 Steps)

### 1. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your Azure AI Foundry details
# You need:
# - AZURE_AI_PROJECT_ENDPOINT (from your Azure AI Foundry project)
# - AZURE_AI_MODEL_DEPLOYMENT_NAME (e.g., gpt-4, gpt-4o)
```

### 2. Authenticate with Azure

```bash
az login
az account show  # Verify you're logged in
```

### 3. Run Example

```bash
# Test the system with sample data
python example_usage.py
```

## Usage Examples

### Example 1: Analyze Single Application

```python
import asyncio
import json
from app.agents.agent_orchestrator import run_loan_fraud_detection

async def analyze():
    application_data = {
        "application_id": "LN-2026-00123",
        "applicant": {...},
        "behavioral_data": {...},
        "device_data": {...},
        "kyc_documents": {...}
    }
    
    report = await run_loan_fraud_detection(json.dumps(application_data))
    
    print(f"Risk: {report['overall_risk_score']}/100")
    print(f"Status: {report['application_status']}")

asyncio.run(analyze())
```

### Example 2: Batch Processing

```python
from app.agents.agent_orchestrator import get_orchestrator

async def batch_analysis():
    orchestrator = await get_orchestrator()
    
    try:
        for application in applications:
            report = await orchestrator.run_workflow(
                json.dumps(application)
            )
            # Process report...
    finally:
        await orchestrator.cleanup()
```

## Application Data Format

The system expects JSON with these sections:

```json
{
  "application_id": "unique-id",
  "applicant": {
    "name": "...",
    "email": "...",
    "phone": "...",
    "address": "..."
  },
  "loan_details": {
    "amount_requested": 50000,
    "purpose": "...",
    "stated_income": 85000
  },
  "behavioral_data": {
    "keystroke_patterns": {...},
    "mouse_movements": {...},
    "form_completion_time_seconds": 180
  },
  "device_data": {
    "ip_address": "...",
    "geolocation": {...},
    "device_info": {...},
    "network_info": {...}
  },
  "kyc_documents": {
    "identity_document": {...},
    "proof_of_address": {...},
    "income_verification": {...}
  }
}
```

See `example_usage.py` for a complete sample.

## Output Format

```json
{
  "application_status": "APPROVED|MANUAL_REVIEW|REJECTED",
  "overall_risk_score": 35.5,
  "overall_recommendation": "...",
  "agent_analyses": {
    "lfa_behavioural_agent": {
      "risk_score": 25,
      "confidence": 85,
      "anomalies": []
    },
    "lfa_device_fingerprint_agent": {...},
    "lfa_fraud_ring_agent": {...},
    "lfa_kyc_agent": {...}
  },
  "critical_issues": [],
  "warnings": [],
  "summary": "..."
}
```

## Risk Scoring

- **0-39**: ✅ Low Risk → APPROVE
- **40-69**: ⚠️ Moderate Risk → MANUAL_REVIEW  
- **70-100**: 🚨 High Risk → REJECT

## How It Works

1. **Orchestrator starts** → Creates/retrieves 4 agents in Azure AI Foundry
2. **Concurrent execution** → All 4 agents analyze the loan application simultaneously
3. **Each agent outputs** → JSON with risk score, findings, recommendations
4. **Aggregation** → Orchestrator combines results into consolidated report
5. **Final decision** → Overall risk score and recommendation

## Advantages of Concurrent Orchestration

✅ **Parallel Processing** - All agents run at the same time (not sequential)
✅ **Independent Analysis** - No bias from previous agent results
✅ **Faster** - Completes in time of slowest agent, not sum of all
✅ **Scalable** - Can add more agents without increasing total time
✅ **Robust** - If one agent fails, others continue

vs. HandoffBuilder which is sequential (one agent → handoff → next agent)

## Testing the System

```bash
# Run the example script
python example_usage.py

# This will:
# 1. Create all 4 agents in Azure AI Foundry
# 2. Run a single application analysis
# 3. Run a batch of 3 applications
# 4. Display comprehensive results
```

## Troubleshooting

### "Missing environment variables"
→ Create `.env` file with your Azure AI Foundry details

### "Authentication failed"
→ Run `az login` to authenticate with Azure CLI

### "Agent not found"
→ Set `UPDATE_FOUNDRY_AGENT=true` in .env to create agents

## Next Steps

1. **Integrate with your application:** Import and use the orchestrator in your FastAPI/Flask app
2. **Customize agent instructions:** Edit the agent files to refine fraud detection logic
3. **Adjust risk thresholds:** Modify the scoring system in `_aggregate_results()`
4. **Add more agents:** Create additional agents for other fraud indicators

## Documentation

- Full documentation: `README_ORCHESTRATOR.md`
- Code examples: `example_usage.py`
- Agent definitions: `app/agents/*.py`

## Support

If you encounter issues:
1. Check Azure AI Foundry project is running
2. Verify model deployment is active
3. Ensure Azure CLI authentication works
4. Review agent logs in Azure AI Foundry portal

---

**Ready to detect fraud!** 🔍🛡️
