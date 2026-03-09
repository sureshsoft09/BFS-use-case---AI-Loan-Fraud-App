import React from 'react';
import './BehaviouralTooltip.css'; 

const BehaviouralTooltip = () => (
  <div className="behavior-agent-container">
    <div className="tooltip-pointer"></div>
    <h3 className="ba-title">Behavioral Agent</h3>
    <p className="ba-subtitle">Thresholds</p>
    <div className="ba-divider"></div>

    <div className="ba-row low">
      <span className="ba-icon">✓</span>
      <span className="ba-label">Low</span>
      <span className="ba-text">: &lt; 0.3 (Natural human flow).</span>
    </div>

    <div className="ba-row medium">
      <span className="ba-icon">!</span>
      <span className="ba-label">Medium</span>
      <span className="ba-text">: 0.3 - 0.6 (Frequent pauses or "copy-paste" style behavior).</span>
    </div>

    <div className="ba-row high">
      <span className="ba-icon">✕</span>
      <span className="ba-label">High</span>
      <span className="ba-text">: &gt; 0.6 (Automated script signatures).</span>
    </div>
  </div>
);

export default BehaviouralTooltip;