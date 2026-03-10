"""
Agent Orchestrator for Loan Fraud Detection

This module manages the creation and orchestration of all agents in the loan fraud detection system.
It uses Microsoft Agent Framework with Azure AI Foundry to create and coordinate multiple specialized 
fraud detection agents using concurrent orchestration.

The system analyzes loan applications across four dimensions:
1. Behavioral patterns (keystroke dynamics, mouse movements)
2. Device fingerprints (IP, geolocation, device characteristics)
3. Fraud rings (organized fraud networks and patterns)
4. KYC document verification (identity and supporting documents)
"""

import os
import asyncio
import json
from typing import List, Dict, Optional, Any
from dotenv import load_dotenv
from azure.identity import AzureCliCredential, DefaultAzureCredential
from azure.ai.agents import AgentsClient
from agent_framework.azure import AzureAIAgentClient
from agent_framework.orchestrations import ConcurrentBuilder
from agent_framework import Message, AgentResponse, AgentResponseUpdate

# Import agent definitions
from . import behavioural_agent
from . import device_fingerprint_agent
from . import fraud_ring_agent
from . import kyc_agent

# Agent names and instructions
BEHAVIOURAL_AGENT_NAME = behavioural_agent.AGENT_NAME
BEHAVIOURAL_INSTRUCTIONS = behavioural_agent.AGENT_INSTRUCTIONS

DEVICE_FINGERPRINT_AGENT_NAME = device_fingerprint_agent.AGENT_NAME
DEVICE_FINGERPRINT_INSTRUCTIONS = device_fingerprint_agent.AGENT_INSTRUCTIONS

FRAUD_RING_AGENT_NAME = fraud_ring_agent.AGENT_NAME
FRAUD_RING_INSTRUCTIONS = fraud_ring_agent.AGENT_INSTRUCTIONS

KYC_AGENT_NAME = kyc_agent.AGENT_NAME
KYC_INSTRUCTIONS = kyc_agent.AGENT_INSTRUCTIONS

# Agent Configuration Settings
# Each agent configured for optimal fraud detection performance
AGENT_CONFIGS = {
    'behavioural': {
        'temperature': 0.3,  # Lower for consistent behavioral pattern analysis
        'top_p': 0.9,
        #'max_tokens': 4000,
        'description': 'Analyzes behavioral and biometric patterns during loan application submission'
    },
    'device_fingerprint': {
        'temperature': 0.3,  # Lower for consistent device analysis
        'top_p': 0.9,
        #'max_tokens': 4000,
        'description': 'Analyzes device fingerprints, IP addresses, and network characteristics'
    },
    'fraud_ring': {
        'temperature': 0.4,  # Slightly higher for pattern recognition
        'top_p': 0.95,
        #'max_tokens': 6000,
        'description': 'Detects fraud rings and organized fraud network patterns'
    },
    'kyc': {
        'temperature': 0.3,  # Lower for consistent document verification
        'top_p': 0.9,
        #'max_tokens': 5000,
        'description': 'Verifies KYC documents and validates identity information'
    }
}


