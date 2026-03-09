"""
FastAPI application for Loan Fraud Detection System
Main API endpoints for loan application management and fraud analysis
"""
import os
import time
from typing import List, Optional
from datetime import datetime
from io import BytesIO
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
    BiometricsData,
    DeviceFingerprintData
)

# Import services
from app.services.cosmos_service import get_cosmos_service
from app.services.blob_service import get_blob_service

# Import agent orchestrator
from app.agents.agent_orchestrator import run_loan_fraud_detection

load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="Loan Fraud Detection API",
    description="AI-Powered Multi-Agent Fraud Analysis System using Microsoft Agent Framework",
    version="1.0.0"
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
        
        # Parse the response
        return LoanApplicationDetail(
            loan_app_id=application["loan_app_id"],
            status=ApplicationStatus(application["status"]),
            applicant_info=application["applicant_info"],
            loan_details=application["loan_details"],
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
        
        result = []
        for app in applications:
            result.append(LoanApplicationDetail(
                loan_app_id=app["loan_app_id"],
                status=ApplicationStatus(app["status"]),
                applicant_info=app["applicant_info"],
                loan_details=app["loan_details"],
                biometrics_history=app.get("biometrics_history", []),
                device_fingerprint_history=app.get("device_fingerprint_history", []),
                documents=app.get("documents", []),
                fraud_analysis=app.get("fraud_analysis"),
                created_at=datetime.fromisoformat(app["created_at"]),
                updated_at=datetime.fromisoformat(app["updated_at"])
            ))
        
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
        
        # Run fraud detection using agent orchestrator
        try:
            analysis_results = await run_loan_fraud_detection(analysis_input)
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
