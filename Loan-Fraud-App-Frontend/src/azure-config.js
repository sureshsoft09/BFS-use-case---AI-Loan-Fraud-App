/**
 * Azure Backend Configuration
 * 
 * This file contains configuration for connecting the frontend to Azure backend services.
 * Update these endpoints based on your Azure deployment.
 */

// Backend API Base URL - Update this with your Azure Function App or API endpoint
export const AZURE_CONFIG = {
  // API Endpoints
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  
  // Azure API endpoints
  ENDPOINTS: {
    // Loan Application endpoints
    CREATE_LOAN: '/api/loans/create',
    UPDATE_LOAN_STATUS: '/api/loans/{id}/status',
    GET_LOAN: '/api/loans/{id}',
    SUBMIT_LOAN: '/api/loans/{id}/submit',
    GET_APPLICATIONS: '/api/loan/applications',
    GET_APPLICATION_DETAILS: '/api/loan/application',
    
    // Document upload endpoints
    UPLOAD_DOCUMENT: '/api/loans/{id}/documents/upload',
    GET_DOCUMENT: '/api/documents',
    GET_DOCUMENTS_BY_TYPE: '/api/loans/{id}/documents/by-type/{document_type}',
    DOWNLOAD_DOCUMENT: '/api/loans/{id}/documents/{document_id}/download',
    
    // Biometrics endpoints
    ADD_BIOMETRICS: '/api/loans/{id}/biometrics',
    
    // Fraud Detection Agent endpoints
    ANALYZE_FRAUD: '/api/loans/{id}/analyze',
    GET_FRAUD_REPORT: '/api/fraud/report',
    
    // Dashboard endpoints  
    GET_DASHBOARD_DATA: '/api/dashboard',
    GET_GRAPH_DATA: '/api/dashboard/graph',
    GET_DASHBOARD_STATISTICS: '/api/dashboard/statistics',
    
    // Consolidated report
    CONSOLIDATED_REPORT: '/api/fraud/consolidated-report',
  },
  
  // Azure Blob Storage (if using SAS tokens for direct upload)
  BLOB_STORAGE: {
    CONTAINER_NAME: 'loan-documents',
    // SAS tokens should be generated server-side and provided via API
  },
  
  // Feature flags
  FEATURES: {
    ENABLE_DEX_AGENT: true,
    ENABLE_REAL_TIME_ANALYSIS: true,
  }
};

// Helper function to build full URL
export const getApiUrl = (endpoint) => {
  return `${AZURE_CONFIG.API_BASE_URL}${endpoint}`;
};

// Helper function for API calls
export const apiCall = async (endpoint, options = {}) => {
  const url = getApiUrl(endpoint);
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };
  
  const response = await fetch(url, { ...defaultOptions, ...options });
  
  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }
  
  return response.json();
};

export default AZURE_CONFIG;
