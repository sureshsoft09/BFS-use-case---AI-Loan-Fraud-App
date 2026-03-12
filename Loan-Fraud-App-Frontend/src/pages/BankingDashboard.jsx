
import React, { useState, useEffect, useCallback } from 'react';
import './BankingDashboard.css';
import { AZURE_CONFIG } from '../azure-config';

// ─── Constants ────────────────────────────────────────────────────────────────

const API = AZURE_CONFIG.API_BASE_URL;

const AGENT_LABELS = {
  lfa_behavioural_agent: 'Behavioural Agent',
  lfa_device_fingerprint_agent: 'Device Fingerprint Agent',
  lfa_fraud_ring_agent: 'Fraud Ring Agent',
  lfa_kyc_agent: 'KYC Agent',
};

const STATUS_LABELS = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  manual_review: 'Manual Review',
  approved: 'Approved',
  rejected: 'Rejected',
};

const FILTER_OPTIONS = [
  { key: 'all', label: 'All Applications' },
  { key: 'manual_review', label: 'Needs Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'submitted', label: 'Submitted' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function riskColor(score) {
  if (score == null) return '';
  if (score >= 70) return 'risk-high';
  if (score >= 40) return 'risk-medium';
  return 'risk-low';
}

function riskLabel(score) {
  if (score == null) return 'N/A';
  if (score >= 70) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatCurrency(amount) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(amount);
}

function applicantName(app) {
  const p = app?.applicant_info || {};
  return [p.first_name, p.last_name].filter(Boolean).join(' ') || app?.loan_app_id || '—';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  return (
    <span className={`status-badge status-${status || 'draft'}`}>
      {STATUS_LABELS[status] || status || 'Unknown'}
    </span>
  );
}

function RiskPill({ score }) {
  if (score == null) return <span className="risk-pill risk-unknown">—</span>;
  return (
    <span className={`risk-pill ${riskColor(score)}`}>
      {Math.round(score)} — {riskLabel(score)}
    </span>
  );
}

function RiskGauge({ score }) {
  const pct = Math.min(100, Math.max(0, score ?? 0));
  const color = pct >= 70 ? '#e53e3e' : pct >= 40 ? '#dd6b20' : '#38a169';
  return (
    <div className="risk-gauge-wrap">
      <div className="risk-gauge-bar">
        <div className="risk-gauge-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="risk-gauge-labels">
        <span style={{ color }}>
          {Math.round(pct)} / 100 — {riskLabel(pct)} Risk
        </span>
      </div>
    </div>
  );
}

function AgentCard({ agentKey, data }) {
  const label = AGENT_LABELS[agentKey] || agentKey;
  const score = data?.risk_score ?? data?.score;
  const recommendation = data?.recommendation || data?.status || '—';
  const findings = data?.key_findings || data?.findings || [];
  const issues = data?.critical_issues || [];
  const summary = data?.summary || data?.analysis_summary || data?.comments || '';

  return (
    <div className={`agent-card ${score != null ? riskColor(score) : ''}`}>
      <div className="agent-card-header">
        <span className="agent-card-title">{label}</span>
        {score != null && <RiskPill score={score} />}
      </div>
      <div className="agent-card-rec">{recommendation}</div>
      {summary && <p className="agent-card-summary">{summary}</p>}
      {findings.length > 0 && (
        <ul className="agent-card-findings">
          {findings.slice(0, 5).map((f, i) => <li key={i}>{f}</li>)}
        </ul>
      )}
      {issues.length > 0 && (
        <div className="agent-card-issues">
          {issues.slice(0, 3).map((issue, i) => (
            <span key={i} className="issue-tag">{issue}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewModal({ app, onClose, onSubmit, submitting }) {
  const [decision, setDecision] = useState('');
  const [comment, setComment] = useState('');
  const [reviewerName, setReviewerName] = useState('');

  const canSubmit = decision && comment.trim().length >= 5;

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({ decision, comments: comment.trim(), reviewer_name: reviewerName.trim() || undefined });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="review-modal" onClick={e => e.stopPropagation()}>
        <div className="review-modal-header">
          <h2>Review Application</h2>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="review-modal-app-info">
          <div><span className="info-label">Applicant</span><span>{applicantName(app)}</span></div>
          <div><span className="info-label">Loan ID</span><span className="mono">{app?.loan_app_id}</span></div>
          <div><span className="info-label">Amount</span><span>{formatCurrency(app?.loan_details?.loan_amount)}</span></div>
          <div>
            <span className="info-label">Risk Score</span>
            <RiskPill score={app?.fraud_analysis?.overall_risk_score} />
          </div>
        </div>

        {app?.fraud_analysis?.overall_recommendation && (
          <div className="review-modal-recommendation">
            <span className="info-label">Agent Recommendation: </span>
            <strong>{app.fraud_analysis.overall_recommendation}</strong>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="review-decision-row">
            <button
              type="button"
              className={`decision-btn approve-btn ${decision === 'approved' ? 'selected' : ''}`}
              onClick={() => setDecision('approved')}
            >
              ✓ Approve
            </button>
            <button
              type="button"
              className={`decision-btn reject-btn ${decision === 'rejected' ? 'selected' : ''}`}
              onClick={() => setDecision('rejected')}
            >
              ✗ Reject
            </button>
          </div>

          <label className="review-label">
            Reviewer Name <span className="optional">(optional)</span>
            <input
              className="review-input"
              value={reviewerName}
              onChange={e => setReviewerName(e.target.value)}
              placeholder="Your name"
            />
          </label>

          <label className="review-label">
            Comments <span className="required">*</span>
            <textarea
              className="review-textarea"
              rows={4}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Provide justification for your decision…"
              required
            />
          </label>

          <div className="review-modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className={`btn-primary ${decision === 'rejected' ? 'btn-danger' : ''}`}
            >
              {submitting ? 'Submitting…' : decision === 'approved' ? 'Approve Application' : decision === 'rejected' ? 'Reject Application' : 'Select a Decision'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ApplicationDetailModal({ app, detailLoading, onReview, onClose }) {
  const analysis = app?.fraud_analysis || {};
  const agentResults = analysis.agent_results || {};
  const managerReview = app?.manager_review;
  const canReview = app?.status === 'manual_review';
  const info = app?.applicant_info || {};

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="detail-modal" onClick={e => e.stopPropagation()}>
        {detailLoading ? (
          <div className="detail-modal-loading">
            <div className="loading-dots"><span /><span /><span /></div>
            <p>Loading application details…</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="detail-header">
              <div className="detail-header-left">
                <div className="detail-title-row">
                  <h2 className="detail-title">{applicantName(app)}</h2>
                  <StatusBadge status={app?.status} />
                </div>
                <span className="mono detail-id">{app?.loan_app_id}</span>
              </div>
              <button className="detail-close-btn" onClick={onClose} aria-label="Close">✕</button>
            </div>

            {/* Scrollable body */}
            <div className="detail-body">

              {/* KPI row */}
              <div className="detail-kpi-row">
                <div className="kpi-card">
                  <span className="kpi-label">Loan Amount</span>
                  <span className="kpi-value">{formatCurrency(app?.loan_details?.loan_amount)}</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Risk Score</span>
                  <span className={`kpi-value ${riskColor(analysis.overall_risk_score)}`}>
                    {analysis.overall_risk_score != null ? `${Math.round(analysis.overall_risk_score)}/100` : '—'}
                  </span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Loan Term</span>
                  <span className="kpi-value">
                    {app?.loan_details?.loan_term_months ? `${app.loan_details.loan_term_months} mo` : '—'}
                  </span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Submitted</span>
                  <span className="kpi-value kpi-date">{formatDate(app?.submitted_at || app?.created_at)}</span>
                </div>
              </div>

              {/* Two-column: applicant + loan */}
              <div className="detail-cols">
                <div className="detail-col">
                  <h3 className="section-title">Applicant Information</h3>
                  <dl className="info-list">
                    <dt>Full Name</dt><dd>{applicantName(app)}</dd>
                    <dt>Email</dt><dd>{info.email || '—'}</dd>
                    <dt>Phone</dt><dd>{info.phone || '—'}</dd>
                    <dt>Date of Birth</dt><dd>{info.date_of_birth || '—'}</dd>
                    <dt>Address</dt>
                    <dd>{[info.address_line1, info.address_line2, info.city, info.state, info.zip_code].filter(Boolean).join(', ') || '—'}</dd>
                  </dl>
                </div>
                <div className="detail-col">
                  <h3 className="section-title">Loan Details</h3>
                  <dl className="info-list">
                    <dt>Purpose</dt><dd>{app?.loan_details?.loan_purpose || '—'}</dd>
                    <dt>Employment</dt><dd>{app?.loan_details?.employment_status || '—'}</dd>
                    <dt>Annual Income</dt><dd>{formatCurrency(app?.loan_details?.annual_income)}</dd>
                    <dt>Employer</dt><dd>{app?.loan_details?.employer_name || '—'}</dd>
                    <dt>Years Employed</dt><dd>{app?.loan_details?.years_employed ?? '—'}</dd>
                  </dl>
                </div>
              </div>

              {/* Risk assessment */}
              {analysis.overall_risk_score != null && (
                <div className="detail-section">
                  <h3 className="section-title">Risk Assessment</h3>
                  <RiskGauge score={analysis.overall_risk_score} />
                  {analysis.overall_recommendation && (
                    <p className="overall-rec"><strong>Recommendation:</strong> {analysis.overall_recommendation}</p>
                  )}
                  {analysis.summary && <p className="overall-summary">{analysis.summary}</p>}
                </div>
              )}

              {/* Agent cards */}
              {Object.keys(agentResults).length > 0 && (
                <div className="detail-section">
                  <h3 className="section-title">Agent Analysis</h3>
                  <div className="agent-cards-grid">
                    {Object.entries(agentResults).map(([key, data]) => (
                      <AgentCard key={key} agentKey={key} data={data} />
                    ))}
                  </div>
                </div>
              )}

              {/* Flags */}
              {(analysis.critical_issues?.length > 0 || analysis.warnings?.length > 0) && (
                <div className="detail-section detail-flags-section">
                  {analysis.critical_issues?.length > 0 && (
                    <div className="flags-group">
                      <h4 className="flags-title flags-critical">⚠ Critical Issues</h4>
                      <ul>{analysis.critical_issues.map((issue, idx) => <li key={idx}>{issue}</li>)}</ul>
                    </div>
                  )}
                  {analysis.warnings?.length > 0 && (
                    <div className="flags-group">
                      <h4 className="flags-title flags-warning">⚡ Warnings</h4>
                      <ul>{analysis.warnings.map((w, idx) => <li key={idx}>{w}</li>)}</ul>
                    </div>
                  )}
                </div>
              )}

              {/* Manager decision */}
              {managerReview && (
                <div className="detail-section detail-review-record">
                  <h3 className="section-title">Manager Decision</h3>
                  <div className="review-record-body">
                    <div><span className="info-label">Decision</span><StatusBadge status={managerReview.decision} /></div>
                    <div><span className="info-label">Reviewer</span><span>{managerReview.reviewer_name}</span></div>
                    <div><span className="info-label">Date</span><span>{formatDate(managerReview.reviewed_at)}</span></div>
                    <div className="review-record-comments">
                      <span className="info-label">Comments</span>
                      <p>{managerReview.comments}</p>
                    </div>
                  </div>
                </div>
              )}

            </div>{/* end detail-body */}

            {/* Footer */}
            <div className="detail-modal-footer">
              <button className="btn-secondary" onClick={onClose}>Close</button>
              {canReview && (
                <button className="btn-primary" onClick={onReview}>
                  Review This Application
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const BankingDashboard = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedApp, setSelectedApp] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API}/api/loans`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setApplications(Array.isArray(data) ? data : data?.applications || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const openDetail = async (app) => {
    // If fraud_analysis might be missing, fetch the full record
    if (!app.fraud_analysis && app.loan_app_id) {
      setDetailLoading(true);
      setSelectedApp(app);   // show panel immediately with basic info
      try {
        const res = await fetch(`${API}/api/loans/${app.loan_app_id}`);
        if (res.ok) {
          const full = await res.json();
          setSelectedApp(full);
        }
      } catch (_) { /* keep basic info */ } finally {
        setDetailLoading(false);
      }
    } else {
      setSelectedApp(app);
    }
  };

  const handleReviewSubmit = async ({ decision, comments, reviewer_name }) => {
    if (!selectedApp) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/loans/${selectedApp.loan_app_id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, comments, reviewer_name }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error ${res.status}`);
      }
      const updated = await res.json();
      showToast(`Application ${decision} successfully.`);
      setReviewModalOpen(false);
      // Refresh list and update selected app status
      await fetchApplications();
      setSelectedApp(prev => prev ? {
        ...prev,
        status: updated.status,
        manager_review: updated.manager_review,
      } : null);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Derived data
  const filtered = activeFilter === 'all'
    ? applications
    : applications.filter(a => a.status === activeFilter);

  const stats = {
    total: applications.length,
    needs_review: applications.filter(a => a.status === 'manual_review').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  // ── Render
  return (
    <div className="manager-dashboard">

      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
      )}

      {/* Page header */}
      <div className="dashboard-header">
        <div className="dashboard-header-text">
          <h1 className="dashboard-title">Loan Applications</h1>
          <p className="dashboard-subtitle">Review fraud-analysed applications and make approval decisions</p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="stats-bar">
        <div className="stat-card" onClick={() => setActiveFilter('all')}>
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Total Applications</span>
        </div>
        <div className="stat-card stat-review" onClick={() => setActiveFilter('manual_review')}>
          <span className="stat-value">{stats.needs_review}</span>
          <span className="stat-label">Needs Review</span>
        </div>
        <div className="stat-card stat-approved" onClick={() => setActiveFilter('approved')}>
          <span className="stat-value">{stats.approved}</span>
          <span className="stat-label">Approved</span>
        </div>
        <div className="stat-card stat-rejected" onClick={() => setActiveFilter('rejected')}>
          <span className="stat-value">{stats.rejected}</span>
          <span className="stat-label">Rejected</span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="filter-tabs">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.key}
            className={`filter-tab ${activeFilter === opt.key ? 'active' : ''}`}
            onClick={() => setActiveFilter(opt.key)}
          >
            {opt.label}
            {opt.key !== 'all' && (
              <span className="filter-count">
                {applications.filter(a => a.status === opt.key).length}
              </span>
            )}
          </button>
        ))}
        <button className="refresh-btn" onClick={fetchApplications} disabled={loading} title="Refresh">
          {loading ? '⟳' : '↻'}
        </button>
      </div>

      {/* Main content area */}
      <div className="dashboard-body">

        {/* Applications table */}
        <div className="table-pane">
          {error && (
            <div className="error-banner">
              Failed to load applications: {error}
              <button onClick={fetchApplications}>Retry</button>
            </div>
          )}

          {loading && applications.length === 0 ? (
            <div className="loading-state">Loading applications…</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              {activeFilter === 'all' ? 'No applications found.' : `No ${STATUS_LABELS[activeFilter] || activeFilter} applications.`}
            </div>
          ) : (
            <table className="applications-table">
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Loan ID</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Risk Score</th>
                  <th>Submitted</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(app => {
                  const isSelected = selectedApp?.loan_app_id === app.loan_app_id;
                  const score = app?.fraud_analysis?.overall_risk_score;
                  return (
                    <tr
                      key={app.loan_app_id}
                      className={`app-row ${isSelected ? 'selected' : ''}`}
                      onClick={() => openDetail(app)}
                    >
                      <td className="applicant-cell">{applicantName(app)}</td>
                      <td className="mono id-cell">{app.loan_app_id?.slice(0, 12)}…</td>
                      <td>{formatCurrency(app?.loan_details?.loan_amount)}</td>
                      <td><StatusBadge status={app.status} /></td>
                      <td><RiskPill score={score} /></td>
                      <td>{formatDate(app.submitted_at || app.created_at)}</td>
                      <td>
                        {app.status === 'manual_review' ? (
                          <button
                            className="btn-review"
                            onClick={e => { e.stopPropagation(); openDetail(app); }}
                          >
                            Review
                          </button>
                        ) : (
                          <button className="btn-view" onClick={e => { e.stopPropagation(); openDetail(app); }}>
                            View
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Application detail popup */}
      {selectedApp && (
        <ApplicationDetailModal
          app={selectedApp}
          detailLoading={detailLoading}
          onReview={() => setReviewModalOpen(true)}
          onClose={() => setSelectedApp(null)}
        />
      )}

      {/* Review modal */}
      {reviewModalOpen && selectedApp && (
        <ReviewModal
          app={selectedApp}
          onClose={() => setReviewModalOpen(false)}
          onSubmit={handleReviewSubmit}
          submitting={submitting}
        />
      )}
    </div>
  );
};

export default BankingDashboard;
