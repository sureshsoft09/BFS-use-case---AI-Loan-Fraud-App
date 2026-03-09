# Document Extraction by Type Feature

## Overview
The Document Extraction feature allows you to retrieve and download all documents of a specific type for a loan application. This is useful for processing, auditing, or analyzing documents in bulk by category.

## Features

### Backend API Endpoints

#### 1. Extract Documents by Type
```
GET /api/loans/{loan_app_id}/documents/by-type/{document_type}
```

**Description**: Retrieves all documents of a specific type for a loan application with secure download URLs.

**Parameters**:
- `loan_app_id` (path): The loan application ID (e.g., "LN-App-001")
- `document_type` (path): The type of document to extract
  - `identity_proof` - Passport, Driver's License, etc.
  - `address_proof` - Utility Bills, Lease Agreements, etc.
  - `income_proof` - Pay Stubs, Tax Returns, etc.
  - `bank_statement` - Bank statements (last 3-6 months)

**Response**:
```json
{
  "loan_app_id": "LN-App-001",
  "document_type": "address_proof",
  "total_documents": 2,
  "documents": [
    {
      "document_id": "uuid-1234",
      "file_name": "utility_bill.pdf",
      "file_size": 245678,
      "content_type": "application/pdf",
      "uploaded_at": "2024-01-15T10:30:00",
      "blob_url": "https://storage.blob.core.windows.net/...",
      "download_url": "https://storage.blob.core.windows.net/...?sas_token",
      "url_expires_in_hours": 24
    }
  ]
}
```

**Features**:
- ✅ Filters documents by type using metadata stored in Cosmos DB
- ✅ Generates secure SAS (Shared Access Signature) download URLs for each document
- ✅ URLs expire after 24 hours for enhanced security
- ✅ Returns full metadata including file size, content type, and upload timestamp
- ✅ Handles empty results gracefully with informative messages

#### 2. Download Document Content
```
GET /api/loans/{loan_app_id}/documents/{document_id}/download
```

**Description**: Downloads the actual document content (file bytes) directly.

**Parameters**:
- `loan_app_id` (path): The loan application ID
- `document_id` (path): The unique document identifier

**Response**: 
- Binary file data with appropriate Content-Type and Content-Disposition headers
- Attachment filename is automatically set from document metadata

**Features**:
- ✅ Direct file download without SAS token
- ✅ Proper MIME type handling
- ✅ Original filename preservation
- ✅ Suitable for programmatic document processing

### Frontend UI

#### Location
The document extraction interface appears in the **Loan Dashboard** page after documents have been uploaded.

#### How to Use

1. **Create Loan Application**
   - Fill out the loan application form
   - Click "Create Application"
   - Note your Application ID (e.g., LN-App-001)