class AgentOrchestrator:
    """
    Orchestrator for managing all agents in the loan fraud detection workflow.
    
    This class handles:
    - Creating/retrieving agents in Azure AI Foundry
    - Setting up concurrent orchestration for parallel fraud analysis
    - Running all agents simultaneously and aggregating results
    - Generating consolidated fraud risk reports
    
    Each instance can run independently in different threads/sessions.
    """
    
    def __init__(self):
        """Initialize the orchestrator with Azure credentials and configuration."""
        load_dotenv()
        
        # Use AzureCliCredential to use current Azure CLI session
        # This avoids tenant mismatch issues from cached credentials
        try:
            self.credential = AzureCliCredential()
            print("✓ Using Azure CLI credentials")
        except Exception as e:
            print(f"⚠ Azure CLI credentials not available, falling back to DefaultAzureCredential: {e}")
            self.credential = DefaultAzureCredential()
        
        self.project_endpoint = os.getenv("AZURE_AI_PROJECT_ENDPOINT")
        self.model_deployment_name = os.getenv("AZURE_AI_MODEL_DEPLOYMENT_NAME")
        
        if not self.project_endpoint or not self.model_deployment_name:
            raise ValueError(
                "Missing required environment variables: "
                "AZURE_AI_PROJECT_ENDPOINT and AZURE_AI_MODEL_DEPLOYMENT_NAME"
            )
        
        # Initialize AgentsClient for Foundry operations
        self.agents_client = AgentsClient(
            endpoint=self.project_endpoint,
            credential=self.credential
        )
        
        # Store agent references
        self.foundry_agents = {}
        self.workflow = None
        self.foundry_client = None
        
        print(f"✓ AgentOrchestrator instance created for Loan Fraud Detection")
    
    async def get_or_create_agent(self, name: str, instructions: str, config: dict = None):
        """
        Check if agent exists in Foundry, if not create it.
        
        Args:
            name: Agent name
            instructions: Agent instructions
            config: Optional configuration dict with temperature, top_p, max_tokens, description
            
        Returns:
            Agent object from Azure AI Foundry
        """
        print(f"Checking if agent '{name}' exists in Foundry...")
        
        # Prepare config parameters
        config = config or {}
        temperature = config.get('temperature', 0.7)
        top_p = config.get('top_p', 0.95)
        max_tokens = config.get('max_tokens', 4000)
        description = config.get('description', '')
        
        # List all agents (run in thread pool to avoid blocking)
        existing_agents_iter = await asyncio.to_thread(self.agents_client.list_agents)
        existing_agents = list(existing_agents_iter)
        
        # Check if agent with this name already exists
        for agent in existing_agents:
            if agent.name == name:
                if os.getenv("UPDATE_FOUNDRY_AGENT", "true").lower() == "true":
                    print(f"  ✓ Found existing agent: {agent.name} (ID: {agent.id}) — updating...")
                    print(f"    Temperature: {temperature}, Top-P: {top_p}, Max Tokens: {max_tokens}")
                    updated = await asyncio.to_thread(
                        self.agents_client.update_agent,
                        agent.id,
                        instructions=instructions,
                        temperature=temperature,
                        top_p=top_p
                    )
                    return updated
                else:
                    print(f"  ✓ Found existing agent: {agent.name} (ID: {agent.id})")
                    return agent
        
        # Agent doesn't exist, create it
        print(f"  Creating new agent '{name}'...")
        print(f"    Temperature: {temperature}, Top-P: {top_p}, Max Tokens: {max_tokens}")
        if description:
            print(f"    Description: {description}")
        
        new_agent = await asyncio.to_thread(
            self.agents_client.create_agent,
            model=self.model_deployment_name,
            name=name,
            instructions=instructions,
            temperature=temperature,
            top_p=top_p,
            description=description
        )
        print(f"  ✓ Created agent: {new_agent.name} (ID: {new_agent.id})")
        return new_agent
    
    async def setup_agents(self):
        """
        Set up all fraud detection agents in Azure AI Foundry.
        Creates agents if they don't exist, or retrieves existing ones.
        Each agent is configured with specific temperature and behavior settings.
        """
        print("\n" + "="*60)
        print("SETTING UP LOAN FRAUD DETECTION AGENTS")
        print("="*60 + "\n")
        
        # Create/get all agents in Foundry with their specific configurations
        self.foundry_agents['behavioural'] = await self.get_or_create_agent(
            name=BEHAVIOURAL_AGENT_NAME,
            instructions=BEHAVIOURAL_INSTRUCTIONS,
            config=AGENT_CONFIGS['behavioural']
        )
        
        self.foundry_agents['device_fingerprint'] = await self.get_or_create_agent(
            name=DEVICE_FINGERPRINT_AGENT_NAME,
            instructions=DEVICE_FINGERPRINT_INSTRUCTIONS,
            config=AGENT_CONFIGS['device_fingerprint']
        )
        
        self.foundry_agents['fraud_ring'] = await self.get_or_create_agent(
            name=FRAUD_RING_AGENT_NAME,
            instructions=FRAUD_RING_INSTRUCTIONS,
            config=AGENT_CONFIGS['fraud_ring']
        )
        
        self.foundry_agents['kyc'] = await self.get_or_create_agent(
            name=KYC_AGENT_NAME,
            instructions=KYC_INSTRUCTIONS,
            config=AGENT_CONFIGS['kyc']
        )
        
        print(f"\n✓ All {len(self.foundry_agents)} fraud detection agents ready in Foundry")

    def _make_aggregator(self):
        """Return an async aggregator callback that combines all agent results."""
        
        async def aggregate(results: list) -> str:
            """
            Receive list of agent executor responses and return aggregated analysis.
            Combines individual agent analyses into a consolidated fraud report.
            """
            agent_results = {}
            
            for r in results:
                # Extract agent name and response text
                if hasattr(r, 'agent_response') and r.agent_response.messages:
                    last_msg = r.agent_response.messages[-1]
                    agent_name = last_msg.author_name or "unknown"
                    text = last_msg.text or ""
                    
                    if agent_name != "user" and text and agent_name != "unknown":
                        agent_results[agent_name] = text
            
            if not agent_results:
                return '{"error": "No agent responses received", "risk_score": 50}'
            
            print(f"  Aggregating results from {len(agent_results)} agents...")
            
            # Return the agent results as a JSON structure for later processing
            # We'll process this in _aggregate_results
            return json.dumps(agent_results)
        
        return aggregate

    async def initialize_workflow(self):
        """
        Initialize the Concurrent Orchestration workflow with all agents.
        All agents will run in parallel to analyze the loan application simultaneously.
        """
        print("\n" + "="*60)
        print("INITIALIZING CONCURRENT FRAUD DETECTION WORKFLOW")
        print("="*60 + "\n")
        
        # Create AzureAIAgentClient as context manager
        self.foundry_client = AzureAIAgentClient(
            credential=self.credential,
            project_endpoint=self.project_endpoint,
            model_deployment_name=self.model_deployment_name
        )
        
        await self.foundry_client.__aenter__()
        
        # Wrap all agents for the workflow
        print("Wrapping agents for concurrent orchestration...")
        
        behavioural_agent_wrapped = self.foundry_client.as_agent(
            agent_id=self.foundry_agents['behavioural'].id,
            name=self.foundry_agents['behavioural'].name
        )
        
        device_fingerprint_agent_wrapped = self.foundry_client.as_agent(
            agent_id=self.foundry_agents['device_fingerprint'].id,
            name=self.foundry_agents['device_fingerprint'].name
        )
        
        fraud_ring_agent_wrapped = self.foundry_client.as_agent(
            agent_id=self.foundry_agents['fraud_ring'].id,
            name=self.foundry_agents['fraud_ring'].name
        )
        
        kyc_agent_wrapped = self.foundry_client.as_agent(
            agent_id=self.foundry_agents['kyc'].id,
            name=self.foundry_agents['kyc'].name
        )
        
        # Build Concurrent Orchestration - all agents run in parallel
        print(f"Building Concurrent Orchestration with {len(self.foundry_agents)} agents...")
        
        # Create custom aggregator for combining agent results
        aggregator = self._make_aggregator()
        
        self.workflow = ConcurrentBuilder(
            participants=[
                behavioural_agent_wrapped,
                device_fingerprint_agent_wrapped,
                fraud_ring_agent_wrapped,
                kyc_agent_wrapped
            ],
            intermediate_outputs=True
        ).with_aggregator(aggregator).build()
        
        print("✓ Concurrent orchestration workflow initialized successfully")
        print("  All agents will run in parallel for comprehensive fraud analysis\n")
    
    async def run_workflow(self, loan_application_data: str) -> Dict:
        """
        Run the concurrent fraud detection workflow with the given loan application data.
        All agents analyze the application simultaneously and results are aggregated.

        Args:
            loan_application_data: JSON string or structured data containing:
                - Applicant information
                - Behavioral data (keystroke, mouse movements)
                - Device fingerprint data
                - Application details
                - KYC documents

        Returns:
            Dict containing aggregated fraud analysis with overall risk assessment
        """
        if not self.workflow:
            raise RuntimeError(
                "Workflow not initialized. Call initialize_workflow() first."
            )

        print("\n" + "="*60)
        print("RUNNING CONCURRENT FRAUD DETECTION ANALYSIS")
        print("="*60)
        print(f"\nExecuting all agents in parallel...")

        agent_results = {}
        
        # Run concurrent orchestration - all agents execute in parallel
        result = await self.workflow.run(loan_application_data)
        
        # Process the result
        if isinstance(result, str):
            # Aggregated result from our custom aggregator
            try:
                agent_results = json.loads(result)
                print(f"\n✓ All agents completed analysis")
                print(f"  Received aggregated results from {len(agent_results)} agents\n")
            except json.JSONDecodeError:
                print(f"  Warning: Could not parse aggregated results, using raw data\n")
                agent_results = {"raw": result}
        elif isinstance(result, list):
            # List of messages (fallback if no aggregator)
            for item in result:
                if isinstance(item, Message) and item.text:
                    agent_name = item.author_name or "unknown"
                    if agent_name != "user":
                        if agent_name not in agent_results:
                            agent_results[agent_name] = ""
                        agent_results[agent_name] += item.text
            print(f"\n✓ All agents completed analysis")
            print(f"  Processed {len(agent_results)} agent responses\n")
        else:
            print(f"\n✓ Analysis completed with unexpected result type: {type(result)}\n")
            agent_results = {"raw": str(result)}

        # Aggregate results and calculate overall risk
        return self._aggregate_results(agent_results)
    
    def _aggregate_results(self, agent_results: Dict[str, str]) -> Dict:
        """
        Aggregate individual agent results into a consolidated fraud report.
        
        Args:
            agent_results: Dictionary mapping agent names to their JSON responses
            
        Returns:
            Dict containing consolidated fraud analysis with overall risk score
        """
        print("Aggregating fraud detection results...")
        
        consolidated_report = {
            "application_status": "UNDER_REVIEW",
            "overall_risk_score": 0,
            "overall_recommendation": "",
            "timestamp": "",
            "agent_analyses": {},
            "critical_issues": [],
            "warnings": [],
            "summary": ""
        }
        
        risk_scores = []
        critical_issues = []
        warnings = []
        
        # Parse each agent's JSON response
        for agent_name, result_text in agent_results.items():
            try:
                # Try to extract JSON from the response
                result_json = self._extract_json(result_text)
                
                if result_json:
                    consolidated_report["agent_analyses"][agent_name] = result_json
                    
                    # Extract risk score
                    if 'risk_score' in result_json:
                        risk_scores.append(result_json['risk_score'])
                    
                    # Collect critical issues (high risk)
                    if result_json.get('risk_score', 0) >= 70:
                        critical_issues.append(f"{agent_name}: {result_json.get('recommendation', 'High risk detected')}")
                    elif result_json.get('risk_score', 0) >= 40:
                        warnings.append(f"{agent_name}: {result_json.get('recommendation', 'Moderate risk detected')}")
                else:
                    # Store raw text if JSON parsing fails
                    consolidated_report["agent_analyses"][agent_name] = {"raw_response": result_text}
                    
            except Exception as e:
                print(f"  Warning: Could not parse {agent_name} response: {e}")
                consolidated_report["agent_analyses"][agent_name] = {"error": str(e), "raw_response": result_text}
        
        # Calculate overall risk score (weighted average or max)
        if risk_scores:
            # Use weighted average with emphasis on highest risks
            overall_risk = sum(risk_scores) / len(risk_scores)
            # Also consider the maximum risk as a factor
            max_risk = max(risk_scores)
            consolidated_report["overall_risk_score"] = round((overall_risk * 0.6) + (max_risk * 0.4), 2)
        
        consolidated_report["critical_issues"] = critical_issues
        consolidated_report["warnings"] = warnings
        
        # Determine overall recommendation
        if consolidated_report["overall_risk_score"] >= 70:
            consolidated_report["overall_recommendation"] = "REJECT - High fraud risk detected"
            consolidated_report["application_status"] = "REJECTED"
        elif consolidated_report["overall_risk_score"] >= 40:
            consolidated_report["overall_recommendation"] = "MANUAL_REVIEW - Moderate risk requires human review"
            consolidated_report["application_status"] = "MANUAL_REVIEW"
        else:
            consolidated_report["overall_recommendation"] = "APPROVE - Low fraud risk"
            consolidated_report["application_status"] = "APPROVED"
        
        # Generate summary
        consolidated_report["summary"] = self._generate_summary(consolidated_report)
        
        print(f"✓ Aggregation complete")
        print(f"  Overall Risk Score: {consolidated_report['overall_risk_score']}/100")
        print(f"  Status: {consolidated_report['application_status']}")
        print(f"  Critical Issues: {len(critical_issues)}")
        print(f"  Warnings: {len(warnings)}\n")
        
        return consolidated_report
    
    def _extract_json(self, text: str) -> Optional[Dict]:
        """
        Extract JSON object from text that may contain markdown or other content.
        
        Args:
            text: Text potentially containing JSON
            
        Returns:
            Parsed JSON dict or None
        """
        # Try direct JSON parse first
        try:
            return json.loads(text)
        except:
            pass
        
        # Try to find JSON in code blocks
        import re
        json_pattern = r'```(?:json)?\s*(\{.*?\})\s*```'
        matches = re.findall(json_pattern, text, re.DOTALL)
        if matches:
            try:
                return json.loads(matches[0])
            except:
                pass
        
        # Try to find any JSON object
        json_pattern = r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}'
        matches = re.findall(json_pattern, text, re.DOTALL)
        for match in matches:
            try:
                return json.loads(match)
            except:
                continue
        
        return None
    
    def _generate_summary(self, report: Dict) -> str:
        """Generate a human-readable summary of the fraud analysis."""
        summary_parts = [
            f"Fraud Detection Analysis Complete",
            f"Overall Risk Score: {report['overall_risk_score']}/100",
            f"Recommendation: {report['overall_recommendation']}"
        ]
        
        if report['critical_issues']:
            summary_parts.append(f"\nCritical Issues Found: {len(report['critical_issues'])}")
            for issue in report['critical_issues']:
                summary_parts.append(f"  - {issue}")
        
        if report['warnings']:
            summary_parts.append(f"\nWarnings: {len(report['warnings'])}")
            for warning in report['warnings'][:3]:  # Show first 3
                summary_parts.append(f"  - {warning}")
        
        return "\n".join(summary_parts)
    
    async def cleanup(self):
        """Clean up resources."""
        if self.foundry_client:
            await self.foundry_client.__aexit__(None, None, None)
            print("✓ Resources cleaned up")


