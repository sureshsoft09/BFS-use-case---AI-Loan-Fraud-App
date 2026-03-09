import React from 'react';
import '../pages/BehaviouralTooltip.css';

const FraudRingTooltip = () => (
  <div className="behavior-agent-container">
    <div className="tooltip-pointer"></div>
    <h3 className="ba-title">Fraud Ring Agent</h3>
    <p className="ba-subtitle">Thresholds</p>
    <div className="ba-divider"></div>

    <div className="ba-row low">
      <span className="ba-icon">✓</span>
      <span className="ba-label">Low</span>
      <span className="ba-text">: &lt; 40</span>
    </div>

    <div className="ba-row medium">
      <span className="ba-icon">!</span>
      <span className="ba-label">Medium</span>
      <span className="ba-text">: 40 &lt;= SCORE &lt; 70</span>
    </div>

    <div className="ba-row high">
      <span className="ba-icon">✕</span>
      <span className="ba-label">High</span>
      <span className="ba-text">: &gt;= 70 (Triggers automatic "Rejected" status in this agent)</span>
    </div>
  </div>
);

export default FraudRingTooltip;
