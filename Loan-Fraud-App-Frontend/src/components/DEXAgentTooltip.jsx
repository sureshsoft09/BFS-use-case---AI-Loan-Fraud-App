import React from 'react';
import '../pages/BehaviouralTooltip.css';

const DEXAgentTooltip = () => (
  <div className="behavior-agent-container">
    <div className="tooltip-pointer"></div>
    <h3 className="ba-title">DEX Agent</h3>
    <p className="ba-subtitle">Thresholds</p>
    <div className="ba-divider"></div>

    <div className="ba-row low">
      <span className="ba-icon">✓</span>
      <span className="ba-label">Low</span>
      <span className="ba-text">: &gt; 0.7 Trust (No flags like VPN or Emulators).</span>
    </div>

    <div className="ba-row medium">
      <span className="ba-icon">!</span>
      <span className="ba-label">Medium</span>
      <span className="ba-text">: 0.4 - 0.7 Trust (Detected high latency or suspicious hardware).</span>
    </div>

    <div className="ba-row high">
      <span className="ba-icon">✕</span>
      <span className="ba-label">High</span>
      <span className="ba-text">: &lt; 0.4 Trust (VPN detected or Emulator suspected).</span>
    </div>
  </div>
);

export default DEXAgentTooltip;