# Convenience function for simple workflow execution
async def run_loan_fraud_detection(loan_application_data: str) -> Dict:
    """
    Convenience function to run the loan fraud detection workflow.
    
    This function:
    1. Creates the orchestrator
    2. Sets up all fraud detection agents
    3. Initializes the concurrent orchestration workflow
    4. Runs all agents in parallel to analyze the loan application
    5. Aggregates results and generates fraud risk report
    6. Cleans up resources
    
    Args:
        loan_application_data: JSON string containing loan application and related data
        
    Returns:
        Dict containing consolidated fraud analysis report
        
    Example:
        >>> report = await run_loan_fraud_detection(
        ...     json.dumps({
        ...         "applicant": {"name": "John Doe", ...},
        ...         "behavioral_data": {...},
        ...         "device_data": {...},
        ...         "kyc_documents": {...}
        ...     })
        ... )
        >>> print(f"Risk Score: {report['overall_risk_score']}")
        >>> print(f"Status: {report['application_status']}")
    """
    orchestrator = AgentOrchestrator()
    
    try:
        # Setup
        await orchestrator.setup_agents()
        await orchestrator.initialize_workflow()
        
        # Run concurrent analysis
        report = await orchestrator.run_workflow(loan_application_data)
        
        return report
    finally:
        await orchestrator.cleanup()


async def get_orchestrator() -> AgentOrchestrator:
    """
    Create and initialize a new orchestrator instance for multiple analyses.
    
    Returns:
        AgentOrchestrator: Initialized orchestrator instance
        
    Example:
        >>> orchestrator = await get_orchestrator()
        >>> report1 = await orchestrator.run_workflow(application1_data)
        >>> report2 = await orchestrator.run_workflow(application2_data)
        >>> await orchestrator.cleanup()
    """
    orchestrator = AgentOrchestrator()
    await orchestrator.setup_agents()
    await orchestrator.initialize_workflow()
    return orchestrator
