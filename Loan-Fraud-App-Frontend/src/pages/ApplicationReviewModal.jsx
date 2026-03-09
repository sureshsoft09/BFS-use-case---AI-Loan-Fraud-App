import React, { useState, useEffect, useRef } from 'react';
import DynamicAgentIcon from '../assets/agentIcons/dynamic-agent.png';
import DelegationAgentIcon from '../assets/agentIcons/delegation-agent.png';
import GraphAgentIcon from '../assets/agentIcons/graph agent.png';
import BehaviouralAgentIcon from '../assets/agentIcons/behavioural-agent.png';
import KYCIcon from '../assets/agentIcons/kyc-agent.png';
import CrossIcon from '../assets/agentIcons/cross.png';
import FinalIcon from '../assets/agentIcons/final-verdict.png';
import ExlaimIcon from '../assets/agentIcons/exclamation-mark.png';
import BehaviouralTooltip from './BehaviouralTooltip';
import FraudRingTooltip from '../components/FraudRingTooltip';
import DEXAgentTooltip from '../components/DEXAgentTooltip';
import KYCAgentTooltip from '../components/KYCAgentTooltip';

//  Component for the Shimmer Effect
const ReportSkeleton = () => (
  <div className="report-card" style={{ border: '1px solid #eee' }}>
    <div className="skeleton-box skeleton-title"></div>
    <div className="report-table">
      {[1, 2, 3].map((i) => (
        <div className="report-row" key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f9f9f9' }}>
          <div className="skeleton-box skeleton-row-label"></div>
          <div className="skeleton-box skeleton-row-value"></div>
        </div>
      ))}
    </div>
  </div>
);

