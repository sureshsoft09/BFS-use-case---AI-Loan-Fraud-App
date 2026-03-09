import React, { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import "./SArNarrative.css"; 

const CopyIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#000048"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-copy"
  >
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);
const DownloadIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#000048"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-download"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </svg>
);
const RefreshIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#000048"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-rotate-cw"
  >
    <path d="M21 12a9 9 0 1 1-9-9c2.3 0 4.2 1.3 5.4 3.1" />
    <path d="M17.6 6v3.4h3.4" />
  </svg>
);

// Utility function to get the appropriate color class and blinking style
const getRiskStyles = (riskLevel) => {
  const lowerCaseLevel = riskLevel ? riskLevel.toLowerCase().trim() : '';

  // Use if/else if structure with includes() for more flexible matching
  if (lowerCaseLevel.includes('low risk')) {
    return {
      style: { color: 'green', fontWeight: 'bold', fontSize: '16px' },
      className: 'risk-low risk-blink',
    };
  } else if (lowerCaseLevel.includes('medium risk')) {
    return {
      style: { color: 'orange', fontWeight: 'bold', fontSize: '16px' },
      className: 'risk-medium risk-blink',
    };
  } else if (lowerCaseLevel.includes('high risk')) {
    // This will now match "high risk", "high risk - fraud", "high risk (critical)", etc.
    return {
      style: { color: 'red', fontWeight: 'bold', fontSize: '16px' },
      className: 'risk-high risk-blink',
    };
    
  }
  else if (lowerCaseLevel.includes('valid')) {
    return {
      style: { color: 'green', fontWeight: 'bold', fontSize: '16px' },
      className: 'risk-low risk-blink',
    };}
     else if (lowerCaseLevel.includes('critical risk') || lowerCaseLevel.includes('urgent risk')) {
    // Handle specific "critical" or "urgent" cases
    return {
      style: { color: 'red', fontWeight: 'bold' },
      className: 'risk-blink risk-high',
    };
  } else {
    // Default case for unknown risk levels or null/empty input
    return {}; // Return empty object for default/no styles
  }
};

// ⭐ NEW COMPONENT: AddressVerificationTable
const AddressVerificationTable = ({ data }) => {
  if (!data) return null;

  // Map the data keys to the desired display names
  const reportItems = [
    { label: 'Verification_status', value: data.verification_status },
    { label: 'Application_ID', value: data.application_ID },
    { label: 'Name_of_applicant', value: data.name_of_applicant },
    { label: 'Summary', value: data.summary_in_one_line || data.summary }, // Use one_line or summary
  ];

  return (
    <div className="address-verification-report">
      <table className="validation-table">
        <thead>
          <tr>
            <th colSpan="2" className="table-header">
              Address Verification Report
            </th>
          </tr>
        </thead>
        <tbody>
          {reportItems.map((item, index) => (
            // Only render rows that have a value
            item.value ? (
              <tr key={index}>
                <td>{item.label.replace(/_/g, ' ')}</td> {/* Replaces underscores with space for display */}
                <td>{item.value}</td>
              </tr>
            ) : null
          ))}
        </tbody>
      </table>
    </div>
  );
};
// END NEW COMPONENT

const LoanValidationTable = ({ riskLevel, riskDetails, creditScore }) => {
  if (!riskLevel) return null;

  const { style, className } = getRiskStyles(riskLevel);

  return (
    <div className="loan-validation-report">
      <table className="validation-table">
        <thead>
          <tr>
            <th colSpan="2" className="table-header">
              Loan Validation Report
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              Risk Level
            </td>
            <td>
              <span style={style} className={className}>
                {riskLevel}
              </span>
            </td>
          </tr>
 <tr>
            <td>
              Credit Score
            </td>
            <td>
              {/* Join details if it's an array, otherwise display as is */}
              {creditScore}
            </td>
          </tr>
          <tr>
            <td>
              Risk Details
            </td>
            <td>
              {/* Join details if it's an array, otherwise display as is */}
              {Array.isArray(riskDetails) ? riskDetails.join(' ') : riskDetails}
            </td>
          </tr>
 
        </tbody>
      </table>
    </div>
  );
};