2. **Upload Documents**
   - Upload documents for each category:
     - Identity Proof (Passport, Driver's License)
     - Address Proof (Utility Bill, Lease Agreement)
     - Income Proof (Pay Stubs, Tax Returns)
     - Bank Statement (Last 3-6 months)

3. **Extract Documents by Type**
   - Scroll to the "Extract Documents by Type" section
   - Select a document type from the dropdown
   - Click "Extract Documents"
   - View all documents of that type

4. **Download Individual Documents**
   - Click the "⬇ Download" button next to any document
   - The file will download directly to your computer
   - Note: Download URLs are valid for 24 hours

#### UI Features
- 🎨 **Visual Feedback**: Color-coded sections with icons
- 📊 **Document Count**: Shows total number of extracted documents
- 📝 **Metadata Display**: Shows file size and upload timestamp
- ⚡ **Instant Download**: One-click download for each document
- ⏰ **URL Expiry Notice**: Reminder that download URLs expire after 24 hours
- 🔒 **Secure Access**: SAS tokens ensure authorized access only

## Technical Architecture

### Backend Implementation

**File**: `main.py`

**Key Components**:
1. **Document Metadata Storage**: Cosmos DB stores document metadata with `document_type` field
2. **Blob Storage**: Azure Blob Storage stores actual document files
3. **SAS Token Generation**: Temporary secure access URLs with 24-hour expiry
4. **Error Handling**: Comprehensive error messages for missing applications/documents

**Code Snippet**:
```python
@app.get("/api/loans/{loan_app_id}/documents/by-type/{document_type}")
async def get_documents_by_type(...):
    # Get application from Cosmos DB
    application = db_service.get_loan_application(loan_app_id)
    
    # Filter documents by type
    documents = application.get("documents", [])
    filtered_docs = [doc for doc in documents 
                     if doc.get("document_type") == document_type]
    
    # Generate SAS URL for each document
    for doc in filtered_docs:
        doc["download_url"] = storage_service.get_document_url_with_sas(
            loan_app_id, doc["document_id"]
        )
    
    return JSONResponse(content={...})
```

### Frontend Implementation

**File**: `LoanDashboard.jsx`

**Key Functions**:

1. **handleExtractDocuments()**
   - Fetches documents by type from backend
   - Updates state with extracted documents
   - Shows success/error notifications

2. **handleDownloadDocument(documentId, fileName)**
   - Downloads document content directly
   - Creates a download link in the browser
   - Shows download progress notification

**Configuration**: `azure-config.js`
```javascript
ENDPOINTS: {
  GET_DOCUMENTS_BY_TYPE: '/api/loans/{id}/documents/by-type/{document_type}',
  DOWNLOAD_DOCUMENT: '/api/loans/{id}/documents/{document_id}/download',
}
```

**Styling**: `LoanDashboard.css`
- `.document-extraction-section` - Main container with dashed border
- `.extraction-controls` - Dropdown and button layout
- `.extracted-documents` - Results display area
- `.btn-download` - Green download button with hover effect

## Use Cases

### 1. Bulk Document Processing
Extract all documents of a specific type for batch OCR or validation:
```bash
# Extract all address proofs
GET /api/loans/LN-App-001/documents/by-type/address_proof

# Download each document for processing
for doc in response.documents:
    GET /api/loans/LN-App-001/documents/{doc.document_id}/download
```

### 2. Audit Trail
Retrieve all uploaded documents for compliance review:
```bash
# Get all identity documents
GET /api/loans/LN-App-001/documents/by-type/identity_proof

# Get all income documents
GET /api/loans/LN-App-001/documents/by-type/income_proof
```

### 3. Document Verification Workflow
Separate processing pipeline for different document types:
- Identity verification agent processes `identity_proof` documents
- Address verification agent processes `address_proof` documents
- Financial analysis agent processes `income_proof` and `bank_statement` documents

### 4. Mobile/Desktop App Integration
Download document URLs can be used in mobile apps or desktop applications:
```javascript
// React Native Example
const response = await fetch(apiUrl);
const data = await response.json();

data.documents.forEach(doc => {
  // Use doc.download_url to display or download
  FileViewer.open(doc.download_url);
});
```

## Security Considerations

### SAS Token Security
- **Time-Limited**: URLs expire after 24 hours
- **Read-Only**: SAS tokens only allow read operations
- **Scoped Access**: Each token is specific to one document
- **Automatic Rotation**: New token generated on each request

### Access Control
- Application ID must exist in Cosmos DB
- Document must belong to the specified application
- All access attempts are logged

### Best Practices
1. **Never expose SAS URLs** in client-side logs or public repositories
2. **Regenerate tokens** for long-running operations
3. **Use HTTPS** for all document transfers
4. **Validate document types** on both client and server

## Testing

### Manual Testing
1. Start backend server: `uvicorn main:app --reload --port 8000`
2. Start frontend: `npm run dev`
3. Navigate to Loan Dashboard
4. Create application and upload documents
5. Test extraction for each document type

### API Testing with curl
```bash
# Extract address proof documents
curl -X GET "http://localhost:8000/api/loans/LN-App-001/documents/by-type/address_proof"

# Download a specific document
curl -X GET "http://localhost:8000/api/loans/LN-App-001/documents/{document_id}/download" \
  --output document.pdf
```

### API Testing with Postman
1. **Collection**: Loan Fraud Detection API
2. **Endpoint**: GET `/api/loans/{loan_app_id}/documents/by-type/{document_type}`
3. **Variables**:
   - `loan_app_id`: LN-App-001
   - `document_type`: address_proof
4. **Expected Status**: 200 OK
5. **Response Schema**: Validate JSON structure

## Error Handling

### Common Errors

| Error Code | Message | Solution |
|------------|---------|----------|
| 404 | Loan application not found | Verify loan_app_id exists |
| 404 | No documents found | Upload documents first |
| 404 | Document not found in storage | Check Blob Storage connection |
| 500 | Failed to generate SAS URL | Verify Azure Storage credentials |
| 500 | Error retrieving document | Check Cosmos DB connection |

### Error Response Format
```json
{
  "detail": "Error message explaining the issue"
}
```

## Performance Considerations

### Optimization Strategies
1. **Parallel Downloads**: Download multiple documents concurrently
2. **Caching**: Cache document metadata to reduce Cosmos DB queries
3. **CDN Integration**: Use Azure CDN for faster global access
4. **Compression**: Compress large documents before storage
5. **Lazy Loading**: Load document previews on demand

### Scalability
- **Cosmos DB**: Auto-scales to handle high query volume
- **Blob Storage**: Supports millions of documents
- **SAS Token Generation**: Lightweight operation, no rate limits
- **Concurrent Requests**: FastAPI handles multiple extraction requests simultaneously

## Future Enhancements

### Planned Features
1. **Batch Download**: Download all documents of a type as ZIP file
2. **Document Preview**: Inline preview for PDF/image documents
3. **Search & Filter**: Search documents by filename or date range
4. **Document Tagging**: Add custom tags to documents for better organization
5. **Version Control**: Track document versions and changes
6. **OCR Integration**: Extract text from uploaded documents
7. **Document Validation**: Automatic validation of document authenticity
8. **Email Notifications**: Alert when new documents are uploaded

## Conclusion

The Document Extraction by Type feature provides a powerful way to manage and process loan application documents. With secure SAS token-based access, comprehensive error handling, and an intuitive UI, it streamlines document workflows for both users and automated systems.

For questions or issues, please refer to the main [README.md](README.md) or contact the development team.
