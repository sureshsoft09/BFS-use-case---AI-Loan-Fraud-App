"""
Azure Blob Storage service for loan fraud application
Handles document uploads and retrieval
"""
import os
import uuid
from typing import Optional, BinaryIO
from datetime import datetime, timedelta
from azure.storage.blob import BlobServiceClient, BlobSasPermissions, generate_blob_sas, ContentSettings
from dotenv import load_dotenv

load_dotenv()


class BlobStorageService:
    """Service class for Azure Blob Storage operations"""
    
    def __init__(self):
        self.connection_string = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
        self.account_name = os.getenv("AZURE_STORAGE_ACCOUNT_NAME")
        self.account_key = os.getenv("AZURE_STORAGE_ACCOUNT_KEY")
        self.container_name = os.getenv("AZURE_STORAGE_CONTAINER_NAME", "loan-documents")
        
        if not self.connection_string:
            raise ValueError("Missing Azure Storage connection string in environment variables")
        
        # Initialize Blob Service Client
        self.blob_service_client = BlobServiceClient.from_connection_string(self.connection_string)
        self.container_client = None
        
        # Initialize container
        self._initialize_container()
    
    def _initialize_container(self):
        """Initialize blob container, create if not exists"""
        try:
            self.container_client = self.blob_service_client.get_container_client(self.container_name)
            
            # Create container if it doesn't exist
            if not self.container_client.exists():
                self.container_client.create_container()
                print(f"Created blob container: {self.container_name}")
            else:
                print(f"Blob container '{self.container_name}' already exists")
        
        except Exception as e:
            print(f"Error initializing blob container: {str(e)}")
            raise
    
    def upload_document(self, loan_app_id: str, file_name: str, file_data: bytes, 
                       content_type: str = "application/octet-stream") -> dict:
        """
        Upload a document to blob storage under loan application folder
        
        Args:
            loan_app_id: Loan application ID (used as folder name)
            file_name: Original file name
            file_data: File binary data
            content_type: MIME type of the file
            
        Returns:
            Dictionary containing upload details
        """
        try:
            # Generate unique document ID
            document_id = str(uuid.uuid4())
            
            # Clean filename - remove special characters
            safe_filename = "".join(c for c in file_name if c.isalnum() or c in ".-_ ")
            
            # Create blob path: loan_app_id/document_id_filename
            blob_name = f"{loan_app_id}/{document_id}_{safe_filename}"
            
            # Get blob client
            blob_client = self.blob_service_client.get_blob_client(
                container=self.container_name,
                blob=blob_name
            )
            
            # Upload file with metadata
            metadata = {
                "loan_app_id": loan_app_id,
                "document_id": document_id,
                "original_filename": file_name,
                "uploaded_at": datetime.utcnow().isoformat(),
                "content_type": content_type
            }
            
            blob_client.upload_blob(
                file_data,
                overwrite=True,
                content_settings=ContentSettings(content_type=content_type),
                metadata=metadata
            )
            
            # Get blob URL
            blob_url = blob_client.url
            
            print(f"Uploaded document: {blob_name}")
            
            return {
                "document_id": document_id,
                "blob_name": blob_name,
                "blob_url": blob_url,
                "file_name": file_name,
                "file_size": len(file_data),
                "content_type": content_type,
                "uploaded_at": datetime.utcnow().isoformat()
            }
        
        except Exception as e:
            print(f"Error uploading document: {str(e)}")
            raise
    
    def get_document(self, loan_app_id: str, document_id: str) -> Optional[bytes]:
        """
        Retrieve a document from blob storage
        
        Args:
            loan_app_id: Loan application ID
            document_id: Document ID
            
        Returns:
            File binary data or None if not found
        """
        try:
            # List all blobs in the loan_app_id folder with matching document_id
            blobs = self.container_client.list_blobs(name_starts_with=f"{loan_app_id}/{document_id}")
            
            for blob in blobs:
                blob_client = self.blob_service_client.get_blob_client(
                    container=self.container_name,
                    blob=blob.name
                )
                
                # Download blob data
                download_stream = blob_client.download_blob()
                return download_stream.readall()
            
            print(f"Document not found: {loan_app_id}/{document_id}")
            return None
        
        except Exception as e:
            print(f"Error retrieving document: {str(e)}")
            raise
    
    def get_document_url_with_sas(self, loan_app_id: str, document_id: str, 
                                  expiry_hours: int = 24) -> Optional[str]:
        """
        Generate a SAS URL for secure document access
        
        Args:
            loan_app_id: Loan application ID
            document_id: Document ID
            expiry_hours: Number of hours until SAS token expires
            
        Returns:
            SAS URL or None if document not found
        """
        try:
            # List all blobs in the loan_app_id folder with matching document_id
            blobs = self.container_client.list_blobs(name_starts_with=f"{loan_app_id}/{document_id}")
            
            for blob in blobs:
                blob_client = self.blob_service_client.get_blob_client(
                    container=self.container_name,
                    blob=blob.name
                )
                
                # Generate SAS token
                sas_token = generate_blob_sas(
                    account_name=self.account_name,
                    container_name=self.container_name,
                    blob_name=blob.name,
                    account_key=self.account_key,
                    permission=BlobSasPermissions(read=True),
                    expiry=datetime.utcnow() + timedelta(hours=expiry_hours)
                )
                
                # Construct SAS URL
                sas_url = f"{blob_client.url}?{sas_token}"
                return sas_url
            
            print(f"Document not found for SAS URL: {loan_app_id}/{document_id}")
            return None
        
        except Exception as e:
            print(f"Error generating SAS URL: {str(e)}")
            raise
    
    def list_documents(self, loan_app_id: str) -> list:
        """
        List all documents for a loan application
        
        Args:
            loan_app_id: Loan application ID
            
        Returns:
            List of document metadata dictionaries
        """
        try:
            blobs = self.container_client.list_blobs(name_starts_with=f"{loan_app_id}/")
            
            documents = []
            for blob in blobs:
                blob_client = self.blob_service_client.get_blob_client(
                    container=self.container_name,
                    blob=blob.name
                )
                
                # Get blob properties and metadata
                properties = blob_client.get_blob_properties()
                
                documents.append({
                    "blob_name": blob.name,
                    "document_id": properties.metadata.get("document_id", ""),
                    "file_name": properties.metadata.get("original_filename", blob.name.split("/")[-1]),
                    "file_size": blob.size,
                    "content_type": properties.metadata.get("content_type", properties.content_settings.content_type),
                    "uploaded_at": properties.metadata.get("uploaded_at", properties.creation_time.isoformat()),
                    "blob_url": blob_client.url
                })
            
            return documents
        
        except Exception as e:
            print(f"Error listing documents: {str(e)}")
            raise
    
    def delete_document(self, loan_app_id: str, document_id: str) -> bool:
        """
        Delete a document from blob storage
        
        Args:
            loan_app_id: Loan application ID
            document_id: Document ID
            
        Returns:
            True if deleted successfully, False if not found
        """
        try:
            # List all blobs in the loan_app_id folder with matching document_id
            blobs = self.container_client.list_blobs(name_starts_with=f"{loan_app_id}/{document_id}")
            
            deleted = False
            for blob in blobs:
                blob_client = self.blob_service_client.get_blob_client(
                    container=self.container_name,
                    blob=blob.name
                )
                blob_client.delete_blob()
                print(f"Deleted document: {blob.name}")
                deleted = True
            
            return deleted
        
        except Exception as e:
            print(f"Error deleting document: {str(e)}")
            raise
    
    def delete_all_documents(self, loan_app_id: str) -> int:
        """
        Delete all documents for a loan application
        
        Args:
            loan_app_id: Loan application ID
            
        Returns:
            Number of documents deleted
        """
        try:
            blobs = self.container_client.list_blobs(name_starts_with=f"{loan_app_id}/")
            
            count = 0
            for blob in blobs:
                blob_client = self.blob_service_client.get_blob_client(
                    container=self.container_name,
                    blob=blob.name
                )
                blob_client.delete_blob()
                count += 1
            
            print(f"Deleted {count} documents for loan application: {loan_app_id}")
            return count
        
        except Exception as e:
            print(f"Error deleting all documents: {str(e)}")
            raise


# Singleton instance
_blob_service = None

def get_blob_service() -> BlobStorageService:
    """Get singleton instance of BlobStorageService"""
    global _blob_service
    if _blob_service is None:
        _blob_service = BlobStorageService()
    return _blob_service