// Utility to parse XAI logs
function parseXAILog(log) {
  if (!log) return [];
  // Try to parse JSON if it looks like a JSON string
  let parsed = log;
  try {
    if (typeof log === 'string' && log.trim().startsWith('{')) {
      parsed = JSON.parse(log);
    }
  } catch (e) {
    // fallback to original log
  }
  // If parsed is an object with riskStatus/reason, format them
  if (typeof parsed === 'object' && parsed !== null && (parsed.riskStatus || parsed.reason)) {
    const entries = [];
    if (parsed.riskStatus) {
      let val = String(parsed.riskStatus).replace(/^['"]|['"]$/g, '');
      val = val.charAt(0).toUpperCase() + val.slice(1);
      entries.push({ label: 'Risk Status', value: val });
    }
    if (parsed.reason) {
      let val = String(parsed.reason).replace(/^['"]|['"]$/g, '');
      val = val.charAt(0).toUpperCase() + val.slice(1);
      entries.push({ label: 'Reason', value: val });
    }
    return entries;
  }
  // fallback: split by lines and colons
  return String(log)
    .split('\n')
    .map(line => {
      const cleaned = line.replace(/^\u2022\s*\*\*/g, '').replace(/\*\*/g, '');
      const [label, ...rest] = cleaned.split(':');
      let value = rest.join(':').replace(/^['"]|['"]$/g, '').trim();
      value = value.charAt(0) ? value.charAt(0).toUpperCase() + value.slice(1) : value;
      return { label: label.trim().charAt(0).toUpperCase() + label.trim().slice(1), value };
    })
    .filter(item => item.label && item.value);
}

const ProcessStreamModal = ({ isOpen, onClose, applicantId, logs, explainableAI, agentName, agentIcon }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay secondary-overlay">
      <div className="stream-modal-content">
        <div className="stream-header">
          <span>Process Stream for Applicant ID : {applicantId}</span>
          <button className="stream-close-x" onClick={onClose}><img src={CrossIcon} alt="x" /></button>
        </div>
        <div className="stream-body">
          <div className="stream-field">
            <span className="stream-label">Running</span>
            <span className="stream-value"><img src={agentIcon} alt="" className="agent-icon-small" /> {agentName}</span>
          </div>
          <div className="stream-field">
            <span className="stream-label">Progress</span>
            <div className="progress-container">
              <div className="progress-bar" style={{ width: '100%' }}></div>
              <span className="progress-text">100%</span>
            </div>
          </div>
          <div className="stream-field">
            <span className="stream-label">Status</span>
            <span className="stream-value status-completed">Completed</span>
          </div>
          <div className="stream-field logs-section">
            <span className="stream-label">Commentary Logs</span>
            <div className="logs-container">
              {logs?.map((log, index) => <div key={index} className="log-entry">{log}</div>)}
            </div>
          </div>
          <div className="stream-field logs-section">
            <span className="stream-label">Explainable AI</span>
            <div className="logs-container">
              <div className="log-entry xai-content">
                {explainableAI ? (
                  Array.isArray(explainableAI) ? (
                    explainableAI.map((line, idx) => <div key={idx} style={{ marginBottom: '4px' }}>{line}</div>)
                  ) : (
                    parseXAILog(explainableAI).length > 0 ? (
                      parseXAILog(explainableAI).map((entry, idx) => (
                        <div key={idx} style={{ marginBottom: '4px' }}>
                          <strong>{entry.label}:</strong> {entry.value}
                        </div>
                      ))
                    ) : (
                      explainableAI
                    )
                  )
                ) : "No reasoning available."}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Confirmation Modal Component
const ConfirmApproveModal = ({ isOpen, onConfirm, onCancel, applicantId, approved }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" style={{ zIndex: 9999, position: 'fixed', top: 0, left: 0, width: '120vw', height: '115vh' }}>
      <div className="confirm-modal" style={{ background: '#fff', borderRadius: 12, padding: 32, maxWidth: 340, margin: '120px auto', boxShadow: '0 2px 16px rgba(0,0,0,0.18)', textAlign: 'center', position: 'relative', zIndex: 10000 }}>
        {!approved ? (
          <>
            <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: 18 }}>
              Are you really sure to approve this {applicantId ? applicantId : 'application'}?
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 18 }}>
              <button className="approve-btn" onClick={onConfirm}>Yes</button>
              <button className="btn" style={{ background: '#eee', color: '#222', borderRadius: 90, padding: '10px 36px', fontWeight: 'bold', fontSize: '1.0rem', cursor: 'pointer' }} onClick={onCancel}>No</button>
            </div>
          </>
        ) : (
          <div style={{ color: '#1fd6d1', fontWeight: 600, fontSize: '1.1rem' }}>Application approved!</div>
        )}
      </div>
    </div>
  );
};

const ApplicationReviewModal = ({ isOpen, onClose, appData }) => {
  const [isStreamOpen, setIsStreamOpen] = useState(false);
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('KYC_Agent');
  const fetchedIdRef = useRef(null);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const [isFraudTooltipOpen, setIsFraudTooltipOpen] = useState(false);
  const [isDEXTooltipOpen, setIsDEXTooltipOpen] = useState(false);
  const [isKYCTooltipOpen, setIsKYCTooltipOpen] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [approveSuccess, setApproveSuccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen || !appData?.id || fetchedIdRef.current === appData.id) return;
      setLoading(true);
      fetchedIdRef.current = appData.id;
      const payload = JSON.stringify({ "ApplicantID": appData.id });
      const dexPayload = JSON.stringify({ "ApplicantID": appData.id, "SessionID": appData.sessionId || (appData.session_id || appData.session || '') });
      try {
        const results = await Promise.allSettled([
          fetch("https://iwbe2d6db7.execute-api.us-west-2.amazonaws.com/dev/verify", { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload }),
          fetch("https://indk5ueh3f.execute-api.us-west-2.amazonaws.com/DEX_APPNO/consolidated-report", { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: dexPayload }),
          fetch('https://4ydeedvof2.execute-api.us-west-2.amazonaws.com/prod/bagent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload }),
          fetch('https://4hqxo2eufc.execute-api.us-west-2.amazonaws.com/FRagent/dump', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload }),
          fetch('https://xgmzkx0f4d.execute-api.us-west-2.amazonaws.com/orchestrator/orchestrator', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload })
        ]);

        let combinedData = {};
        if (results[0].status === "fulfilled" && results[0].value.ok) {
          const data = await results[0].value.json();
          combinedData = { ...combinedData, ...(Array.isArray(data) ? data[0] : data) };
        }
        if (results[1].status === "fulfilled" && results[1].value.ok) combinedData.consolidated = await results[1].value.json();
        if (results[2].status === "fulfilled" && results[2].value.ok) combinedData.behavioral = await results[2].value.json();
        if (results[3].status === "fulfilled" && results[3].value.ok) combinedData.graphAgent = await results[3].value.json();
        if (results[4].status === "fulfilled" && results[4].value.ok) combinedData.orchestrator = await results[4].value.json();
        
        setApiData(combinedData);
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchData();
    if (!isOpen) { setApiData(null); fetchedIdRef.current = null; }
  }, [isOpen, appData?.id]);

  useEffect(() => {
    // Reset approval state for each new application or when modal opens
    setApproveSuccess(false);
  }, [isOpen, appData?.id]);

  if (!isOpen) return null;

  const addressReport = apiData?.["Address Agent"];
  const kycReport = apiData?.["KYC Agent"];
  const dexReport = apiData?.consolidated;
  const graphReport = apiData?.graphAgent;
  const orchReport = apiData?.orchestrator;

   // Logic to determine which logs and XAI to show based on active tab
  const getStreamContent = () => {
    switch (activeTab) {
      case 'FinalVerdict': // Add this
       return { logs: orchReport?.LiveLogs, xai: orchReport?.XAI_Reasoning };
      case 'Dynamic':
        return { logs: orchReport?.LiveLogs, xai: orchReport?.XAI_Reasoning };
      case 'DelegationAgent':
        return { logs: dexReport?.intelligence?.live_logs, xai: dexReport?.intelligence?.xai_summary };
      case 'Graph':
        const gXai = graphReport?.xai_reasoning ? [`Summary: ${graphReport.xai_reasoning.summary}`, ...graphReport.xai_reasoning.details, `Action: ${graphReport.xai_reasoning.action}`] : null;
        return { logs: graphReport?.["Live Logs"], xai: gXai };
      default:
        return { logs: apiData?.["Live Logs"], xai: apiData?.["XAI reasoning"] };
    }
  };

  const getStatusClass = (status) => {
  switch (status?.toLowerCase()) {
    case 'approved': return 'status-approved';
    case 'rejected': return 'status-rejected';
    case 'pending': return 'status-pending';
    default: return 'status-default'; // Fallback style
  }
};

  const { logs: rawLogs, xai: explainableAI } = getStreamContent();
  const logs = rawLogs?.map(log => log.replace(/^\u2022\s*/, ''));

  const getActiveAgentInfo = () => {
    switch (activeTab) {
      case 'Dynamic': return { name: 'Orchestrator Agent', icon: DynamicAgentIcon };
      case 'DelegationAgent': return { name: 'DEX_Agent', icon: DelegationAgentIcon };
      case 'Graph': return { name: 'Graph_Agent', icon: GraphAgentIcon };
      case 'Behavioural': return { name: 'Behavioural_Agent', icon: BehaviouralAgentIcon };
      case 'FinalVerdict': return { name: 'FinalVerdict', icon: FinalIcon };

      default: return { name: 'KYC_Agent', icon: KYCIcon };
    }
  };
  const activeAgent = getActiveAgentInfo();

  // Helper to render behavioral reasoning line by line
const renderBehavioralReasoning = (reasoning) => {
  if (!reasoning) return "N/A";
  if (Array.isArray(reasoning)) return reasoning;
  // Split by period+space or newline, filter out empty lines
  return reasoning.split(/\.(?:\s+|$)|\n/).map(line => line.trim()).filter(Boolean);
};

// Helper to clean Final Verdict summary
const cleanFinalVerdictSummary = (summary) => {
  if (!summary) return '';
  return summary.replace(/^Final Decision:\s*/i, '');
};

  return (
    <>
      <div className="modal-overlay">
        <div className="modal-content" style={{ position: 'relative' }}>
          <div className="modal-header"><span>Application Review</span><button className="stream-close-x" onClick={onClose}><img src={CrossIcon} alt="x" /></button></div>
          <div className="modal-container">
            <aside className="modal-sidebar">
              <div className={`sidebar-nav-item ${activeTab === 'Dynamic' ? 'active' : ''}`} onClick={() => setActiveTab('Dynamic')}><img src={DynamicAgentIcon} className="agent-icon-small" /> Dynamic Orch. Agent</div>
              <div className={`sidebar-nav-item ${activeTab === 'DelegationAgent' ? 'active' : ''}`} onClick={() => setActiveTab('DelegationAgent')}><img src={DelegationAgentIcon} className="agent-icon-small" /> Device Fingerprint Agent</div>
              <div className={`sidebar-nav-item ${activeTab === 'Graph' ? 'active' : ''}`} onClick={() => setActiveTab('Graph')}><img src={GraphAgentIcon} className="agent-icon-small" /> Fraud Ring Agent</div>
              <div className={`sidebar-nav-item ${activeTab === 'Behavioural' ? 'active' : ''}`} onClick={() => setActiveTab('Behavioural')}><img src={BehaviouralAgentIcon} className="agent-icon-small" /> Behavioural Agent</div>
              <div className={`sidebar-nav-item ${activeTab === 'KYC_Agent' ? 'active' : ''}`} onClick={() => setActiveTab('KYC_Agent')}><img src={KYCIcon} className="agent-icon-small" /> KYC_Agent</div>
              <div className={`sidebar-nav-item ${activeTab === 'FinalVerdict' ? 'active' : ''}`} onClick={() => setActiveTab('FinalVerdict')}><img src={FinalIcon} className="agent-icon-small" /> Final Verdict</div>
            </aside>
            <main className="modal-main">
              {loading ? (<><ReportSkeleton /><ReportSkeleton /></>) : (
                <>
                {activeTab === 'FinalVerdict' ? (
  <div className="report-card">
    <h2 className="report-title">Final Verdict Report</h2>
    <div className="report-table">
      <div className="report-row"><div className="report-label">Applicant ID</div><div className="report-value">{orchReport?.ApplicantID || appData?.id}</div></div>
      <div className="report-row">
        <div className="report-label">2FA Check</div>
        <div className="report-value">{apiData?.["2FA Check"] ?? "N/A"}</div>
      </div>
      <div className="report-row">
        <div className="report-label">Summary</div>
        <div className="report-value">{cleanFinalVerdictSummary(apiData?.summary) || "Decision pending final analysis."}</div>
      </div>
      <div className="report-row">
        <div className="report-label">Decision</div>
        <div className={`report-value kyc-status-${kycReport?.status?.toLowerCase()}`}>{kycReport?.status || "Pending"}</div>
      </div>
    </div>
  </div>
) :
                 activeTab === 'Dynamic' ? (
                    <div className="report-card">
                      <h2 className="report-title">Orchestrator Agent Report</h2>
                      <div className="report-table">
                        {/* <div className="report-row"><div className="report-label">Applicant ID</div><div className="report-value">{orchReport?.ApplicantID || appData?.id}</div></div> */}
                        {/* <div className="report-row"><div className="report-label">Decision</div><div className={`report-value ${orchReport?.Decision === 'APPROVE' ? 'status-review' : 'status-fraud'}`}>{orchReport?.Decision || "PENDING"}</div></div> */}
                        {orchReport?.AgentStatus && Object.entries(orchReport.AgentStatus).map(([agent, status]) => (
                             <div className="report-row" key={agent}><div className="report-label">{agent} Agent</div><div className="report-value status-completed">{status}</div></div>
                        ))}
                              <div className="report-row"><div className="report-label">Composite Score</div><div className="report-value">{orchReport?.CompositeScore ?? "0.0"}</div></div>
                        <div className="report-row"><div className="report-label">Reasoning</div><div className="report-value">{orchReport?.Reason || "N/A"}</div></div>
                      </div>
                    </div>
                  ) :
                  activeTab === 'DelegationAgent' ? (
                    <div className="report-card">
                      <h2 className="report-title" style={{ display: 'flex', alignItems: 'center' }}>
                        Device Fingerprint Agent Report
                      </h2>
                      <div className="report-table">
                        <div className="report-row"><div className="report-label">Flag(s)</div><div className="report-value">{dexReport?.risk_assessment?.flags || "No Flags"}</div></div>
                        <div className="report-row"><div className="report-label">Risk Score</div><div className="report-value">{dexReport?.risk_assessment?.score || "0.0"}</div></div>
                        <div className="report-row"><div className="report-label">Reasoning</div><div className="report-value">{dexReport?.risk_assessment?.reasoning || "N/A"}</div></div>
                        <div className="report-row"><div className="report-label">Risk Level</div><div className={`report-value ${dexReport?.risk_assessment?.level === 'SAFE' ? 'status-review' : 'status-fraud'}`}>{dexReport?.risk_assessment?.level || "N/A"}
                          <div
                            className="tooltip-wrapper"
                            onMouseEnter={() => setIsDEXTooltipOpen(true)}
                            onMouseLeave={() => setIsDEXTooltipOpen(false)}
                            style={{ display: 'inline-block', marginLeft: '8px', verticalAlign: 'middle' }}
                          >
                            <img
                              src={ExlaimIcon}
                              className='exclamation-icon'
                              alt="Exclamation Icon"
                              style={{ cursor: 'pointer', display: 'inline-block' }}
                            />
                            {isDEXTooltipOpen && <DEXAgentTooltip />}
                          </div>
                        </div></div>
                      </div>
                    </div>
                  ) : activeTab === 'Graph' ? (
                    <div className="report-card">
                      <h2 className="report-title" style={{ display: 'flex', alignItems: 'center' }}>
                        Fraud Ring Agent Report
                      </h2>
                      <div className="report-table">
                        {/* <div className="report-row"><div className="report-label">Applicant ID</div><div className="report-value">{graphReport?.ApplicantID}</div></div> */}
                        <div className="report-row"><div className="report-label">Fraud Score</div><div className="report-value">{graphReport?.score}/100</div></div>
                        <div className="report-row"><div className="report-label">Confidence Interval</div><div className="report-value">{graphReport?.confidence_interval}</div></div>
                        <div className="report-row"><div className="report-label">Risk Level</div><div className={`report-value ${graphReport?.risk_level === 'MEDIUM' ? 'status-review' : 'status-fraud'}`}>{graphReport?.risk_level}
                          <div
                            className="tooltip-wrapper"
                            onMouseEnter={() => setIsFraudTooltipOpen(true)}
                            onMouseLeave={() => setIsFraudTooltipOpen(false)}
                            style={{ display: 'inline-block', marginLeft: '8px', verticalAlign: 'middle' }}
                          >
                            <img
                              src={ExlaimIcon}
                              className='exclamation-icon'
                              alt="Exclamation Icon"
                              style={{ cursor: 'pointer', display: 'inline-block' }}
                            />
                            {isFraudTooltipOpen && <FraudRingTooltip />}
                          </div>
                        </div></div>
                        <div className="report-row"><div className="report-label">Reasoning</div><div className="report-value">{graphReport?.Reasoning}</div></div>
                      </div>
                    </div>
                  ) : activeTab === 'Behavioural' ? (
                    <div className="report-card">
                      {/* <h2 className="report-title">Behavioral Agent Report <img src={ExlaimIcon} className='exclamation-icon' alt="Exclamation Icon" onClick={() => setIsTooltipOpen(!isTooltipOpen)}/></h2> */}
                     <h2 className="report-title" style={{ display: 'flex', alignItems: 'center' }}>
  Behavioral Agent Report 
</h2>
                      <div className="report-table">
                        <div className="report-row"><div className="report-label">Typing Velocity</div><div className="report-value">{apiData?.behavioral?.typingVelocity || "N/A"}</div></div>
                         <div className="report-row"><div className="report-label">Input Consistency</div><div className="report-value">{apiData?.behavioral?.inputConsistency || "N/A"}</div></div>
                          <div className="report-row">
        <div className="report-label">Reasoning</div>
        <div className="report-value">
          {renderBehavioralReasoning(apiData?.behavioral?.reasoning).map((line, idx) => (
            <div key={idx} style={{ marginBottom: '4px' }}>{line}</div>
          ))}
        </div>
      </div>
                        <div className="report-row"><div className="report-label">Risk Score</div><div className="report-value status-review">{apiData?.behavioral?.riskScore || "N/A"}
                          <div 
                            className="tooltip-wrapper" 
                            onMouseEnter={() => setIsTooltipOpen(true)}
                            onMouseLeave={() => setIsTooltipOpen(false)}
                            style={{ display: 'inline-block', marginLeft: '8px', verticalAlign: 'middle' }}
                          >
                            <img 
                              src={ExlaimIcon} 
                              className='exclamation-icon' 
                              alt="Exclamation Icon" 
                              style={{ cursor: 'pointer', display: 'inline-block' }}
                            />
                            {/* The tooltip component */}
                            {isTooltipOpen && <BehaviouralTooltip />}
                          </div>
                        </div></div>
                      </div>
                    </div>
                  ) : 
                  (
                    <>
                      <div className="report-card">
  <h2 className="report-title" style={{ display: 'flex', alignItems: 'center' }}>
    KYC Agent Report
  </h2>
  <div className="report-table">
    <div className="report-row">
      <div className="report-label">2FA Check</div>
      <div className="report-value status-success">{addressReport?.["2fa_check"]}</div>
    </div>

    {/* Risk Level */}
    <div className="report-row">
      <div className="report-label">Risk Level</div>
      <div className="report-value">{kycReport?.risk_level}</div>
    </div>
    <div className="report-row">
      <div className="report-label">Summary</div>
      <div className="report-value">{addressReport?.summary}</div>
    </div>
        {/* Risk Status */}
    <div className="report-row">
      <div className="report-label">Status</div>
      <div className={`report-value kyc-status-${kycReport?.status?.toLowerCase()}`}>{kycReport?.status}
        <div
          className="tooltip-wrapper"
          onMouseEnter={() => setIsKYCTooltipOpen(true)}
          onMouseLeave={() => setIsKYCTooltipOpen(false)}
          style={{ display: 'inline-block', marginLeft: '8px', verticalAlign: 'middle' }}
        >
          <img
            src={ExlaimIcon}
            className='exclamation-icon'
            alt="Exclamation Icon"
            style={{ cursor: 'pointer', display: 'inline-block' }}
          />
          {isKYCTooltipOpen && <KYCAgentTooltip />}
        </div>
      </div>
    </div>
  </div>
</div>
                    </>
                  )}
                </>
              )}
             {(activeTab !== 'Behavioural' && activeTab !== 'FinalVerdict') && (
  <div className="process-stream" onClick={() => setIsStreamOpen(true)}>
    Click to View Process Stream
  </div>
)}
            </main>
          </div>
          {/* Approve button for Final Verdict tab when Decision is rejected, INSIDE modal-content */}
          {activeTab === 'FinalVerdict' && kycReport?.status?.toLowerCase() === 'rejected' && (
            <div className='action-buttons' style={{ position: 'absolute', bottom: 7, right: 28, zIndex: 10 }}>
              <button
                className={`approve-btn${approveSuccess ? ' approve-btn-disabled' : ''}`}
                disabled={approveSuccess}
                onClick={() => {
                  if (!approveSuccess) setShowApproveConfirm(true);
                }}
                style={approveSuccess ? { background: '#eee', color: '#888', cursor: 'not-allowed' } : {}}
              >{approveSuccess ? 'Approved' : 'Approve'}</button>
            </div>
          )}
        </div>
      </div>
      <ConfirmApproveModal
        isOpen={showApproveConfirm}
        onConfirm={() => { setApproveSuccess(true); setShowApproveConfirm(false); }}
        onCancel={() => setShowApproveConfirm(false)}
        applicantId={appData?.id}
        approved={approveSuccess}
      />
      <ProcessStreamModal isOpen={isStreamOpen} onClose={() => setIsStreamOpen(false)} applicantId={appData?.id} logs={logs} explainableAI={explainableAI} agentName={activeAgent.name} agentIcon={activeAgent.icon} />
    </>
  );
};

export default ApplicationReviewModal;