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
import re
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

        if not instructions or not instructions.strip():
            raise ValueError(f"Instructions for agent '{name}' are empty — check the agent module.")

        # Prepare config parameters
        config = config or {}
        temperature = config.get('temperature', 0.7)
        top_p = config.get('top_p', 0.95)
        max_tokens = config.get('max_tokens', 4000)
        description = config.get('description', '')
        
        # Fetch ALL agents inside the thread so the iterator is fully consumed
        # in the same synchronous context — avoids getting only the first page.
        # limit=100 is the API maximum per page, minimising round-trips.
        existing_agents = await asyncio.to_thread(
            lambda: list(self.agents_client.list_agents(limit=100))
        )

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

            print(f"\n[AGGREGATOR] Received {len(results)} result(s)")
            for i, r in enumerate(results):
                print(f"  [AGGREGATOR] Item {i}: type={type(r).__name__}, attrs={[a for a in dir(r) if not a.startswith('_')]}")
                # Inspect agent_response
                ar_raw = getattr(r, 'agent_response', None)
                print(f"    agent_response type: {type(ar_raw).__name__ if ar_raw is not None else 'None'}")
                if ar_raw is not None:
                    msgs = getattr(ar_raw, 'messages', None)
                    print(f"    agent_response.messages: {msgs}")
                    if msgs:
                        for j, m in enumerate(msgs):
                            print(f"      msg[{j}]: author={getattr(m,'author_name',None)}, text={repr(getattr(m,'text',None))[:200]}")
                # If item itself looks like AgentResponse
                own_msgs = getattr(r, 'messages', None)
                if own_msgs and ar_raw is None:
                    print(f"    direct .messages: {own_msgs}")
                    for j, m in enumerate(own_msgs):
                        print(f"      msg[{j}]: author={getattr(m,'author_name',None)}, text={repr(getattr(m,'text',None))[:200]}")
            
            for r in results:
                # Extract agent name and response text
                ar = getattr(r, 'agent_response', None) or (r if isinstance(r, AgentResponse) else None)
                if ar and getattr(ar, 'messages', None):
                    last_msg = ar.messages[-1]
                    agent_name = getattr(last_msg, 'author_name', None) or "unknown"
                    text = getattr(last_msg, 'text', None) or ""
                    print(f"  [AGGREGATOR] Extracted: agent={agent_name!r}, text_len={len(text)}")
                    if agent_name not in ("user", "unknown") and text:
                        agent_results[agent_name] = text
            
            print(f"  [AGGREGATOR] agent_results keys: {list(agent_results.keys())}")
            if not agent_results:
                return '{"error": "No agent responses received", "risk_score": 50}'
            
            print(f"  Aggregating results from {len(agent_results)} agents...")
            
            # Return the agent results as a JSON structure for later processing
            # We'll process this in _aggregate_results
            return json.dumps(agent_results)
        
        return aggregate

    async def initialize_workflow(self):
        """
        Validate all Foundry agents are ready.
        Thread creation happens per-run inside run_workflow() to prevent
        persistent thread contamination between analyses.
        """
        if not self.foundry_agents:
            raise RuntimeError("Agents not set up. Call setup_agents() first.")
        print("\n✓ Workflow ready — a fresh client and threads will be created per analysis run\n")

    async def run_workflow(self, loan_application_data: str) -> Dict:
        """
        Run the concurrent fraud detection workflow with the given loan application data.
        All agents analyze the application simultaneously and results are aggregated.

        A fresh AzureAIAgentClient is created for every invocation so that each run
        starts on a clean Azure AI thread with no prior conversation history.

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
        if not self.foundry_agents:
            raise RuntimeError("Agents not set up. Call setup_agents() first.")

        print("\n" + "="*60)
        print("RUNNING CONCURRENT FRAUD DETECTION ANALYSIS")
        print("="*60)
        print(f"\nExecuting all agents in parallel...")

        # Debug: show first 300 chars of the data being sent to agents
        data_preview = loan_application_data[:300] if isinstance(loan_application_data, str) else repr(loan_application_data)[:300]
        print(f"\n[WORKFLOW] Sending to agents (first 300 chars): {data_preview}\n")

        agent_results = {}

        # Create a FRESH AzureAIAgentClient for this run.
        # This guarantees new Azure AI threads, preventing old conversation history
        # from contaminating the current analysis.
        fresh_client = AzureAIAgentClient(
            credential=self.credential,
            project_endpoint=self.project_endpoint,
            model_deployment_name=self.model_deployment_name
        )

        async with fresh_client:
            # Wrap all agents using the fresh client so each gets a new thread
            print("Wrapping agents for concurrent orchestration...")
            behavioural_agent_wrapped = fresh_client.as_agent(
                agent_id=self.foundry_agents['behavioural'].id,
                name=self.foundry_agents['behavioural'].name
            )
            device_fingerprint_agent_wrapped = fresh_client.as_agent(
                agent_id=self.foundry_agents['device_fingerprint'].id,
                name=self.foundry_agents['device_fingerprint'].name
            )
            fraud_ring_agent_wrapped = fresh_client.as_agent(
                agent_id=self.foundry_agents['fraud_ring'].id,
                name=self.foundry_agents['fraud_ring'].name
            )
            kyc_agent_wrapped = fresh_client.as_agent(
                agent_id=self.foundry_agents['kyc'].id,
                name=self.foundry_agents['kyc'].name
            )

            aggregator = self._make_aggregator()

            workflow = ConcurrentBuilder(
                participants=[
                    behavioural_agent_wrapped,
                    device_fingerprint_agent_wrapped,
                    fraud_ring_agent_wrapped,
                    kyc_agent_wrapped
                ],
                intermediate_outputs=True
            ).with_aggregator(aggregator).build()

            # Run concurrent orchestration - all agents execute in parallel
            result = await workflow.run(loan_application_data)

            # WorkflowRunResult is a list[WorkflowEvent] subclass.
            # Use get_outputs() to extract all ctx.yield_output() payloads:
            #   - Individual AgentResponse objects (one per agent, from superstep 1)
            #   - Our aggregator's JSON string (from superstep 2)
            outputs = result.get_outputs() if hasattr(result, 'get_outputs') else []
            print(f"\n[WORKFLOW] get_outputs() returned {len(outputs)} output(s):")
            for i, o in enumerate(outputs):
                print(f"  [{i}] type={type(o).__name__}, preview={repr(str(o))[:150]}")

            # The aggregator returns a JSON string mapping agent_name -> response_text.
            # Find it among the outputs (individual agent outputs are AgentResponse objects).
            aggregated_json = None
            for output in outputs:
                if isinstance(output, str):
                    try:
                        parsed = json.loads(output)
                        if isinstance(parsed, dict) and "error" not in parsed:
                            aggregated_json = parsed
                            break
                    except json.JSONDecodeError:
                        pass

            if aggregated_json:
                agent_results = aggregated_json
                print(f"\n✓ All agents completed analysis")
                print(f"  Received aggregated results from {len(agent_results)} agents\n")
            else:
                # Fallback: extract directly from individual AgentResponse outputs
                print("  [WORKFLOW] No aggregator JSON found — falling back to individual outputs")
                for output in outputs:
                    if isinstance(output, AgentResponse):
                        msgs = getattr(output, 'messages', None) or []
                        if msgs:
                            last_msg = msgs[-1]
                            agent_name = getattr(last_msg, 'author_name', None) or "unknown"
                            text = getattr(last_msg, 'text', None) or ""
                            if agent_name not in ("user", "unknown") and text:
                                agent_results[agent_name] = text
                print(f"\n✓ All agents completed analysis")
                print(f"  Processed {len(agent_results)} agent responses (fallback)\n")

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
        
        # Parse each agent's plain-text response
        for agent_name, result_text in agent_results.items():
            try:
                parsed = self._extract_from_text(result_text)
                consolidated_report["agent_analyses"][agent_name] = parsed

                risk_score = parsed.get("risk_score", 0)
                recommendation = parsed.get("recommendation", "")

                if risk_score > 0:
                    risk_scores.append(risk_score)

                if risk_score >= 70:
                    critical_issues.append(f"{agent_name}: {recommendation or 'High risk detected'}")
                elif risk_score >= 40:
                    warnings.append(f"{agent_name}: {recommendation or 'Moderate risk detected'}")

            except Exception as e:
                print(f"  Warning: Could not parse {agent_name} response: {e}")
                consolidated_report["agent_analyses"][agent_name] = {"raw_response": result_text}
        
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
    
    def _extract_from_text(self, text: str) -> Dict:
        """
        Parse a structured plain-text agent response into a dict.

        Expected format produced by all agent instructions:
            RISK_SCORE: 35
            CONFIDENCE: 80
            RECOMMENDATION: MANUAL_REVIEW
            <FINDINGS/ANOMALIES/RED_FLAGS/CONNECTIONS/ISSUES>:
            - item 1
            ANALYSIS:
            Narrative text ...

        Falls back gracefully when fields are missing.
        Also accepts JSON responses for backwards compatibility.
        """
        # Backwards compat: if it looks like JSON, parse it
        stripped = text.strip()
        if stripped.startswith('{'):
            try:
                data = json.loads(stripped)
                # Normalise key names that may differ between JSON and text versions
                return {
                    "risk_score": data.get("risk_score", 0),
                    "confidence": data.get("confidence", 0),
                    "recommendation": data.get("recommendation", ""),
                    "analysis": data.get("details") or data.get("analysis") or str(data),
                    "raw_response": text,
                }
            except json.JSONDecodeError:
                pass

        result = {
            "risk_score": 0,
            "confidence": 0,
            "recommendation": "",
            "analysis": "",
            "raw_response": text,
        }

        # Extract labelled fields with a simple regex scan
        score_match = re.search(r'RISK[_\s]SCORE\s*:\s*(\d+)', text, re.IGNORECASE)
        if score_match:
            result["risk_score"] = int(score_match.group(1))

        conf_match = re.search(r'CONFIDENCE\s*:\s*(\d+)', text, re.IGNORECASE)
        if conf_match:
            result["confidence"] = int(conf_match.group(1))

        rec_match = re.search(r'RECOMMENDATION\s*:\s*(APPROVE|MANUAL_REVIEW|REJECT)', text, re.IGNORECASE)
        if rec_match:
            result["recommendation"] = rec_match.group(1).upper()

        # Capture everything after ANALYSIS: as the narrative
        analysis_match = re.search(r'ANALYSIS\s*:\s*(.*)', text, re.IGNORECASE | re.DOTALL)
        if analysis_match:
            result["analysis"] = analysis_match.group(1).strip()
        else:
            result["analysis"] = text.strip()

        return result

    
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
        """Clean up resources (clients are now per-run, nothing persistent to release)."""
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
