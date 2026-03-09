import React from "react";
import "./Login.css";
import cognizantLogo from "./assets/cognizant-logo.png";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();

  const handlePersonaSelection = (persona) => {
    // Store selected persona in sessionStorage for potential use
    sessionStorage.setItem("user_persona", persona);
    
    // Navigate based on persona
    if (persona === "loan-submitter") {
      navigate("/loan-dashboard");
    } else if (persona === "bank-manager") {
      navigate("/banking-dashboard");
    }
  };

  return (
    <div className="login-container">
      <div className="login-main">
        <div className="top-header">
          <img src={cognizantLogo} alt="Cognizant" className="logo" />
          <div className="header-info">
            <h1 className="solution-title">Loan Fraud Detection</h1>
            <div className="powered-by">
              <span className="powered-text">Powered by</span>
              <strong className="azure-brand"> Microsoft Agent Framework</strong>
              <span className="azure-platform"> on Azure</span>
            </div>
          </div>
        </div>

        <div className="content-wrapper">
          <div className="left-section">
            <div className="solution-overview">
              <h3 className="overview-title">Comprehensive Fraud Detection System</h3>
              <div className="agent-features">
                <div className="feature-item">
                  <div className="feature-icon">🔍</div>
                  <div className="feature-content">
                    <h4>Behavioral Analysis</h4>
                    <p>Analyzes keystroke patterns, mouse movements, and form interaction behaviors</p>
                  </div>
                </div>
                
                <div className="feature-item">
                  <div className="feature-icon">🖥️</div>
                  <div className="feature-content">
                    <h4>Device Fingerprinting</h4>
                    <p>Validates IP addresses, geolocations, and detects VPN/proxy usage</p>
                  </div>
                </div>
                
                <div className="feature-item">
                  <div className="feature-icon">🔗</div>
                  <div className="feature-content">
                    <h4>Fraud Ring Detection</h4>
                    <p>Identifies organized fraud networks and suspicious connection patterns</p>
                  </div>
                </div>
                
                <div className="feature-item">
                  <div className="feature-icon">✅</div>
                  <div className="feature-content">
                    <h4>KYC Verification</h4>
                    <p>Verifies identity documents and validates supporting documentation</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="right-section">
            <div className="persona-selection">
              <h2 className="persona-title">Select Your Role</h2>
              <p className="persona-subtitle">Choose your persona to continue</p>
              
              <div className="persona-buttons">
                <button 
                  className="persona-button loan-submitter"
                  onClick={() => handlePersonaSelection("loan-submitter")}
                >
                  <div className="persona-icon">📝</div>
                  <div className="persona-info">
                    <span className="persona-label">Loan Submitter</span>
                    <span className="persona-desc">Submit and track loan applications</span>
                  </div>
                </button>
                
                <button 
                  className="persona-button bank-manager"
                  onClick={() => handlePersonaSelection("bank-manager")}
                >
                  <div className="persona-icon">👔</div>
                  <div className="persona-info">
                    <span className="persona-label">Bank Manager</span>
                    <span className="persona-desc">Review and manage applications</span>
                  </div>
                </button>
              </div>

              <div className="technology-stack">
                <p className="tech-label">Built with:</p>
                <div className="tech-badges">
                  <span className="tech-badge">Azure AI Foundry</span>
                  <span className="tech-badge">Cosmos DB</span>
                  <span className="tech-badge">Blob Storage</span>
                  <span className="tech-badge">Agent Framework</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
