"""
FastAPI application for Loan Fraud Detection System
Main API endpoints for loan application management and fraud analysis
"""
import os
import time
import json
import logging
from typing import List, Optional
from datetime import datetime
from io import BytesIO
from contextlib import asynccontextmanager
from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from dotenv import load_dotenv

# Import models
from app.models.schemas import (
    CreateLoanApplicationRequest,
    LoanApplicationResponse,
    DocumentUploadResponse,
    BiometricsUpdateRequest,
    FraudAnalysisRequest,
    FraudAnalysisResponse,
    LoanApplicationDetail,
    ApplicationStatus,
    StatusUpdateRequest,
    ReviewRequest,
    BiometricsData,
    DeviceFingerprintData,
    AgentAnalysisResult,
    SubmitApplicationResponse
)

# Import services
from app.services.cosmos_service import get_cosmos_service
from app.services.blob_service import get_blob_service

# Import agent orchestrator
from app.agents.agent_orchestrator import AgentOrchestrator

load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Suppress verbose Azure SDK logs
logging.getLogger("azure.identity").setLevel(logging.WARNING)
logging.getLogger("azure.core.pipeline.policies.http_logging_policy").setLevel(logging.WARNING)
logging.getLogger("azure.ai").setLevel(logging.WARNING)
logging.getLogger("azure.cosmos").setLevel(logging.WARNING)
logging.getLogger("azure.cosmos._cosmos_http_logging_policy").setLevel(logging.WARNING)

# Global agent orchestrator instance
global_orchestrator: Optional[AgentOrchestrator] = None


async def initialize_agent_service(): 
    """Initialize the agent orchestrator at application startup"""
    global global_orchestrator
    try:
        logger.info("Initializing Agent Orchestrator...")
        global_orchestrator = AgentOrchestrator()
        await global_orchestrator.setup_agents()
        await global_orchestrator.initialize_workflow()
        logger.info("✓ Agent Orchestrator initialized successfully")
    except Exception as e:
        logger.error(f"✗ Failed to initialize Agent Orchestrator: {str(e)}")
        raise


