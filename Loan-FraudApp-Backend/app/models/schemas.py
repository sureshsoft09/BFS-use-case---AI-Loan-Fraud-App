"""
Pydantic models for loan fraud application API
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class ApplicationStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class StatusUpdateRequest(BaseModel):
    """Request model for updating application status"""
    status: ApplicationStatus


class BiometricsData(BaseModel):
    """Biometric data captured during form interaction"""
    keystroke_dynamics: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Keystroke patterns")
    mouse_movements: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Mouse movement patterns")
    form_interaction_time: Optional[float] = Field(None, description="Time spent on form in seconds")
    typing_speed: Optional[float] = Field(None, description="Average typing speed in WPM")
    pause_patterns: Optional[List[float]] = Field(default_factory=list, description="Pause durations between fields")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class DeviceFingerprintData(BaseModel):
    """Device fingerprint data"""
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    screen_resolution: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    platform: Optional[str] = None
    browser: Optional[str] = None
    device_type: Optional[str] = None
    geolocation: Optional[Dict[str, float]] = Field(default_factory=dict, description="latitude, longitude")
    canvas_fingerprint: Optional[str] = None
    webgl_fingerprint: Optional[str] = None
    fonts_available: Optional[List[str]] = Field(default_factory=list)
    plugins: Optional[List[str]] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class LoanApplicantInfo(BaseModel):
    """Loan applicant personal information"""
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone: str = Field(..., min_length=10, max_length=20)
    date_of_birth: str = Field(..., description="Format: YYYY-MM-DD")
    ssn: Optional[str] = Field(None, description="Social Security Number (encrypted)")
    address_line1: str = Field(..., min_length=1)
    address_line2: Optional[str] = None
    city: str
    state: str
    zip_code: str
    country: str = "USA"


class LoanDetails(BaseModel):
    """Loan request details"""
    loan_amount: float = Field(..., gt=0, description="Requested loan amount")
    loan_purpose: str = Field(..., description="Purpose of the loan")
    loan_term_months: int = Field(..., gt=0, le=360, description="Loan term in months")
    employment_status: str
    annual_income: float = Field(..., gt=0)
    employer_name: Optional[str] = None
    years_employed: Optional[float] = Field(None, ge=0)


class CreateLoanApplicationRequest(BaseModel):
    """Request model for creating a new loan application"""
    applicant_info: LoanApplicantInfo
    loan_details: LoanDetails
    biometrics: Optional[BiometricsData] = None
    device_fingerprint: Optional[DeviceFingerprintData] = None


class LoanApplicationResponse(BaseModel):
    """Response model for loan application"""
    loan_app_id: str
    status: ApplicationStatus
    created_at: datetime
    updated_at: datetime
    applicant_info: LoanApplicantInfo
    loan_details: LoanDetails
    documents_uploaded: int = 0
    fraud_score: Optional[float] = None
    message: str


class DocumentUploadResponse(BaseModel):
    """Response model for document upload"""
    loan_app_id: str
    document_id: str
    file_name: str
    file_size: int
    content_type: str
    blob_url: str
    uploaded_at: datetime
    message: str


class BiometricsUpdateRequest(BaseModel):
    """Request to update biometrics data"""
    loan_app_id: str
    biometrics: BiometricsData
    device_fingerprint: Optional[DeviceFingerprintData] = None
    event_type: str = Field(..., description="data_entry, document_upload, form_submit")


class FraudAnalysisRequest(BaseModel):
    """Request to run fraud analysis"""
    loan_app_id: str


class FraudAnalysisResponse(BaseModel):
    """Response from fraud analysis"""
    loan_app_id: str
    overall_risk_score: float = Field(..., ge=0, le=100)
    risk_level: str  # LOW, MEDIUM, HIGH
    agent_results: Dict[str, Any]
    recommendations: List[str]
    analyzed_at: datetime
    processing_time_seconds: float


class LoanApplicationDetail(BaseModel):
    """Detailed loan application with all data"""
    loan_app_id: str
    status: ApplicationStatus
    applicant_info: LoanApplicantInfo
    loan_details: LoanDetails
    biometrics_history: List[BiometricsData] = []
    device_fingerprint_history: List[DeviceFingerprintData] = []
    documents: List[Dict[str, Any]] = []
    fraud_analysis: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
