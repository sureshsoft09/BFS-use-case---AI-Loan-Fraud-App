import React, { useState, useEffect, useMemo, useRef } from 'react';
import './Dashboard.css'; 
import EyeReviewIcon from '../assets/eye-review.png';
import Reload from '../assets/Reload.png';
import ApplicationReviewModal from './ApplicationReviewModal';
import GraphModal from './GraphModal';

const DashboardSkeleton = () => {
  return (
    <div className="dashboard-container-main">
      {/* 1. Header Skeleton */}
      <header className="dashboard-header">
        <div className="header-text">
          <div className="skeleton-box" style={{ width: '350px', height: '35px', marginBottom: '10px' }}></div>
          <div className="skeleton-box" style={{ width: '500px', height: '18px' }}></div>
        </div>
      </header>

      {/* 2. Stats Grid Skeleton (4 cards) */}
      <section className="stats-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="stat-card" style={{ border: 'none', background: '#f9f9f9' }}>
            <div className="skeleton-box" style={{ width: '40%', height: '30px', marginBottom: '12px' }}></div>
            <div className="skeleton-box" style={{ width: '80%', height: '14px' }}></div>
          </div>
        ))}
      </section>

      {/* 3. Controls Skeleton */}
      <section className="table-controls-section">
        <div className="table-header-info">
          <div className="skeleton-box" style={{ width: '200px', height: '24px', marginBottom: '8px' }}></div>
          <div className="skeleton-box" style={{ width: '350px', height: '14px' }}></div>
        </div>
        <div className="filter-bar">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton-box" style={{ width: '120px', height: '38px', borderRadius: '8px' }}></div>
          ))}
        </div>
      </section>

      {/* 4. Table Skeleton */}
      <div className="applications-table-container">
        <div className="dashboard-table" style={{ background: 'white', borderRadius: '8px', padding: '15px' }}>
          {/* Header Row */}
          <div className="skeleton-box" style={{ width: '100%', height: '40px', marginBottom: '15px', opacity: '0.7' }}></div>
          
          {/* Data Rows */}
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ display: 'flex', gap: '15px', marginBottom: '12px' }}>
               <div className="skeleton-box" style={{ flex: 1, height: '45px' }}></div>
               <div className="skeleton-box" style={{ flex: 2, height: '45px' }}></div>
               <div className="skeleton-box" style={{ flex: 1, height: '45px' }}></div>
               <div className="skeleton-box" style={{ flex: 1, height: '45px' }}></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ApplicationTable = ({ applications }) => {
  const [showModal, setShowModal] = useState(false);
  const [activeApp, setActiveApp] = useState(null);

  const handleReviewClick = (app) => {
    setActiveApp(app);
    setShowModal(true);
  };

  return (
    <div className="applications-table-container">
      <table className="dashboard-table">
        <thead>
          <tr className="thead-light">
            <th>Application ID</th>
            <th>Applicant</th>
            <th>Loan Type</th>
            <th>Amount</th>
            <th>Credit Score</th>
            <th>Risk Level</th>
            <th>Status</th>
            <th>Date</th>
            <th>Review</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((app, index) => (
            <tr key={app.id || `app-${index}`}>
              <td className='app-id'>{app.id || 'N/A'}</td>
              <td>{app.applicant || 'Unknown'}</td>
              <td>{app.loanType || 'N/A'}</td>
              <td>
                {app.amount
                  ? app.amount.toLocaleString('en-US', { 
                      style: 'currency', 
                      currency: 'USD', 
                      minimumFractionDigits: 0 
                    })
                  : '$0'}
              </td>
              <td>{app.creditScore || '-'}</td>
              <td>{app.riskLevel || 'Not Rated'}</td>
              <td>
                <span className={`status-badge status-${(app.status || 'pending').toLowerCase().replace(' ', '-')}`}>
                  {app.status || 'Pending'}
                </span>
              </td>
              <td>{app.date || 'N/A'}</td>
             <td className="review-cell">
  <span className="review-icon"> {/* Restored this wrapper */}
    <img 
      src={EyeReviewIcon} 
      className='eye' 
      alt="review" 
      onClick={() => handleReviewClick(app)} 
      style={{ cursor: 'pointer' }}
    />
  </span>
</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* FIXED: Modal moved outside the loop to prevent multiple API triggers */}
      <ApplicationReviewModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        appData={activeApp}
      />
    </div>
  );
};

const StatisticCard = ({ title, value, colorClass, onClick}) => (
  <div className={`stat-card ${colorClass}`} onClick={onClick} style={{ cursor: 'pointer' }}>
    <p className="stat-value">{value}</p>
    <p className="stat-title">{title}</p>
  </div>
);

const CheckboxDropdown = ({ label, options, selectedValues, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const handleCheckboxChange = (option) => {
    const isSelected = selectedValues.includes(option);
    let newSelected;
    
    if (option === `All ${label}`) {
      newSelected = [option];
    } else {
      const filtered = selectedValues.filter(v => v !== `All ${label}`);
      newSelected = isSelected 
        ? filtered.filter(v => v !== option) 
        : [...filtered, option];
      
      if (newSelected.length === 0) newSelected = [`All ${label}`];
    }
    onChange(newSelected);
  };

  return (
    <div className="custom-checkbox-dropdown" ref={dropdownRef}>
      <div 
        className={`dropdown-header ${selectedValues[0] !== `All ${label}` ? 'active-filter' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedValues.length > 1 ? `${label} (${selectedValues.length})` : selectedValues[0]}
      </div>
      
      {isOpen && (
        <div className="dropdown-list">
          {options.map((option) => (
            <label key={option} className="dropdown-item">
              <input
                className="checkbox-box"
                type="checkbox"
                checked={selectedValues.includes(option)}
                onChange={() => handleCheckboxChange(option)}
              />
              <span className="checkbox-custom"></span>
              {option}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

const Dashboard = () => {
  const [applications, setApplications] = useState([]);
  const [statusFilter, setStatusFilter] = useState(['All Status']);
  const [riskFilter, setRiskFilter] = useState(['All Risk']);
  const [loanFilter, setLoanFilter] = useState('All Loan');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Store all graph data by status
  const [allGraphData, setAllGraphData] = useState({ Total: [], Pending: [], Approved: [], Rejected: [] });
  const [showGraphModal, setShowGraphModal] = useState(false);
  const [graphStatus, setGraphStatus] = useState('Total'); // NEW

  // Set graphData from allGraphData
  const graphData = allGraphData[graphStatus] || [];

  const handleCardClick = (status) => {
    setGraphStatus(status); // NEW
    setShowGraphModal(true);
    if (status === 'Total') {
      setStatusFilter(['All Status']);
    } else {
      setStatusFilter([status]);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Dashboard data always fetched
        const dashboardRes = await fetch('https://xqbtl1s9l0.execute-api.us-west-2.amazonaws.com/prod/dashboard');
        if (!dashboardRes.ok) throw new Error('Dashboard API failed');
        const rawDashboardData = await dashboardRes.json();
        const normalizedData = rawDashboardData.map(app => ({
          id: app.ApplicationID,
          loanType: app.LoanType,
          amount: parseFloat(app.Amount),
          date: app.Date,
          applicant: app.Applicant || 'Unknown',
          status: app.Status || 'Pending',
          creditScore: app.CreditScore || 'N/A',
          riskLevel: app.RiskLevel || 'Pending Review'
        }));
        setApplications(normalizedData);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch all graphs on mount
  useEffect(() => {
    const fetchAllGraphs = async () => {
      try {
        const statuses = ['Total', 'Pending', 'Approved', 'Rejected'];
        const fetches = statuses.map(status => {
          if (status === 'Total') {
            return fetch('https://b90fu93ryc.execute-api.us-west-2.amazonaws.com/DashboardGraph/DashboardGraph', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ test: 'trigger' })
            }).then(res => res.ok ? res.json() : []);
          } else {
            return fetch('https://b90fu93ryc.execute-api.us-west-2.amazonaws.com/DashboardGraph/DashboardGraph', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ kyc_status: status })
            }).then(res => res.ok ? res.json() : []);
          }
        });
        const results = await Promise.all(fetches);
        setAllGraphData({
          Total: results[0],
          Pending: results[1],
          Approved: results[2],
          Rejected: results[3],
        });
      } catch {
        setAllGraphData({ Total: [], Pending: [], Approved: [], Rejected: [] });
      }
    };
    fetchAllGraphs();
  }, []);

  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      const statusMatch = statusFilter.includes('All Status') || statusFilter.includes(app.status);
      const riskMatch = riskFilter.includes('All Risk') || riskFilter.includes(app.riskLevel);
      const loanMatch = loanFilter === 'All Loan' || app.loanType.includes(loanFilter);
      return statusMatch && riskMatch && loanMatch;
    });
  }, [applications, statusFilter, riskFilter, loanFilter]);

  const stats = useMemo(() => ({
    total: applications.length,
    pending: applications.filter(app => app.status === 'Pending').length,
    approved: applications.filter(app => app.status === 'Approved').length,
    rejected: applications.filter(app => app.status === 'Rejected').length,
  }), [applications]);

  // if (loading) return <div className="loading">Loading Dashboard...</div>;
  if (loading) return <DashboardSkeleton />;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="dashboard-container-main">
      <header className="dashboard-header">
        <div className="header-text">
            <h1>Loan Application Dashboard</h1>
            <p>Monitor and manage all loan applications with AI-powered fraud detection</p>
        </div>
        <button className="refresh-btn" onClick={() => window.location.reload()}>
            <img src={Reload} alt="Refresh" />
        </button>
      </header>

      <GraphModal 
        isOpen={showGraphModal} 
        onClose={() => setShowGraphModal(false)} 
        data={graphData} 
        status={graphStatus}
      />

      <section className="stats-grid">
        <StatisticCard title="Total Applications" value={stats.total} colorClass="total-card"  onClick={() => handleCardClick('Total')}/>
        <StatisticCard title="Pending" value={stats.pending} colorClass="pending-card"  onClick={() => handleCardClick('Pending')}/>
        <StatisticCard title="Approved" value={stats.approved} colorClass="approved-card" onClick={() => handleCardClick('Approved')}/>
        <StatisticCard title="Rejected" value={stats.rejected} colorClass="rejected-card" onClick={() => handleCardClick('Rejected')}/>
      </section>

      <section className="table-controls-section">
        <div className="table-header-info">
            <h2>Total Applications</h2>
            <p>Applications with medium or high risk are auto flagged for review</p>
        </div>
        <div className="filter-bar">
          <CheckboxDropdown 
            label="Status"
            options={['Pending', 'Approved', 'Rejected', 'Escalated']}
            selectedValues={statusFilter}
            onChange={setStatusFilter}
          />
          <CheckboxDropdown 
            label="Risk"
            options={['Low', 'Medium', 'High', 'Critical']}
            selectedValues={riskFilter}
            onChange={setRiskFilter}
          />
          <select className={loanFilter !== "All Loan" ? "active-filter" : ""}
            value={loanFilter} onChange={(e) => setLoanFilter(e.target.value)}>
              <option>All Loan</option>
              <option>Personal</option>
              <option>Business</option>
          </select>
          <select>
            <option>Last 7 Days</option>
            <option>Last 14 Days</option>
            <option>Last 30 Days</option>
          </select>
        </div>
      </section>

      <ApplicationTable applications={filteredApplications} />
    </div>
  );
};

export default Dashboard;