import React, { useState, useRef, useEffect } from "react";
import "./LoanDashboard.css";
import { getApiUrl } from "../azure-config";
import Swal from 'sweetalert2';

const LoanDashboard = () => {
  // Application state
  const [loanAppId, setLoanAppId] = useState(null);
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);
  const [documentsUploaded, setDocumentsUploaded] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Form data state
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    ssn: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    zipCode: "",
    country: "USA",
    
    // Loan Details
    loanAmount: "",
    loanPurpose: "",
    loanTermMonths: 60,
    employmentStatus: "",
    annualIncome: "",
    employerName: "",
    yearsEmployed: "",
  });

  // Biometrics tracking
  const biometricsData = useRef({
    keystrokes: [],
    mouseMoves: [],
    formStartTime: Date.now(),
    fieldFocusTimes: {}
  });

  // Device fingerprint data
  const [deviceFingerprint, setDeviceFingerprint] = useState(null);

  // Track biometrics on component mount
  useEffect(() => {
    // Capture device fingerprint
    const captureDeviceFingerprint = () => {
      setDeviceFingerprint({
        ip_address: null, // Will be captured server-side
        user_agent: navigator.userAgent,
        screen_resolution: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        platform: navigator.platform,
        browser: getBrowserName(),
        device_type: getDeviceType(),
      });
    };

    captureDeviceFingerprint();

    // Keystroke tracking
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
        biometricsData.current.keystrokes.push({
          field: e.target.name || e.target.id,
          key: e.key,
          type: 'keydown',
          timestamp: Date.now()
        });
      }
    };

    const handleKeyUp = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
        biometricsData.current.keystrokes.push({
          field: e.target.name || e.target.id,
          key: e.key,
          type: 'keyup',
          timestamp: Date.now()
        });
      }
    };

    // Mouse movement tracking (throttled)
    let mouseMoveThrottle = 0;
    const handleMouseMove = (e) => {
      const now = Date.now();
      if (now - mouseMoveThrottle > 100) { // Throttle to every 100ms
        biometricsData.current.mouseMoves.push({
          x: e.clientX,
          y: e.clientY,
          timestamp: now
        });
        mouseMoveThrottle = now;
      }
    };

    // Focus tracking for fields
    const handleFocus = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
        const fieldName = e.target.name || e.target.id;
        if (!biometricsData.current.fieldFocusTimes[fieldName]) {
          biometricsData.current.fieldFocusTimes[fieldName] = [];
        }
        biometricsData.current.fieldFocusTimes[fieldName].push({
          focusTime: Date.now(),
          type: 'focus'
        });
      }
    };

    const handleBlur = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
        const fieldName = e.target.name || e.target.id;
        if (biometricsData.current.fieldFocusTimes[fieldName]) {
          const lastEntry = biometricsData.current.fieldFocusTimes[fieldName];
          lastEntry[lastEntry.length - 1].blurTime = Date.now();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('focus', handleFocus, true);
    document.addEventListener('blur', handleBlur, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('focus', handleFocus, true);
      document.removeEventListener('blur', handleBlur, true);
    };
  }, []);

  // Helper functions for device fingerprint
  const getBrowserName = () => {
    const userAgent = navigator.userAgent;
    if (userAgent.indexOf("Chrome") > -1) return "Chrome";
    if (userAgent.indexOf("Safari") > -1) return "Safari";
    if (userAgent.indexOf("Firefox") > -1) return "Firefox";
    if (userAgent.indexOf("Edge") > -1) return "Edge";
    return "Unknown";
  };

  const getDeviceType = () => {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return "tablet";
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return "mobile";
    return "desktop";
  };

  // Calculate biometrics summary
  const getBiometricsSummary = () => {
    const totalTime = (Date.now() - biometricsData.current.formStartTime) / 1000; // in seconds
    
    // Calculate typing speed (rough estimate)
    const typingEvents = biometricsData.current.keystrokes.filter(k => 
      k.type === 'keydown' && k.key && k.key.length === 1
    );
    const typingSpeed = typingEvents.length > 0 ? (typingEvents.length / totalTime) * 60 : 0; // WPM

    return {
      keystroke_dynamics: {
        total_keystrokes: biometricsData.current.keystrokes.length,
        keystroke_data: biometricsData.current.keystrokes.slice(-100) // Keep last 100
      },
      mouse_movements: {
        total_movements: biometricsData.current.mouseMoves.length,
        movement_data: biometricsData.current.mouseMoves.slice(-50) // Keep last 50
      },
      form_interaction_time: totalTime,
      typing_speed: typingSpeed,
      field_focus_times: biometricsData.current.fieldFocusTimes
    };
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Validate form
  const validateForm = () => {
    const required = ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'addressLine1', 
                      'city', 'state', 'zipCode', 'loanAmount', 'loanPurpose', 'employmentStatus', 'annualIncome'];
    
    for (let field of required) {
      if (!formData[field]) {
        Swal.fire({
          icon: 'error',
          title: 'Missing Information',
          text: `Please fill in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`
        });
        return false;
      }
    }
    return true;
  };

  // Submit loan application
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      // Prepare application data
      const applicationData = {
        applicant_info: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          date_of_birth: formData.dateOfBirth,
          ssn: formData.ssn,
          address_line1: formData.addressLine1,
          address_line2: formData.addressLine2,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zipCode,
          country: formData.country
        },
        loan_details: {
          loan_amount: parseFloat(formData.loanAmount),
          loan_purpose: formData.loanPurpose,
          loan_term_months: parseInt(formData.loanTermMonths),
          employment_status: formData.employmentStatus,
          annual_income: parseFloat(formData.annualIncome),
          employer_name: formData.employerName,
          years_employed: parseFloat(formData.yearsEmployed) || 0
        },
        biometrics: getBiometricsSummary(),
        device_fingerprint: deviceFingerprint
      };

      // Call Azure backend API
      const response = await fetch(getApiUrl('/api/loans/create'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(applicationData)
      });

      if (!response.ok) {
        throw new Error('Failed to create loan application');
      }

      const result = await response.json();
      
      // Store loan application ID
      setLoanAppId(result.loan_app_id);
      setApplicationSubmitted(true);

      Swal.fire({
        icon: 'success',
        title: 'Application Created!',
        html: `
          <div style="font-size: 1.1rem; margin-bottom: 15px;">
            Your loan application has been created successfully.
          </div>
          <div style="background: #f0f8ff; padding: 15px; border-radius: 8px; border: 2px solid #0078D4;">
            <div style="font-weight: bold; margin-bottom: 5px;">Application ID:</div>
            <div style="font-size: 1.5rem; color: #0078D4; font-weight: bold;">${result.loan_app_id}</div>
          </div>
          <div style="margin-top: 15px; color: #666;">
            Please upload your documents to proceed.
          </div>
        `,
        confirmButtonColor: '#0078D4'
      });

    } catch (error) {
      console.error('Error submitting application:', error);
      Swal.fire({
        icon: 'error',
        title: 'Submission Failed',
        text: error.message || 'Failed to create loan application. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle document upload
  const handleDocumentUpload = async (e, documentType) => {
    e.preventDefault();
    
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);

    try {
      // Capture biometrics for document upload event
      const uploadBiometrics = getBiometricsSummary();
      
      // Prepare form data for file upload
      const formDataToSend = new FormData();
      formDataToSend.append('file', file);
      formDataToSend.append('document_type', documentType);
      formDataToSend.append('biometrics', JSON.stringify(uploadBiometrics));
      formDataToSend.append('device_fingerprint', JSON.stringify(deviceFingerprint));

      // Upload document
      const response = await fetch(getApiUrl(`/api/loans/${loanAppId}/documents/upload`), {
        method: 'POST',
        body: formDataToSend
      });

      if (!response.ok) {
        throw new Error('Failed to upload document');
      }

      const result = await response.json();
      
      // Add to uploaded documents list
      setDocumentsUploaded(prev => [...prev, {
        document_id: result.document_id,
        file_name: result.file_name,
        document_type: documentType,
        uploaded_at: result.uploaded_at
      }]);

      // Reset file input
      e.target.value = '';

      Swal.fire({
        icon: 'success',
        title: 'Document Uploaded!',
        text: `${file.name} has been uploaded successfully.`,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });

    } catch (error) {
      console.error('Error uploading document:', error);
      Swal.fire({
        icon: 'error',
        title: 'Upload Failed',
        text: error.message || 'Failed to upload document. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Final submission - triggers background fraud analysis
  const handleFinalSubmit = async () => {
    if (documentsUploaded.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Documents',
        text: 'Please upload at least one document before submitting.'
      });
      return;
    }

    setLoading(true);

    try {
      // Submit application for fraud analysis (runs in background)
      const response = await fetch(getApiUrl(`/api/loans/${loanAppId}/submit`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to submit application');
      }

      const result = await response.json();

      Swal.fire({
        icon: 'success',
        title: 'Application Submitted!',
        html: `
          <div style="font-size: 1.1rem; margin-bottom: 15px;">
            Your loan application has been submitted for review.
          </div>
          <div style="background: #f0fff0; padding: 15px; border-radius: 8px; border: 2px solid #28a745;">
            <div style="font-weight: bold; margin-bottom: 5px;">Application ID:</div>
            <div style="font-size: 1.5rem; color: #28a745; font-weight: bold;">${loanAppId}</div>
          </div>
          <div style="margin-top: 15px; color: #666;">
            ${result.note || 'You will be notified once the review is complete.'}
          </div>
        `,
        confirmButtonColor: '#28a745'
      }).then(() => {
        // Reset form or redirect
        window.location.reload();
      });

    } catch (error) {
      console.error('Error submitting application:', error);
      Swal.fire({
        icon: 'error',
        title: 'Submission Failed',
        text: error.message || 'Failed to submit application. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Download a single document
  const handleDownloadDocument = async (documentId, fileName) => {
    try {
      const endpoint = `/api/loans/${loanAppId}/documents/${documentId}/download`;
      const response = await fetch(getApiUrl(endpoint), {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error('Failed to download document');
      }

      // Create a blob from the response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      Swal.fire({
        icon: 'success',
        title: 'Download Started',
        text: `Downloading ${fileName}...`,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000
      });

    } catch (error) {
      console.error('Error downloading document:', error);
      Swal.fire({
        icon: 'error',
        title: 'Download Failed',
        text: error.message || 'Failed to download document. Please try again.'
      });
    }
  };

  return (
    <div className="loan-app-container">
      <main className="main-content-loan">
        <div className="title-section">
          <div className="title-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"></path>
              <circle cx="12" cy="10" r="3"></circle>
              <path d="M9 18h6"></path>
            </svg>
          </div>
          <div>
            <h1 className="page-title">Loan Application</h1>
            <p className="page-subtitle">Submit your loan application and upload required documents</p>
          </div>
        </div>

        {!applicationSubmitted ? (
          // STEP 1: Application Form
          <form className="form-wrapper" onSubmit={handleFormSubmit}>
            <section className="form-section">
              <div className="section-header">
                <h3 className="section-title">Personal Information</h3>
                <p className="section-subtitle">Enter your personal details</p>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="firstName">First Name *</label>
                  <input type="text" id="firstName" name="firstName" className="form-input" 
                         value={formData.firstName} onChange={handleInputChange} required />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="lastName">Last Name *</label>
                  <input type="text" id="lastName" name="lastName" className="form-input"
                         value={formData.lastName} onChange={handleInputChange} required />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="email">Email *</label>
                  <input type="email" id="email" name="email" className="form-input"
                         value={formData.email} onChange={handleInputChange} required />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="phone">Phone *</label>
                  <input type="tel" id="phone" name="phone" className="form-input"
                         value={formData.phone} onChange={handleInputChange} required />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="dateOfBirth">Date of Birth *</label>
                  <input type="date" id="dateOfBirth" name="dateOfBirth" className="form-input"
                         value={formData.dateOfBirth} onChange={handleInputChange} required />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="ssn">SSN</label>
                  <input type="text" id="ssn" name="ssn" placeholder="XXX-XX-XXXX" className="form-input"
                         value={formData.ssn} onChange={handleInputChange} />
                </div>

                <div className="form-group full-width">
                  <label className="form-label" htmlFor="addressLine1">Address Line 1 *</label>
                  <input type="text" id="addressLine1" name="addressLine1" className="form-input"
                         value={formData.addressLine1} onChange={handleInputChange} required />
                </div>

                <div className="form-group full-width">
                  <label className="form-label" htmlFor="addressLine2">Address Line 2</label>
                  <input type="text" id="addressLine2" name="addressLine2" className="form-input"
                         value={formData.addressLine2} onChange={handleInputChange} />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="city">City *</label>
                  <input type="text" id="city" name="city" className="form-input"
                         value={formData.city} onChange={handleInputChange} required />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="state">State *</label>
                  <input type="text" id="state" name="state" className="form-input"
                         value={formData.state} onChange={handleInputChange} required />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="zipCode">Zip Code *</label>
                  <input type="text" id="zipCode" name="zipCode" className="form-input"
                         value={formData.zipCode} onChange={handleInputChange} required />
                </div>
              </div>
            </section>

            <section className="form-section">
              <div className="section-header">
                <h3 className="section-title">Loan Details</h3>
                <p className="section-subtitle">Specify your loan requirements</p>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="loanAmount">Loan Amount ($) *</label>
                  <input type="number" id="loanAmount" name="loanAmount" className="form-input"
                         value={formData.loanAmount} onChange={handleInputChange} required min="1000" />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="loanTermMonths">Loan Term (Months) *</label>
                  <select id="loanTermMonths" name="loanTermMonths" className="form-select"
                          value={formData.loanTermMonths} onChange={handleInputChange} required>
                    <option value="12">12 months</option>
                    <option value="24">24 months</option>
                    <option value="36">36 months</option>
                    <option value="48">48 months</option>
                    <option value="60">60 months</option>
                    <option value="120">120 months</option>
                  </select>
                </div>

                <div className="form-group full-width">
                  <label className="form-label" htmlFor="loanPurpose">Loan Purpose *</label>
                  <input type="text" id="loanPurpose" name="loanPurpose" className="form-input"
                         placeholder="e.g., Home Improvement, Debt Consolidation, Business"
                         value={formData.loanPurpose} onChange={handleInputChange} required />
                </div>
              </div>
            </section>

            <section className="form-section">
              <div className="section-header">
                <h3 className="section-title">Employment Information</h3>
                <p className="section-subtitle">Enter your employment details</p>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="employmentStatus">Employment Status *</label>
                  <select id="employmentStatus" name="employmentStatus" className="form-select"
                          value={formData.employmentStatus} onChange={handleInputChange} required>
                    <option value="">Select status</option>
                    <option value="Employed">Employed</option>
                    <option value="Self-Employed">Self-Employed</option>
                    <option value="Unemployed">Unemployed</option>
                    <option value="Retired">Retired</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="annualIncome">Annual Income ($) *</label>
                  <input type="number" id="annualIncome" name="annualIncome" className="form-input"
                         value={formData.annualIncome} onChange={handleInputChange} required min="0" />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="employerName">Employer Name</label>
                  <input type="text" id="employerName" name="employerName" className="form-input"
                         value={formData.employerName} onChange={handleInputChange} />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="yearsEmployed">Years Employed</label>
                  <input type="number" id="yearsEmployed" name="yearsEmployed" className="form-input"
                         value={formData.yearsEmployed} onChange={handleInputChange} min="0" step="0.1" />
                </div>
              </div>
            </section>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Creating Application...' : 'Create Application'}
              </button>
            </div>
          </form>
        ) : (
          // STEP 2: Document Upload Section
          <div className="document-upload-section">
            <div className="application-id-banner">
              <div className="banner-icon">✓</div>
              <div className="banner-content">
                <h3>Application Created Successfully!</h3>
                <div className="app-id-display">
                  <span className="app-id-label">Application ID:</span>
                  <span className="app-id-value">{loanAppId}</span>
                </div>
                <p>Please upload the required documents to proceed with your application.</p>
              </div>
            </div>

            <section className="form-section">
              <div className="section-header">
                <h3 className="section-title">Upload Documents</h3>
                <p className="section-subtitle">Upload supporting documents for your loan application</p>
              </div>

              <div className="document-upload-grid">
                <div className="document-upload-item">
                  <label className="document-label">
                    <span className="document-icon">📄</span>
                    <span className="document-name">Identity Proof</span>
                    <span className="document-hint">(Passport, Driver's License)</span>
                  </label>
                  <input 
                    type="file" 
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleDocumentUpload(e, 'identity_proof')}
                    className="file-input"
                    disabled={loading}
                  />
                </div>

                <div className="document-upload-item">
                  <label className="document-label">
                    <span className="document-icon">🏠</span>
                    <span className="document-name">Address Proof</span>
                    <span className="document-hint">(Utility Bill, Lease Agreement)</span>
                  </label>
                  <input 
                    type="file" 
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleDocumentUpload(e, 'address_proof')}
                    className="file-input"
                    disabled={loading}
                  />
                </div>

                <div className="document-upload-item">
                  <label className="document-label">
                    <span className="document-icon">💰</span>
                    <span className="document-name">Income Proof</span>
                    <span className="document-hint">(Pay Stubs, Tax Returns)</span>
                  </label>
                  <input 
                    type="file" 
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleDocumentUpload(e, 'income_proof')}
                    className="file-input"
                    disabled={loading}
                  />
                </div>

                <div className="document-upload-item">
                  <label className="document-label">
                    <span className="document-icon">🏦</span>
                    <span className="document-name">Bank Statement</span>
                    <span className="document-hint">(Last 3-6 months)</span>
                  </label>
                  <input 
                    type="file" 
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleDocumentUpload(e, 'bank_statement')}
                    className="file-input"
                    disabled={loading}
                  />
                </div>
              </div>

              {documentsUploaded.length > 0 && (
                <div className="uploaded-documents">
                  <h4 className="uploaded-title">Uploaded Documents ({documentsUploaded.length})</h4>
                  <div className="uploaded-list">
                    {documentsUploaded.map((doc, index) => (
                      <div key={index} className="uploaded-item">
                        <span className="uploaded-icon">✓</span>
                        <div className="uploaded-info">
                          <div className="uploaded-name">{doc.file_name}</div>
                          <div className="uploaded-meta">
                            {doc.document_type.replace('_', ' ')} • {new Date(doc.uploaded_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <div className="form-actions">
              <button 
                type="button" 
                className="btn-primary" 
                onClick={handleFinalSubmit}
                disabled={loading || documentsUploaded.length === 0}
              >
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default LoanDashboard;