async def shutdown_agent_service():
    """Clean up agent orchestrator at application shutdown"""
    global global_orchestrator
    if global_orchestrator:
        try:
            logger.info("Cleaning up Agent Orchestrator...")
            await global_orchestrator.cleanup()
            logger.info("✓ Agent Orchestrator cleaned up")
        except Exception as e:
            logger.error(f"Error during cleanup: {str(e)}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan handler.
    - Startup: initializes the AgentOrchestrator once (creates agents + workflow).
    - Shutdown: cleans up the orchestrator.
    """
    logger.info("Application startup: initializing agent service...")
    await initialize_agent_service()
    logger.info("Agent service ready. API is accepting requests.")

    yield  # Application runs here

    logger.info("Application shutdown: cleaning up agent service...")
    await shutdown_agent_service()


# Initialize FastAPI app with lifespan handler
app = FastAPI(
    title="Loan Fraud Detection API",
    description="AI-Powered Multi-Agent Fraud Analysis System using Microsoft Agent Framework",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update with specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Dependency injection for services
def get_db_service():
    """Get Cosmos DB service instance"""
    return get_cosmos_service()


def get_storage_service():
    """Get Blob Storage service instance"""
    return get_blob_service()


# Health check endpoint
@app.get("/")
async def root():
    """Root endpoint - API health check"""
    return {
        "status": "healthy",
        "service": "Loan Fraud Detection API",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "cosmos_db": "connected",
        "blob_storage": "connected",
        "timestamp": datetime.utcnow().isoformat()
    }


# ============================================================================
# LOAN APPLICATION ENDPOINTS
# ============================================================================

async def run_fraud_analysis_background(
    loan_app_id: str,
    db_service,
    storage_service
):
    """
    Background task to run comprehensive fraud analysis
    
    This function runs asynchronously in the background after user receives
    success confirmation. Results are stored in database for manager review.
    """
    try:
        print(f"\n{'='*80}")
        print(f"BACKGROUND FRAUD ANALYSIS STARTED: {loan_app_id}")
        print(f"{'='*80}\n")
        
        # Step 1: Retrieve application data
        print("Step 1: Retrieving loan application from database...")
        application = db_service.get_loan_application(loan_app_id)
        if not application:
            print(f"  ✗ Application not found: {loan_app_id}")
            return
        
        print(f"  ✓ Application found")
        
        # Step 2: Collect all data from database
        print("\nStep 2: Collecting all application data from database...")
        applicant_info = application.get("applicant_info", {})
        loan_details = application.get("loan_details", {})
        biometrics_history = application.get("biometrics_history", [])
        device_fingerprint_history = application.get("device_fingerprint_history", [])
        documents_metadata = application.get("documents", [])
        
        print(f"  ✓ Applicant info: {applicant_info.get('first_name', 'N/A')} {applicant_info.get('last_name', 'N/A')}")
        print(f"  ✓ Loan amount: ${loan_details.get('loan_amount', 0):,.2f}")
        print(f"  ✓ Biometrics records: {len(biometrics_history)}")
        print(f"  ✓ Device fingerprint records: {len(device_fingerprint_history)}")
        print(f"  ✓ Documents metadata: {len(documents_metadata)}")
        
        # Step 3: Retrieve all document contents from blob storage
        print("\nStep 3: Retrieving all document contents from blob storage...")
        documents_with_content = []
        if documents_metadata:
            try:
                documents_with_content = storage_service.get_all_document_contents(loan_app_id)
                print(f"  ✓ Retrieved {len(documents_with_content)} documents with content")
                
                for doc in documents_with_content:
                    print(f"    - {doc.get('file_name')} ({doc.get('file_size')} bytes)")
            except Exception as doc_error:
                print(f"  ⚠ Warning: Could not retrieve document contents: {str(doc_error)}")
                documents_with_content = documents_metadata
        
        # Step 4: Structure data into separate datasets for each agent
        print("\nStep 4: Structuring data for concurrent agent analysis...")
        
        # Dataset for Behavioral Agent
        behavioral_dataset = {
            "biometrics_history": biometrics_history,
            "applicant_info": {
                "name": f"{applicant_info.get('first_name', '')} {applicant_info.get('last_name', '')}",
                "email": applicant_info.get('email', ''),
                "phone": applicant_info.get('phone', '')
            },
            "form_submission_count": len(biometrics_history)
        }
        
        # Dataset for Device Fingerprint Agent
        device_fingerprint_dataset = {
            "device_fingerprint_history": device_fingerprint_history,
            "application_details": {
                "loan_amount": loan_details.get('loan_amount', 0),
                "loan_purpose": loan_details.get('loan_purpose', ''),
                "submission_time": application.get('created_at', '')
            },
            "device_change_count": len(device_fingerprint_history)
        }
        
        # Dataset for Fraud Ring Agent
        fraud_ring_dataset = {
            "applicant_info": applicant_info,
            "device_fingerprint_history": device_fingerprint_history,
            "biometrics_history": biometrics_history,
            "loan_details": loan_details,
            "created_at": application.get('created_at', ''),
            "updated_at": application.get('updated_at', '')
        }
        
        # Dataset for KYC Agent (with document contents)
        kyc_dataset = {
            "applicant_info": applicant_info,
            "documents": documents_with_content,
            "document_count": len(documents_with_content),
            "loan_amount": loan_details.get('loan_amount', 0)
        }
        
        # Complete dataset for all agents
        complete_dataset = {
            "loan_app_id": loan_app_id,
            "applicant_info": applicant_info,
            "loan_details": loan_details,
            "behavioral_data": behavioral_dataset,
            "device_fingerprint_data": device_fingerprint_dataset,
            "fraud_ring_data": fraud_ring_dataset,
            "kyc_data": kyc_dataset,
            "biometrics_history": biometrics_history,
            "device_fingerprint_history": device_fingerprint_history,
            "documents": documents_with_content,
            "created_at": application.get('created_at', ''),
            "status": "submitted"
        }
        
        print(f"  ✓ Data structured for all agents")
        print(f"    - Behavioral Agent: {len(biometrics_history)} biometric records")
        print(f"    - Device Fingerprint Agent: {len(device_fingerprint_history)} device records")
        print(f"    - Fraud Ring Agent: Complete application data")
        print(f"    - KYC Agent: {len(documents_with_content)} documents with content")
        
        # Step 5: Run concurrent fraud detection analysis
        print(f"\nStep 5: Running concurrent fraud detection agents...")
        print(f"  Using global orchestrator with pre-initialized agents...")
        
        start_time = time.time()

        print(f" Complete dataset - {complete_dataset}")

        import json as _json

        def _safe_json(obj):
            try:
                return _json.dumps(obj, indent=2, default=str)
            except Exception:
                return str(obj)

        prompt_input = f"""You are a specialized fraud detection agent. A loan application has been submitted and requires your expert analysis.

Apply your specific area of expertise to the data provided below and produce a risk assessment for this application.

=== APPLICATION REFERENCE ===
Loan Application ID : {loan_app_id}
Submitted At        : {complete_dataset.get('created_at', 'N/A')}

=== APPLICANT INFORMATION ===
{_safe_json(complete_dataset.get('applicant_info', {}))}

=== LOAN DETAILS ===
{_safe_json(complete_dataset.get('loan_details', {}))}

=== BEHAVIOURAL / BIOMETRIC DATA ===
(Keystroke dynamics, mouse movements, form interaction timings)
{_safe_json(complete_dataset.get('behavioral_data', {}))}

=== DEVICE FINGERPRINT DATA ===
(IP address, geolocation, browser/OS, VPN/proxy indicators, session history)
{_safe_json(complete_dataset.get('device_fingerprint_data', {}))}

=== FRAUD RING INDICATORS ===
(Cross-applicant connections, shared contacts, address clusters, identity consistency)
{_safe_json(complete_dataset.get('fraud_ring_data', {}))}

=== KYC DOCUMENTS ===
(Identity documents, proof of address, income verification, document contents)
{_safe_json(complete_dataset.get('kyc_data', {}))}

=== INSTRUCTIONS ===
1. Focus exclusively on your designated area of expertise (defined in your system instructions).
2. Analyse only the data sections that are relevant to your specialization.
3. Base your risk score solely on evidence present in the data — do NOT assume risk without evidence.
4. If a data section is empty or unavailable, note it and reduce your confidence score accordingly.
5. You MUST respond using EXACTLY the plain-text format specified in your system instructions.
   Do NOT use JSON, markdown code blocks, or any other format.
   Required fields: RISK_SCORE, CONFIDENCE, RECOMMENDATION, your findings list, and ANALYSIS.
"""
        
        try:
            # Use the global orchestrator instance (already initialized at startup)
            if not global_orchestrator:
                raise RuntimeError("Agent orchestrator not initialized")
            
            # Pass the complete dataset to the orchestrator
            analysis_results = await global_orchestrator.run_workflow(prompt_input)
        except Exception as agent_error:
            print(f"  ✗ Agent analysis failed: {str(agent_error)}")
            # Update status to indicate analysis failure
            db_service.update_loan_application(
                loan_app_id, 
                {
                    "status": "analysis_failed",
                    "analysis_error": str(agent_error)
                }
            )
            return
        
        processing_time = time.time() - start_time
        print(f"  ✓ Agent analysis completed in {processing_time:.2f} seconds")
        
        # Step 6: Extract individual agent results
        print(f"\nStep 6: Processing agent analysis results...")
        
        overall_risk_score = analysis_results.get("overall_risk_score", 50.0)
        overall_recommendation = analysis_results.get("overall_recommendation", "MANUAL_REVIEW")
        application_status = analysis_results.get("application_status", "under_review")
        
        # Map uppercase agent-output statuses to lowercase enum-compatible values
        _status_map = {
            "APPROVED": "approved",
            "REJECTED": "rejected",
            "MANUAL_REVIEW": "manual_review",
            "UNDER_REVIEW": "under_review",
        }
        application_status = _status_map.get(application_status, application_status.lower())
        
        print(f"  Individual Agent Results:")
        agent_analyses_dict = analysis_results.get("agent_analyses", {})
        for agent_name, agent_data in agent_analyses_dict.items():
            risk_score = agent_data.get("risk_score", 0)
            print(f"    - {agent_name}: Risk Score = {risk_score}/100")
        
        print(f"\n  Overall Risk Score: {overall_risk_score}/100")
        print(f"  Overall Recommendation: {overall_recommendation}")
        print(f"  Application Status: {application_status}")
        
        # Step 7: Store results in database
        print(f"\nStep 7: Storing analysis results in database...")
        
        db_service.update_detailed_agent_analysis(
            loan_app_id=loan_app_id,
            agent_analyses=analysis_results,
            overall_score=overall_risk_score,
            overall_status=application_status
        )
        
        print(f"  ✓ Results stored in database")
        print(f"    - Overall score: {overall_risk_score}/100")
        print(f"    - Status: {application_status}")
        print(f"    - Individual agent scores: {len(agent_analyses_dict)}")
        
        print(f"\n{'='*80}")
        print(f"BACKGROUND FRAUD ANALYSIS COMPLETED: {loan_app_id}")
        print(f"{'='*80}\n")
        
    except Exception as e:
        print(f"\n✗ Background fraud analysis error for {loan_app_id}: {str(e)}")
        try:
            # Update status to indicate analysis failure
            db_service.update_loan_application(
                loan_app_id, 
                {
                    "status": "analysis_failed",
                    "analysis_error": str(e)
                }
            )
        except:
            pass  # If we can't update the status, just log and continue


@app.post("/api/loans/create", response_model=LoanApplicationResponse)
async def create_loan_application(
    request: CreateLoanApplicationRequest,
    db_service = Depends(get_db_service)
):
    """
    Create a new loan application with applicant info, loan details, 
    biometrics, and device fingerprint data
    
    - Generates unique loan_app_id in format: LN-App-001
    - Stores initial data in Cosmos DB
    - Returns loan application ID for document uploads
    """
    try:
        # Prepare application data with proper datetime serialization
        application_data = {
            "applicant_info": request.applicant_info.model_dump(),
            "loan_details": request.loan_details.model_dump(),
            "biometrics": request.biometrics.model_dump(mode='json') if request.biometrics else None,
            "device_fingerprint": request.device_fingerprint.model_dump(mode='json') if request.device_fingerprint else None
        }
        
        # Create loan application in Cosmos DB
        created_app = db_service.create_loan_application(application_data)
        
        return LoanApplicationResponse(
            loan_app_id=created_app["loan_app_id"],
            status=ApplicationStatus(created_app["status"]),
            created_at=datetime.fromisoformat(created_app["created_at"]),
            updated_at=datetime.fromisoformat(created_app["updated_at"]),
            applicant_info=request.applicant_info,
            loan_details=request.loan_details,
            documents_uploaded=0,
            fraud_score=None,
            message="Loan application created successfully. You can now upload documents."
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating loan application: {str(e)}")


@app.get("/api/loans/{loan_app_id}", response_model=LoanApplicationDetail)
async def get_loan_application(
    loan_app_id: str,
    db_service = Depends(get_db_service)
):
    """
    Retrieve a loan application by ID with all details
    
    - Returns complete application data
    - Includes biometrics history
    - Includes device fingerprint history
    - Includes uploaded documents list
    - Includes fraud analysis results if available
    """
    try:
        application = db_service.get_loan_application(loan_app_id)
        
        if not application:
            raise HTTPException(status_code=404, detail=f"Loan application {loan_app_id} not found")
        
        # Normalize status: old docs may have uppercase values from the agent orchestrator
        _STATUS_MAP = {"APPROVED": "approved", "REJECTED": "rejected",
                       "MANUAL_REVIEW": "manual_review", "UNDER_REVIEW": "under_review",
                       "SUBMITTED": "submitted", "DRAFT": "draft"}
        raw_status = application.get("status", "draft")
        application["status"] = _STATUS_MAP.get(raw_status, raw_status.lower())
        
        return LoanApplicationDetail(
            loan_app_id=application["loan_app_id"],
            status=ApplicationStatus(application["status"]),
            applicant_info=application.get("applicant_info", {}),
            loan_details=application.get("loan_details", {}),
            biometrics_history=application.get("biometrics_history", []),
            device_fingerprint_history=application.get("device_fingerprint_history", []),
            documents=application.get("documents", []),
            fraud_analysis=application.get("fraud_analysis"),
            created_at=datetime.fromisoformat(application["created_at"]),
            updated_at=datetime.fromisoformat(application["updated_at"])
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving loan application: {str(e)}")


@app.get("/api/loans", response_model=List[LoanApplicationDetail])
async def list_loan_applications(
    status: Optional[str] = None,
    limit: int = 100,
    db_service = Depends(get_db_service)
):
    """
    List all loan applications with optional status filter
    
    - Query parameter: status (draft, submitted, under_review, approved, rejected)
    - Query parameter: limit (default: 100)
    - Returns list of loan applications
    """
    try:
        applications = db_service.list_loan_applications(status=status, limit=limit)
        
        _STATUS_MAP = {"APPROVED": "approved", "REJECTED": "rejected",
                       "MANUAL_REVIEW": "manual_review", "UNDER_REVIEW": "under_review",
                       "SUBMITTED": "submitted", "DRAFT": "draft"}
        
        result = []
        for app in applications:
            try:
                raw_status = app.get("status", "draft")
                app["status"] = _STATUS_MAP.get(raw_status, raw_status.lower())
                result.append(LoanApplicationDetail(
                    loan_app_id=app["loan_app_id"],
                    status=ApplicationStatus(app["status"]),
                    applicant_info=app.get("applicant_info", {}),
                    loan_details=app.get("loan_details", {}),
                    biometrics_history=app.get("biometrics_history", []),
                    device_fingerprint_history=app.get("device_fingerprint_history", []),
                    documents=app.get("documents", []),
                    fraud_analysis=app.get("fraud_analysis"),
                    created_at=datetime.fromisoformat(app["created_at"]),
                    updated_at=datetime.fromisoformat(app["updated_at"])
                ))
            except Exception as item_err:
                print(f"[WARN] Skipping malformed application {app.get('loan_app_id', '?')}: {item_err}")
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing loan applications: {str(e)}")


@app.put("/api/loans/{loan_app_id}/status")
async def update_loan_status(
    loan_app_id: str,
    request: StatusUpdateRequest,
    db_service = Depends(get_db_service)
):
    """
    Update the status of a loan application
    
    - Valid statuses: draft, submitted, under_review, approved, rejected
    """
    try:
        updated_app = db_service.update_loan_application(loan_app_id, {"status": request.status.value})
        
        if not updated_app:
            raise HTTPException(status_code=404, detail=f"Loan application {loan_app_id} not found")
        
        return {
            "loan_app_id": loan_app_id,
            "status": request.status.value,
            "updated_at": updated_app["updated_at"],
            "message": f"Status updated to {request.status.value}"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating status: {str(e)}")


@app.post("/api/loans/{loan_app_id}/review")
async def review_loan_application(
    loan_app_id: str,
    request: ReviewRequest,
    db_service = Depends(get_db_service)
):
    """
    Manager approve or reject a loan application with mandatory comments.
    - decision: "approved" or "rejected"
    - comments: required review notes
    - reviewer_name: optional reviewer identifier
    """
    try:
        application = db_service.get_loan_application(loan_app_id)
        if not application:
            raise HTTPException(status_code=404, detail=f"Loan application {loan_app_id} not found")

        updates = {
            "status": request.decision.value,
            "manager_review": {
                "decision": request.decision.value,
                "comments": request.comments,
                "reviewer_name": request.reviewer_name or "Manager",
                "reviewed_at": datetime.utcnow().isoformat()
            }
        }
        updated_app = db_service.update_loan_application(loan_app_id, updates)

        return {
            "loan_app_id": loan_app_id,
            "status": request.decision.value,
            "manager_review": updates["manager_review"],
            "message": f"Application {request.decision.value} successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reviewing loan application: {str(e)}")


@app.post("/api/loans/{loan_app_id}/submit")
async def submit_loan_application(
    loan_app_id: str,
    background_tasks: BackgroundTasks,
    db_service = Depends(get_db_service),
    storage_service = Depends(get_storage_service)
):
    """
    Submit a loan application for comprehensive fraud analysis
    
    This endpoint:
    1. Validates the application exists and has required documents
    2. Changes application status to "submitted"
    3. Returns immediate success response to user
    4. Runs fraud analysis in background (non-blocking):
       - Collects all data from database
       - Retrieves all document contents from blob storage
       - Structures data for each agent (Behavioral, Device, Fraud Ring, KYC)
       - Calls run_loan_fraud_detection with concurrent workflow
       - Stores individual agent results in database
    
    The analysis results are stored in the database and visible only to managers
    for review and approval decisions. User receives simple confirmation message.
    
    Returns:
        Simple success message (analysis runs in background)
    """
    try:
        # Verify loan application exists
        application = db_service.get_loan_application(loan_app_id)
        if not application:
            raise HTTPException(status_code=404, detail=f"Loan application {loan_app_id} not found")
        
        # Validate that documents are uploaded
        documents = application.get("documents", [])
        if not documents or len(documents) == 0:
            raise HTTPException(
                status_code=400, 
                detail="Cannot submit application without documents. Please upload at least one document."
            )
        
        # Update status to "submitted" immediately
        db_service.update_loan_application(loan_app_id, {"status": "submitted"})
        
        # Add fraud analysis task to background tasks (non-blocking)
        background_tasks.add_task(
            run_fraud_analysis_background,
            loan_app_id,
            db_service,
            storage_service
        )
        
        # Return immediate success response to user
        return {
            "loan_app_id": loan_app_id,
            "status": "submitted",
            "message": "Application submitted successfully! Your application is now under review.",
            "note": "You will be notified once the review is complete."
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error submitting loan application: {str(e)}")


@app.delete("/api/loans/{loan_app_id}")
async def delete_loan_application(
    loan_app_id: str,
    db_service = Depends(get_db_service),
    storage_service = Depends(get_storage_service)
):
    """
    Delete a loan application and all associated documents
    
    - Deletes application from Cosmos DB
    - Deletes all documents from Blob Storage
    """
    try:
        # Delete all documents from blob storage
        docs_deleted = storage_service.delete_all_documents(loan_app_id)
        
        # Delete application from Cosmos DB
        app_deleted = db_service.delete_loan_application(loan_app_id)
        
        if not app_deleted:
            raise HTTPException(status_code=404, detail=f"Loan application {loan_app_id} not found")
        
        return {
            "loan_app_id": loan_app_id,
            "documents_deleted": docs_deleted,
            "message": "Loan application and all documents deleted successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting loan application: {str(e)}")


# ============================================================================
# BIOMETRICS & DEVICE FINGERPRINT ENDPOINTS
# ============================================================================

@app.post("/api/loans/{loan_app_id}/biometrics")
async def add_biometrics_data(
    loan_app_id: str,
    request: BiometricsUpdateRequest,
    db_service = Depends(get_db_service)
):
    """
    Add biometrics and device fingerprint data to a loan application
    
    - Can be called multiple times during data entry and document upload
    - Event types: data_entry, document_upload, form_submit
    - Appends to biometrics history for behavioral analysis
    """
    try:
        # Verify loan application exists
        application = db_service.get_loan_application(loan_app_id)
        if not application:
            raise HTTPException(status_code=404, detail=f"Loan application {loan_app_id} not found")
        
        # Prepare biometrics data with event type
        biometrics_data = request.biometrics.model_dump(mode='json')
        biometrics_data["event_type"] = request.event_type
        biometrics_data["captured_at"] = datetime.utcnow().isoformat()
        
        device_fingerprint_data = request.device_fingerprint.model_dump(mode='json') if request.device_fingerprint else None
        if device_fingerprint_data:
            device_fingerprint_data["event_type"] = request.event_type
            device_fingerprint_data["captured_at"] = datetime.utcnow().isoformat()
        
        # Add to Cosmos DB
        updated_app = db_service.add_biometrics_data(
            loan_app_id=loan_app_id,
            biometrics=biometrics_data,
            device_fingerprint=device_fingerprint_data
        )
        
        return {
            "loan_app_id": loan_app_id,
            "event_type": request.event_type,
            "biometrics_count": len(updated_app.get("biometrics_history", [])),
            "device_fingerprint_count": len(updated_app.get("device_fingerprint_history", [])),
            "updated_at": updated_app["updated_at"],
            "message": "Biometrics data added successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding biometrics data: {str(e)}")


# ============================================================================
# DOCUMENT UPLOAD ENDPOINTS
# ============================================================================

@app.post("/api/loans/{loan_app_id}/documents/upload", response_model=DocumentUploadResponse)
async def upload_document(
    loan_app_id: str,
    file: UploadFile = File(...),
    document_type: str = Form(...),
    biometrics: Optional[str] = Form(None),
    device_fingerprint: Optional[str] = Form(None),
    db_service = Depends(get_db_service),
    storage_service = Depends(get_storage_service)
):
    """
    Upload a document for a loan application
    
    - Requires minimum loan application data in Cosmos DB first
    - Files saved in Blob Storage under loan_app_id folder
    - Captures biometrics and device fingerprint during upload
    - Document types: identity_proof, address_proof, income_proof, bank_statement, etc.
    """
    try:
        # Verify loan application exists
        application = db_service.get_loan_application(loan_app_id)
        if not application:
            raise HTTPException(status_code=404, detail=f"Loan application {loan_app_id} not found")
        
        # Read file data
        file_data = await file.read()
        file_size = len(file_data)
        
        # Upload to blob storage
        upload_result = storage_service.upload_document(
            loan_app_id=loan_app_id,
            file_name=file.filename,
            file_data=file_data,
            content_type=file.content_type or "application/octet-stream"
        )
        
        # Prepare document metadata for Cosmos DB
        document_metadata = {
            "document_id": upload_result["document_id"],
            "file_name": upload_result["file_name"],
            "file_size": upload_result["file_size"],
            "content_type": upload_result["content_type"],
            "document_type": document_type,
            "blob_url": upload_result["blob_url"],
            "blob_name": upload_result["blob_name"],
            "uploaded_at": upload_result["uploaded_at"]
        }
        
        # Add document metadata to Cosmos DB
        db_service.add_document_metadata(loan_app_id, document_metadata)
        
        # If biometrics data provided, add it
        if biometrics or device_fingerprint:
            import json
            biometrics_dict = json.loads(biometrics) if biometrics else {}
            device_fp_dict = json.loads(device_fingerprint) if device_fingerprint else None
            
            if biometrics_dict:
                biometrics_dict["event_type"] = "document_upload"
                biometrics_dict["captured_at"] = datetime.utcnow().isoformat()
                
            if device_fp_dict:
                device_fp_dict["event_type"] = "document_upload"
                device_fp_dict["captured_at"] = datetime.utcnow().isoformat()
            
            db_service.add_biometrics_data(
                loan_app_id=loan_app_id,
                biometrics=biometrics_dict if biometrics_dict else {},
                device_fingerprint=device_fp_dict
            )
        
        return DocumentUploadResponse(
            loan_app_id=loan_app_id,
            document_id=upload_result["document_id"],
            file_name=upload_result["file_name"],
            file_size=file_size,
            content_type=upload_result["content_type"],
            blob_url=upload_result["blob_url"],
            uploaded_at=datetime.fromisoformat(upload_result["uploaded_at"]),
            message="Document uploaded successfully"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading document: {str(e)}")


@app.get("/api/loans/{loan_app_id}/documents")
async def list_documents(
    loan_app_id: str,
    db_service = Depends(get_db_service),
    storage_service = Depends(get_storage_service)
):
    """
    List all documents for a loan application
    
    - Returns document metadata from Cosmos DB
    - Includes document IDs, file names, sizes, upload timestamps
    """
    try:
        # Verify loan application exists
        application = db_service.get_loan_application(loan_app_id)
        if not application:
            raise HTTPException(status_code=404, detail=f"Loan application {loan_app_id} not found")
        
        # Get documents from application
        documents = application.get("documents", [])
        
        return {
            "loan_app_id": loan_app_id,
            "total_documents": len(documents),
            "documents": documents
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing documents: {str(e)}")


@app.get("/api/loans/{loan_app_id}/documents/by-type/{document_type}")
async def get_documents_by_type(
    loan_app_id: str,
    document_type: str,
    db_service = Depends(get_db_service),
    storage_service = Depends(get_storage_service)
):
    """
    Get all documents of a specific type for a loan application
    
    - Document types: identity_proof, address_proof, income_proof, bank_statement
    - Returns list of documents with download URLs
    - URLs are secured with SAS tokens (valid for 24 hours)
    """
    try:
        # Verify loan application exists
        application = db_service.get_loan_application(loan_app_id)
        if not application:
            raise HTTPException(status_code=404, detail=f"Loan application {loan_app_id} not found")
        
        # Get documents of specified type
        all_documents = application.get("documents", [])
        filtered_documents = [
            doc for doc in all_documents 
            if doc.get("document_type") == document_type
        ]
        
        if not filtered_documents:
            return {
                "loan_app_id": loan_app_id,
                "document_type": document_type,
                "total_documents": 0,
                "documents": [],
                "message": f"No documents found of type '{document_type}'"
            }
        
        # Generate download URLs with SAS tokens for each document
        documents_with_urls = []
        for doc in filtered_documents:
            document_id = doc.get("document_id")
            sas_url = storage_service.get_document_url_with_sas(
                loan_app_id, 
                document_id, 
                expiry_hours=24
            )
            
            documents_with_urls.append({
                **doc,
                "download_url": sas_url,
                "url_expires_in_hours": 24
            })
        
        return {
            "loan_app_id": loan_app_id,
            "document_type": document_type,
            "total_documents": len(documents_with_urls),
            "documents": documents_with_urls,
            "message": f"Found {len(documents_with_urls)} document(s) of type '{document_type}'"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving documents by type: {str(e)}")


@app.get("/api/loans/{loan_app_id}/documents/{document_id}")
async def get_document(
    loan_app_id: str,
    document_id: str,
    storage_service = Depends(get_storage_service)
):
    """
    Get a document download URL with SAS token
    
    - Returns secure SAS URL valid for 24 hours
    - Use this URL to download the document
    """
    try:
        sas_url = storage_service.get_document_url_with_sas(loan_app_id, document_id, expiry_hours=24)
        
        if not sas_url:
            raise HTTPException(status_code=404, detail=f"Document {document_id} not found")
        
        return {
            "loan_app_id": loan_app_id,
            "document_id": document_id,
            "download_url": sas_url,
            "expires_in_hours": 24,
            "message": "Use the download_url to retrieve the document"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving document: {str(e)}")


@app.get("/api/loans/{loan_app_id}/documents/{document_id}/download")
async def download_document(
    loan_app_id: str,
    document_id: str,
    db_service = Depends(get_db_service),
    storage_service = Depends(get_storage_service)
):
    """
    Download a document directly (returns file bytes)
    
    - Returns the actual file content
    - Use this for extracting document content or processing
    - For address proof extraction, you can download all address_proof documents
    """
    try:
        # Get document metadata from Cosmos DB
        application = db_service.get_loan_application(loan_app_id)
        if not application:
            raise HTTPException(status_code=404, detail=f"Loan application {loan_app_id} not found")
        
        # Find document in metadata
        documents = application.get("documents", [])
        doc_metadata = next(
            (doc for doc in documents if doc.get("document_id") == document_id), 
            None
        )
        
        if not doc_metadata:
            raise HTTPException(status_code=404, detail=f"Document {document_id} not found in application")
        
        # Get document content from blob storage
        file_data = storage_service.get_document(loan_app_id, document_id)
        
        if not file_data:
            raise HTTPException(status_code=404, detail=f"Document {document_id} not found in storage")
        
        # Return file as streaming response
        return StreamingResponse(
            BytesIO(file_data),
            media_type=doc_metadata.get("content_type", "application/octet-stream"),
            headers={
                "Content-Disposition": f"attachment; filename={doc_metadata.get('file_name', 'document')}",
                "Content-Length": str(len(file_data))
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error downloading document: {str(e)}")


@app.delete("/api/loans/{loan_app_id}/documents/{document_id}")
async def delete_document(
    loan_app_id: str,
    document_id: str,
    db_service = Depends(get_db_service),
    storage_service = Depends(get_storage_service)
):
    """
    Delete a specific document
    
    - Removes document from Blob Storage
    - Updates metadata in Cosmos DB
    """
    try:
        # Delete from blob storage
        deleted = storage_service.delete_document(loan_app_id, document_id)
        
        if not deleted:
            raise HTTPException(status_code=404, detail=f"Document {document_id} not found")
        
        # Update Cosmos DB to remove document metadata
        application = db_service.get_loan_application(loan_app_id)
        if application:
            documents = application.get("documents", [])
            updated_documents = [doc for doc in documents if doc.get("document_id") != document_id]
            db_service.update_loan_application(loan_app_id, {"documents": updated_documents})
        
        return {
            "loan_app_id": loan_app_id,
            "document_id": document_id,
            "message": "Document deleted successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting document: {str(e)}")


# ============================================================================
# FRAUD ANALYSIS ENDPOINTS
# ============================================================================

@app.post("/api/loans/{loan_app_id}/analyze", response_model=FraudAnalysisResponse)
async def run_fraud_analysis(
    loan_app_id: str,
    background_tasks: BackgroundTasks,
    db_service = Depends(get_db_service)
):
    """
    Run fraud analysis on a loan application using AI agents
    
    - Executes all 4 agents concurrently:
      * Behavioral Agent - analyzes biometrics
      * Device Fingerprint Agent - analyzes device data
      * Fraud Ring Agent - detects organized fraud
      * KYC Agent - verifies documents
    
    - Returns overall risk score (0-100)
    - Risk levels: LOW (0-33), MEDIUM (34-66), HIGH (67-100)
    - Stores analysis results in Cosmos DB
    """
    try:
        # Verify loan application exists
        application = db_service.get_loan_application(loan_app_id)
        if not application:
            raise HTTPException(status_code=404, detail=f"Loan application {loan_app_id} not found")
        
        # Prepare analysis input
        analysis_input = {
            "loan_app_id": loan_app_id,
            "applicant_info": application.get("applicant_info", {}),
            "loan_details": application.get("loan_details", {}),
            "biometrics_history": application.get("biometrics_history", []),
            "device_fingerprint_history": application.get("device_fingerprint_history", []),
            "documents": application.get("documents", [])
        }
        
        # Start timing
        start_time = time.time()
        
        # Run fraud detection using global orchestrator
        try:
            if not global_orchestrator:
                raise RuntimeError("Agent orchestrator not initialized")

            analysis_prompt = f"""You are a specialized fraud detection agent. A loan application has been submitted and requires your expert analysis.

Apply your specific area of expertise to the data provided below and produce a risk assessment for this application.

=== APPLICATION REFERENCE ===
Loan Application ID : {loan_app_id}

=== APPLICANT INFORMATION ===
{json.dumps(analysis_input.get('applicant_info', {}), indent=2, default=str)}

=== LOAN DETAILS ===
{json.dumps(analysis_input.get('loan_details', {}), indent=2, default=str)}

=== BEHAVIOURAL / BIOMETRIC DATA ===
(Keystroke dynamics, mouse movements, form interaction timings)
{json.dumps(analysis_input.get('biometrics_history', []), indent=2, default=str)}

=== DEVICE FINGERPRINT DATA ===
(IP address, geolocation, browser/OS, VPN/proxy indicators, session history)
{json.dumps(analysis_input.get('device_fingerprint_history', []), indent=2, default=str)}

=== KYC DOCUMENTS ===
(Identity documents, proof of address, income verification)
{json.dumps(analysis_input.get('documents', []), indent=2, default=str)}

=== INSTRUCTIONS ===
1. Focus exclusively on your designated area of expertise (defined in your system instructions).
2. Analyse only the data sections that are relevant to your specialization.
3. Base your risk score solely on evidence present in the data — do NOT assume risk without evidence.
4. If a data section is empty or unavailable, note it and reduce your confidence score accordingly.
5. You MUST respond using EXACTLY the plain-text format specified in your system instructions.
   Do NOT use JSON, markdown code blocks, or any other format.
   Required fields: RISK_SCORE, CONFIDENCE, RECOMMENDATION, your findings list, and ANALYSIS.
"""
            analysis_results = await global_orchestrator.run_workflow(analysis_prompt)
        except Exception as agent_error:
            raise HTTPException(
                status_code=500, 
                detail=f"Fraud analysis failed: {str(agent_error)}"
            )
        
        # Calculate processing time
        processing_time = time.time() - start_time
        
        # Determine risk level
        risk_score = analysis_results.get("overall_risk_score", 50.0)
        if risk_score <= 33:
            risk_level = "LOW"
        elif risk_score <= 66:
            risk_level = "MEDIUM"
        else:
            risk_level = "HIGH"
        
        # Prepare fraud analysis result
        fraud_analysis = {
            "overall_risk_score": risk_score,
            "risk_level": risk_level,
            "agent_results": analysis_results.get("agent_results", {}),
            "recommendations": analysis_results.get("recommendations", []),
            "analyzed_at": datetime.utcnow().isoformat(),
            "processing_time_seconds": processing_time
        }
        
        # Update Cosmos DB with analysis results
        db_service.update_fraud_analysis(loan_app_id, fraud_analysis)
        
        return FraudAnalysisResponse(
            loan_app_id=loan_app_id,
            overall_risk_score=risk_score,
            risk_level=risk_level,
            agent_results=fraud_analysis["agent_results"],
            recommendations=fraud_analysis["recommendations"],
            analyzed_at=datetime.utcnow(),
            processing_time_seconds=processing_time
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error running fraud analysis: {str(e)}")


@app.get("/api/loans/{loan_app_id}/analysis")
async def get_fraud_analysis(
    loan_app_id: str,
    db_service = Depends(get_db_service)
):
    """
    Retrieve fraud analysis results for a loan application
    
    - Returns previously run analysis results
    - Returns null if analysis not yet performed
    """
    try:
        application = db_service.get_loan_application(loan_app_id)
        
        if not application:
            raise HTTPException(status_code=404, detail=f"Loan application {loan_app_id} not found")
        
        fraud_analysis = application.get("fraud_analysis")
        
        if not fraud_analysis:
            return {
                "loan_app_id": loan_app_id,
                "fraud_analysis": None,
                "message": "No fraud analysis has been performed yet"
            }
        
        return {
            "loan_app_id": loan_app_id,
            "fraud_analysis": fraud_analysis
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving fraud analysis: {str(e)}")


# ============================================================================
# DASHBOARD & STATISTICS ENDPOINTS
# ============================================================================

@app.get("/api/dashboard/statistics")
async def get_dashboard_statistics(
    db_service = Depends(get_db_service)
):
    """
    Get dashboard statistics
    
    - Total applications
    - Applications by status
    - High-risk applications
    - Recent applications
    """
    try:
        # Get all applications
        all_applications = db_service.list_loan_applications(limit=1000)
        
        # Calculate statistics
        total_applications = len(all_applications)
        
        status_counts = {
            "draft": 0,
            "submitted": 0,
            "under_review": 0,
            "approved": 0,
            "rejected": 0
        }
        
        high_risk_count = 0
        
        for app in all_applications:
            status = app.get("status", "draft")
            status_counts[status] = status_counts.get(status, 0) + 1
            
            fraud_analysis = app.get("fraud_analysis")
            if fraud_analysis and fraud_analysis.get("risk_level") == "HIGH":
                high_risk_count += 1
        
        # Get recent applications (last 10)
        recent_applications = all_applications[:10]
        
        return {
            "total_applications": total_applications,
            "status_breakdown": status_counts,
            "high_risk_applications": high_risk_count,
            "recent_applications": [
                {
                    "loan_app_id": app["loan_app_id"],
                    "applicant_name": f"{app['applicant_info']['first_name']} {app['applicant_info']['last_name']}",
                    "loan_amount": app["loan_details"]["loan_amount"],
                    "status": app["status"],
                    "risk_level": app.get("fraud_analysis", {}).get("risk_level") if app.get("fraud_analysis") else None,
                    "created_at": app["created_at"]
                }
                for app in recent_applications
            ]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving dashboard statistics: {str(e)}")


# ============================================================================
# RUN APPLICATION
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    # Get port from environment or use default
    port = int(os.getenv("PORT", 8000))
    
    print(f"Starting Loan Fraud Detection API on port {port}")
    print("API Documentation available at: http://localhost:{port}/docs")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )
