"""
Example usage of the Loan Fraud Detection Orchestrator

This script demonstrates how to use the fraud detection system to analyze loan applications.
"""

import asyncio
import json
from app.agents.agent_orchestrator import run_loan_fraud_detection, get_orchestrator


# Sample loan application data
SAMPLE_APPLICATION = {
    "application_id": "LN-2026-00123",
    "timestamp": "2026-03-09T10:30:00Z",
    
    "applicant": {
        "name": "John Doe",
        "email": "john.doe@example.com",
        "phone": "+1-555-0123",
        "address": "123 Main St, Springfield, IL 62701",
        "ssn_last4": "1234",
        "date_of_birth": "1985-06-15"
    },
    
    "loan_details": {
        "amount_requested": 50000,
        "purpose": "Home Renovation",
        "term_months": 60,
        "stated_income": 85000,
        "employment_status": "Employed",
        "employer": "ABC Corporation"
    },
    
    "behavioral_data": {
        "form_completion_time_seconds": 180,
        "keystroke_patterns": {
            "average_keystroke_interval_ms": 150,
            "typing_speed_wpm": 45,
            "copy_paste_count": 2,
            "backspace_count": 15,
            "hesitation_on_fields": ["employer", "income"]
        },
        "mouse_movements": {
            "total_movements": 234,
            "suspicious_patterns": false,
            "field_revisits": 3
        },
        "time_per_field": {
            "name": 5,
            "email": 8,
            "address": 45,
            "income": 30,
            "employer": 25
        }
    },
    
    "device_data": {
        "ip_address": "192.168.1.100",
        "geolocation": {
            "country": "US",
            "state": "Illinois",
            "city": "Springfield",
            "latitude": 39.7817,
            "longitude": -89.6501
        },
        "device_info": {
            "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "os": "Windows 10",
            "browser": "Chrome 120.0",
            "screen_resolution": "1920x1080",
            "timezone": "America/Chicago",
            "language": "en-US"
        },
        "network_info": {
            "vpn_detected": false,
            "proxy_detected": false,
            "tor_detected": false
        },
        "device_fingerprint": "abc123def456ghi789"
    },
    
    "historical_checks": {
        "previous_applications": 0,
        "credit_checks_90_days": 2,
        "same_device_applications": 1,
        "same_ip_applications": 1
    },
    
    "kyc_documents": {
        "identity_document": {
            "type": "drivers_license",
            "state": "IL",
            "number_last4": "5678",
            "expiration_date": "2028-06-15",
            "uploaded": true,
            "file_name": "drivers_license.pdf"
        },
        "proof_of_address": {
            "type": "utility_bill",
            "date": "2026-02-01",
            "uploaded": true,
            "address_matches": true
        },
        "income_verification": {
            "type": "pay_stub",
            "employer_name": "ABC Corporation",
            "income_stated": 85000,
            "uploaded": true,
            "documents_count": 2
        }
    }
}


async def example_single_analysis():
    """
    Example 1: Analyze a single loan application using the convenience function.
    This is the simplest way to run fraud detection.
    """
    print("="*70)
    print("EXAMPLE 1: Single Loan Application Analysis")
    print("="*70 + "\n")
    
    # Convert application data to JSON string
    application_json = json.dumps(SAMPLE_APPLICATION, indent=2)
    
    # Run fraud detection (creates orchestrator, runs analysis, cleans up)
    report = await run_loan_fraud_detection(application_json)
    
    # Display results
    print("\n" + "="*70)
    print("FRAUD DETECTION REPORT")
    print("="*70)
    print(f"\nApplication ID: {SAMPLE_APPLICATION['application_id']}")
    print(f"Overall Risk Score: {report['overall_risk_score']}/100")
    print(f"Status: {report['application_status']}")
    print(f"Recommendation: {report['overall_recommendation']}")
    
    if report['critical_issues']:
        print(f"\n🚨 Critical Issues ({len(report['critical_issues'])}):")
        for issue in report['critical_issues']:
            print(f"  - {issue}")
    
    if report['warnings']:
        print(f"\n⚠️  Warnings ({len(report['warnings'])}):")
        for warning in report['warnings']:
            print(f"  - {warning}")
    
    print(f"\n📊 Individual Agent Analyses:")
    for agent_name, analysis in report['agent_analyses'].items():
        if isinstance(analysis, dict) and 'risk_score' in analysis:
            print(f"  - {agent_name}: Risk Score {analysis['risk_score']}/100")
    
    print(f"\n📝 Summary:")
    print(report['summary'])
    
    return report


async def example_batch_analysis():
    """
    Example 2: Analyze multiple loan applications efficiently.
    Reuses the same orchestrator instance for better performance.
    """
    print("\n\n" + "="*70)
    print("EXAMPLE 2: Batch Analysis of Multiple Applications")
    print("="*70 + "\n")
    
    # Create orchestrator once
    orchestrator = await get_orchestrator()
    
    try:
        # Simulate multiple applications
        applications = [
            {**SAMPLE_APPLICATION, "application_id": f"LN-2026-{i:05d}"}
            for i in range(1, 4)
        ]
        
        results = []
        
        for app in applications:
            print(f"\nAnalyzing application {app['application_id']}...")
            app_json = json.dumps(app, indent=2)
            report = await orchestrator.run_workflow(app_json)
            results.append({
                "id": app['application_id'],
                "risk_score": report['overall_risk_score'],
                "status": report['application_status']
            })
        
        # Summary of batch results
        print("\n" + "="*70)
        print("BATCH ANALYSIS SUMMARY")
        print("="*70)
        for result in results:
            print(f"  {result['id']}: Risk={result['risk_score']}/100, Status={result['status']}")
        
        return results
        
    finally:
        # Clean up orchestrator
        await orchestrator.cleanup()


async def main():
    """Run all examples."""
    
    # Example 1: Single analysis
    await example_single_analysis()
    
    # Example 2: Batch analysis
    await example_batch_analysis()
    
    print("\n✓ All examples completed!")


if __name__ == "__main__":
    # Run the async main function
    asyncio.run(main())