const SArNarrative = () => {
  const { state, dispatch } = useAppContext();
  const [copied, setCopied] = useState(false);
  // ❌ Removed: const [addressReportContent, setAddressReportContent] = useState("");
  // New state to hold processed Loan Validation Data
  const [loanReportData, setLoanReportData] = useState(null); 
  const addressVerificationData = state.addressVerificationData;
  const loanValidationData = state.loanValidationData;
//   console.log("addressVerificationData", addressVerificationData);

  useEffect(() => {
    let dataReceived = false;
    
    // 1. Process Address Verification Data (No separate state needed, use prop directly)
    if (addressVerificationData && addressVerificationData.verification_status) {
      dataReceived = true;
    }

    // 2. Process Loan Validation Data
    if (loanValidationData && loanValidationData.validation_result) {
      dataReceived = true;
      // Set the data for the new table component
      setLoanReportData({
        riskLevel: loanValidationData.risk_level,
        riskDetails: loanValidationData.risk_details,
        riskResult: loanValidationData.validation_result,
        creditScore: loanValidationData.creditScore,
      });
    } else {
      setLoanReportData(null); // Clear previous data if not present
    }

    // 3. Handle default text display
    if (dataReceived) {
      // If data received, clear any progress/default message (this logic might need refinement based on your overall state management)
      // For now, we'll keep the logic simple, relying on the tables to render when data is present
    } else if (state.fileName) {
      // You might want a simple text indicator if no data, but the tables aren't rendering
    } else {
      // setAddressReportContent( // ❌ Removed: Setting addressReportContent is no longer needed
      //   "No application validation has been initiated yet. Please enter an Applicant ID in the status box to begin."
      // );
    }
  }, [addressVerificationData, loanValidationData, state.fileName]);

  // Helper function for PDF footer (requires jsPDF which is commented out)
  const addFooter = (doc, pageWidth, pageHeight) => {
    const pageCount = doc.getNumberOfPages();
    const pageCurrent = doc.internal.getCurrentPageInfo().pageNumber;

    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Page ${pageCurrent} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
    doc.setTextColor(0, 0, 0);
  };

  const handleCopy = () => {
    // Combine the address report content and the loan report data for copying
    let contentToCopy = "";

    if (addressVerificationData) {
      contentToCopy += `Address Verification Report\n\n`;
      contentToCopy += `verification_status: ${addressVerificationData.verification_status}\n`;
      contentToCopy += `application_ID: ${addressVerificationData.application_ID}\n`;
      contentToCopy += `name_of_applicant: ${addressVerificationData.name_of_applicant}\n`;
      contentToCopy += `Summary: ${addressVerificationData.summary_in_one_line || addressVerificationData.summary}\n\n`;
    }

    if (loanReportData) {
      contentToCopy += `Loan Validation Report\n\nRisk Level: ${loanReportData.riskLevel}\nRisk Details: ${Array.isArray(loanReportData.riskDetails) ? loanReportData.riskDetails.join(' ') : loanReportData.riskDetails}`;
    }
    
    navigator.clipboard.writeText(contentToCopy.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download as PDF
  const handleDownload = () => {
    console.error("jsPDF is not imported. Download functionality is disabled.");
  };

  useEffect(() => {
    const headings = {
      0: "Dashboard OVerview",
      1: "Preprocessor Output",
      2: "SAR Narrative Report",
      3: "Evaluator Report",
      4: "Formatter Agent Report",
      5: "Dashboard Overview",
    };

    if (state.completedStep) {
      dispatch({
        type: "SET_ACTIVE_HEADING",
        payload: headings[state.completedStep] || "Address Validation Report",
      });
    }
  }, [state.completedStep, dispatch]);

  const hasReportData = addressVerificationData || loanReportData;

  return (
    <div className="sar-narrative-container">
      <h3 className="sar-narrative-title">{state.activeHeading}</h3>

      <div className="sar-narrative-box">
        {/* ⭐ RENDER NEW ADDRESS VERIFICATION TABLE */}
        {addressVerificationData && (
          <AddressVerificationTable data={addressVerificationData} />
        )}
        {/* Added a horizontal rule for separation */}
        {addressVerificationData && loanReportData && <hr className="report-separator" />}

        {loanReportData && (
          <LoanValidationTable
            riskLevel={loanReportData.riskLevel}
            riskDetails={loanReportData.riskDetails}
            creditScore={loanReportData.creditScore}
          />
        )}

        {/* Show placeholder text if no data and no file being processed */}
        {!hasReportData && !state.fileName && (
          <p className="narrative-placeholder">
            No application validation has been initiated yet. Please enter an Applicant ID in the status box to begin.
          </p>
        )}

        {/* Show Buttons only if there’s content */}
        {hasReportData ? (
          <div className="sar-narrative-actions">
            <button title="Regenerate">
              <RefreshIcon />
            </button>
            <button
              onClick={handleCopy}
              title={copied ? "Copied!" : "Copy to Clipboard"}
            >
              <CopyIcon />
            </button>
            <button
              className="downloadBtn"
              onClick={handleDownload}
              title="Download Report (Disabled)"
            >
              <DownloadIcon />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default SArNarrative;