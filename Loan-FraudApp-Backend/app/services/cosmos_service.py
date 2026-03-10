"""
Azure Cosmos DB service for loan fraud application
Handles all database operations for loan applications
"""
import os
from typing import Optional, List, Dict, Any
from datetime import datetime
from azure.cosmos import CosmosClient, PartitionKey, exceptions
from dotenv import load_dotenv

load_dotenv()


class CosmosDBService:
    """Service class for Azure Cosmos DB operations"""
    
    def __init__(self):
        self.endpoint = os.getenv("COSMOS_DB_URL")
        self.key = os.getenv("COSMOS_DB_KEY")
        self.database_name = os.getenv("COSMOS_DB_NAME")
        self.container_name = os.getenv("COSMOS_PROJECTS_CONTAINER")
        
        if not all([self.endpoint, self.key, self.database_name, self.container_name]):
            raise ValueError("Missing Cosmos DB configuration in environment variables")
        
        # Initialize Cosmos client
        self.client = CosmosClient(self.endpoint, self.key)
        self.database = None
        self.container = None
        
        # Initialize database and container
        self._initialize_database()
    
    def _initialize_database(self):
        """Initialize database and container, create if not exists"""
        try:
            # Create database if not exists
            self.database = self.client.create_database_if_not_exists(id=self.database_name)
            print(f"Database '{self.database_name}' initialized")
            
            # Create container if not exists with partition key
            self.container = self.database.create_container_if_not_exists(
                id=self.container_name,
                partition_key=PartitionKey(path="/loan_app_id"),
                offer_throughput=400
            )
            print(f"Container '{self.container_name}' initialized")
            
        except exceptions.CosmosHttpResponseError as e:
            print(f"Error initializing Cosmos DB: {e.message}")
            raise
    
    def generate_loan_app_id(self) -> str:
        """Generate unique loan application ID in format LN-App-001"""
        try:
            # Query to get the highest loan_app_id
            query = "SELECT VALUE c.loan_app_id FROM c WHERE STARTSWITH(c.loan_app_id, 'LN-App-') ORDER BY c.loan_app_id DESC OFFSET 0 LIMIT 1"
            items = list(self.container.query_items(
                query=query,
                enable_cross_partition_query=True
            ))
            
            if items:
                # Extract number from last ID (e.g., "LN-App-042" -> 42)
                last_id = items[0]
                last_num = int(last_id.split('-')[-1])
                new_num = last_num + 1
            else:
                new_num = 1
            
            # Format as LN-App-001, LN-App-002, etc.
            return f"LN-App-{new_num:03d}"
        
        except Exception as e:
            print(f"Error generating loan app ID: {str(e)}")
            # Fallback to timestamp-based ID
            timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
            return f"LN-App-{timestamp}"
    
    def create_loan_application(self, application_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a new loan application in Cosmos DB
        
        Args:
            application_data: Dictionary containing loan application data
            
        Returns:
            Created loan application document
        """
        try:
            # Generate unique loan_app_id
            loan_app_id = self.generate_loan_app_id()
            
            # Prepare document
            document = {
                "id": loan_app_id,  # Cosmos DB document ID
                "loan_app_id": loan_app_id,  # Partition key
                "status": "draft",
                "applicant_info": application_data.get("applicant_info", {}),
                "loan_details": application_data.get("loan_details", {}),
                "biometrics_history": [application_data.get("biometrics")] if application_data.get("biometrics") else [],
                "device_fingerprint_history": [application_data.get("device_fingerprint")] if application_data.get("device_fingerprint") else [],
                "documents": [],
                "fraud_analysis": None,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                "document_type": "loan_application"  # For easier querying
            }
            
            # Create document in Cosmos DB
            created_doc = self.container.create_item(body=document)
            print(f"Created loan application: {loan_app_id}")
            
            return created_doc
        
        except exceptions.CosmosHttpResponseError as e:
            print(f"Error creating loan application: {e.message}")
            raise
    
    def get_loan_application(self, loan_app_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a loan application by ID
        
        Args:
            loan_app_id: Loan application ID
            
        Returns:
            Loan application document or None if not found
        """
        try:
            item = self.container.read_item(
                item=loan_app_id,
                partition_key=loan_app_id
            )
            return item
        
        except exceptions.CosmosResourceNotFoundError:
            print(f"Loan application not found: {loan_app_id}")
            return None
        
        except exceptions.CosmosHttpResponseError as e:
            print(f"Error retrieving loan application: {e.message}")
            raise
    
    def update_loan_application(self, loan_app_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update a loan application
        
        Args:
            loan_app_id: Loan application ID
            updates: Dictionary of fields to update
            
        Returns:
            Updated loan application document
        """
        try:
            # Get existing document
            existing_doc = self.get_loan_application(loan_app_id)
            if not existing_doc:
                raise ValueError(f"Loan application not found: {loan_app_id}")
            
            # Update fields
            for key, value in updates.items():
                existing_doc[key] = value
            
            # Update timestamp
            existing_doc["updated_at"] = datetime.utcnow().isoformat()
            
            # Replace document
            updated_doc = self.container.replace_item(
                item=loan_app_id,
                body=existing_doc
            )
            
            print(f"Updated loan application: {loan_app_id}")
            return updated_doc
        
        except exceptions.CosmosHttpResponseError as e:
            print(f"Error updating loan application: {e.message}")
            raise
    
    def add_biometrics_data(self, loan_app_id: str, biometrics: Dict[str, Any], 
                           device_fingerprint: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Add biometrics and device fingerprint data to a loan application
        
        Args:
            loan_app_id: Loan application ID
            biometrics: Biometrics data
            device_fingerprint: Device fingerprint data
            
        Returns:
            Updated loan application document
        """
        try:
            existing_doc = self.get_loan_application(loan_app_id)
            if not existing_doc:
                raise ValueError(f"Loan application not found: {loan_app_id}")
            
            # Append to biometrics history
            if "biometrics_history" not in existing_doc:
                existing_doc["biometrics_history"] = []
            existing_doc["biometrics_history"].append(biometrics)
            
            # Append to device fingerprint history
            if device_fingerprint:
                if "device_fingerprint_history" not in existing_doc:
                    existing_doc["device_fingerprint_history"] = []
                existing_doc["device_fingerprint_history"].append(device_fingerprint)
            
            # Update timestamp
            existing_doc["updated_at"] = datetime.utcnow().isoformat()
            
            # Replace document
            updated_doc = self.container.replace_item(
                item=loan_app_id,
                body=existing_doc
            )
            
            print(f"Added biometrics data to: {loan_app_id}")
            return updated_doc
        
        except exceptions.CosmosHttpResponseError as e:
            print(f"Error adding biometrics data: {e.message}")
            raise
    
    def add_document_metadata(self, loan_app_id: str, document_metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Add document metadata to a loan application
        
        Args:
            loan_app_id: Loan application ID
            document_metadata: Document metadata (file name, URL, size, etc.)
            
        Returns:
            Updated loan application document
        """
        try:
            existing_doc = self.get_loan_application(loan_app_id)
            if not existing_doc:
                raise ValueError(f"Loan application not found: {loan_app_id}")
            
            # Append to documents list
            if "documents" not in existing_doc:
                existing_doc["documents"] = []
            existing_doc["documents"].append(document_metadata)
            
            # Update timestamp
            existing_doc["updated_at"] = datetime.utcnow().isoformat()
            
            # Replace document
            updated_doc = self.container.replace_item(
                item=loan_app_id,
                body=existing_doc
            )
            
            print(f"Added document metadata to: {loan_app_id}")
            return updated_doc
        
        except exceptions.CosmosHttpResponseError as e:
            print(f"Error adding document metadata: {e.message}")
            raise
    
    def update_fraud_analysis(self, loan_app_id: str, fraud_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update fraud analysis results for a loan application
        
        Args:
            loan_app_id: Loan application ID
            fraud_analysis: Fraud analysis results
            
        Returns:
            Updated loan application document
        """
        try:
            updates = {
                "fraud_analysis": fraud_analysis,
                "status": "under_review"
            }
            return self.update_loan_application(loan_app_id, updates)
        
        except Exception as e:
            print(f"Error updating fraud analysis: {str(e)}")
            raise
    
    def update_detailed_agent_analysis(self, loan_app_id: str, agent_analyses: Dict[str, Any], 
                                      overall_score: float, overall_status: str) -> Dict[str, Any]:
        """
        Update detailed agent analysis results with individual agent scores and comments
        
        Args:
            loan_app_id: Loan application ID
            agent_analyses: Dictionary containing individual agent analyses with scores and comments
            overall_score: Final aggregated fraud risk score
            overall_status: Overall application status after analysis
            
        Returns:
            Updated loan application document
        """
        try:
            # Prepare detailed fraud analysis structure
            fraud_analysis = {
                "overall_risk_score": overall_score,
                "overall_recommendation": agent_analyses.get("overall_recommendation", ""),
                "application_status": overall_status,
                "analyzed_at": datetime.utcnow().isoformat(),
                "agent_results": {},
                "critical_issues": agent_analyses.get("critical_issues", []),
                "warnings": agent_analyses.get("warnings", []),
                "summary": agent_analyses.get("summary", "")
            }
            
            # Extract individual agent results with scores and comments
            for agent_name, agent_data in agent_analyses.get("agent_analyses", {}).items():
                fraud_analysis["agent_results"][agent_name] = {
                    "risk_score": agent_data.get("risk_score", 0),
                    "recommendation": agent_data.get("recommendation", ""),
                    "comments": agent_data.get("comments", ""),
                    "findings": agent_data.get("findings", []),
                    "flag_count": agent_data.get("flag_count", 0),
                    "analyzed_data": agent_data.get("analyzed_data", {}),
                    "raw_response": agent_data  # Store full response
                }
            
            # Update the document
            updates = {
                "fraud_analysis": fraud_analysis,
                "status": overall_status,
                "overall_fraud_score": overall_score
            }
            
            updated_doc = self.update_loan_application(loan_app_id, updates)
            print(f"Updated detailed agent analysis for: {loan_app_id}")
            print(f"  Overall Score: {overall_score}")
            print(f"  Number of agents analyzed: {len(fraud_analysis['agent_results'])}")
            
            return updated_doc
        
        except Exception as e:
            print(f"Error updating detailed agent analysis: {str(e)}")
            raise
    
    def list_loan_applications(self, status: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
        """
        List loan applications with optional status filter
        
        Args:
            status: Filter by application status (optional)
            limit: Maximum number of results
            
        Returns:
            List of loan application documents
        """
        try:
            if status:
                query = f"SELECT * FROM c WHERE c.status = @status ORDER BY c.created_at DESC OFFSET 0 LIMIT {limit}"
                parameters = [{"name": "@status", "value": status}]
            else:
                query = f"SELECT * FROM c ORDER BY c.created_at DESC OFFSET 0 LIMIT {limit}"
                parameters = None
            
            items = list(self.container.query_items(
                query=query,
                parameters=parameters,
                enable_cross_partition_query=True
            ))
            
            return items
        
        except exceptions.CosmosHttpResponseError as e:
            print(f"Error listing loan applications: {e.message}")
            raise
    
    def delete_loan_application(self, loan_app_id: str) -> bool:
        """
        Delete a loan application
        
        Args:
            loan_app_id: Loan application ID
            
        Returns:
            True if deleted successfully
        """
        try:
            self.container.delete_item(
                item=loan_app_id,
                partition_key=loan_app_id
            )
            print(f"Deleted loan application: {loan_app_id}")
            return True
        
        except exceptions.CosmosResourceNotFoundError:
            print(f"Loan application not found: {loan_app_id}")
            return False
        
        except exceptions.CosmosHttpResponseError as e:
            print(f"Error deleting loan application: {e.message}")
            raise


# Singleton instance
_cosmos_service = None

def get_cosmos_service() -> CosmosDBService:
    """Get singleton instance of CosmosDBService"""
    global _cosmos_service
    if _cosmos_service is None:
        _cosmos_service = CosmosDBService()
    return _cosmos_service
