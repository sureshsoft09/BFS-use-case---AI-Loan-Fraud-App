import React from 'react';
import '../pages/BehaviouralTooltip.css';

const KYCAgentTooltip = () => (
  <div className="behavior-agent-container">
    <div className="tooltip-pointer"></div>
    <h3 className="ba-title">KYC Agent</h3>
    <p className="ba-subtitle">Thresholds</p>
    <div className="ba-divider"></div>

    <div className="ba-row low">
      <span className="ba-icon">✓</span>
      <span className="ba-label">Approved</span>
      <span className="ba-text">: Score &gt;= 600 AND all identity checks (2FA, SSN, Docs) pass.</span>
    </div>

    <div className="ba-row high">
      <span className="ba-icon">✕</span>
      <span className="ba-label">Rejected</span>
      <span className="ba-text">: Score &lt; 600 OR any identity / 2FA check fails.</span>
    </div>
  </div>
);

export default KYCAgentTooltip;
