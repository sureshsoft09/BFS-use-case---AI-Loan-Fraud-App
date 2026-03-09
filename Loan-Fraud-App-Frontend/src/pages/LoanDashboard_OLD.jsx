import React, { useCallback, useState, useRef, useEffect } from "react";
import "./LoanDashboard.css";
import cognizantLogo from "../assets/cogni-logo.svg";
import { useNavigate } from "react-router-dom";
import Swal from 'sweetalert2';
import { useDEXAgent } from "../context/useDEXAgent"; 

const JobFields = ({ formData, handleInputChange }) => (
    <>
            
      <div className="form-group">
                
        <label className="form-label" htmlFor="employerName">
          Employer Name
        </label>
                
        <input
          type="text"
          id="employerName"
          name="employerName"
          className="form-input"
             value={formData.employerName}
    onChange={handleInputChange}
        />
              
      </div>
            
      <div className="form-group">
                
        <label className="form-label" htmlFor="jobTitle">
          Job Title
        </label>
                
        <input
          type="text"
          id="jobTitle"
          name="jobTitle"
          className="form-input"
             value={formData.jobTitle}
    onChange={handleInputChange}
        />
              
      </div>
            
      <div className="form-group">
                
        <label className="form-label" htmlFor="annualIncome">
          Annual Income
        </label>
                
        <input
          type="number"
          id="annualIncome"
          name="annualIncome"
          className="form-input"
             value={formData.annualIncome}
    onChange={handleInputChange}
        />
              
      </div>
            
      <div className="form-group">
                
        <label className="form-label" htmlFor="employmentType">
          Employment Type
        </label>
                
        <input
          type="text"
          id="employmentType"
          name="employmentType"
          className="form-input"
             value={formData.employmentType}
    onChange={handleInputChange}
        />
              
      </div>
          
    </>
  );

  const BusinessFields = ({ formData, handleInputChange }) => (
    <>
            
      <div className="form-group">
                
        <label className="form-label" htmlFor="businessLegalName">
          Business Legal Name *
        </label>
                
        <input
          type="text"
          id="businessLegalName"
          name="businessLegalName"
          className="form-input"
          required
             value={formData.businessLegalName}
    onChange={handleInputChange}
        />
              
      </div>
            
      <div className="form-group">
                
        <label className="form-label" htmlFor="businessAddress">
          Business Physical Address *
        </label>
                
        <input
          type="text"
          id="businessAddress"
          name="businessAddress"
          className="form-input"
          required
             value={formData.businessAddress}
    onChange={handleInputChange}
        />
              
      </div>
            
      <div className="form-group">
                
        <label className="form-label" htmlFor="taxId">
          Tax ID / EIN *
        </label>
                
        <input
          type="text"
          id="taxId"
          name="taxId"
          placeholder="XX-XXXXXXX"
          className="form-input"
          required
             value={formData.taxId}
    onChange={handleInputChange}
        />
              
      </div>
            
      <div className="form-group">
                
        <label className="form-label" htmlFor="grossAnnualSales">
          Gross Annual Sales/Revenue *
        </label>
                
        <input
          type="number"
          id="grossAnnualSales"
          name="grossAnnualSales"
          className="form-input"
          required
             value={formData.grossAnnualSales}
    onChange={handleInputChange}
        />
              
      </div>
            
      <div className="form-group">
                
        <label className="form-label" htmlFor="netAnnualIncome">
          Net Annual Income/Profit *
        </label>
                
        <input
          type="number"
          id="netAnnualIncome"
          name="netAnnualIncome"
          className="form-input"
          required
          value={formData.netAnnualIncome} // <-- ADDED: Value binding
  onChange={handleInputChange}     // <-- ADDED: Correct handler
        />
              
      </div>
            
      <div className="form-group">
                
        <label className="form-label" htmlFor="ownershipPercentage">
          Percentage of Ownership *
        </label>
                
        <input
          type="number"
          id="ownershipPercentage"
          name="ownershipPercentage"
          min="0"
          max="100"
          className="form-input"
          required
          value={formData.ownershipPercentage} 
  onChange={handleInputChange}        
        />
              
      </div>
            {/* Personal Guaranty Acknowledgement (full-width checkbox) */}      
      <div className="form-group full-width" style={{ marginTop: "10px" }}>
                
        <label className="checkbox-wrapper" htmlFor="personalGuaranty">
                    
          <input
            type="checkbox"
            id="personalGuaranty"
            name="personalGuaranty"
            className="checkbox-input"
            required
          />
                    
          <span className="checkbox-label">
            Personal Guaranty Acknowledgement *
          </span>
                  
        </label>
                
        <p
          className="co-applicant-text"
          style={{ marginTop: "1px", color: "#666", fontSize: "0.85em" }}
        >
                    I understand that I may be personally responsible for
          repaying the loan, even if the business fails.         
        </p>
              
      </div>
          
    </>
  );

  

const LoanDashboard = () => {
  const API_ENDPOINT =
    "https://6vkrzf5djd.execute-api.us-west-2.amazonaws.com/dev/submit";
  const [activeTab, setActiveTab] = useState(null);
  const [selectedEmploymentType, setSelectedEmploymentType] = useState("JOB");

  const biometricData = useRef({ keystrokes: [], mouseMoves: [] });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT') {
        biometricData.current.keystrokes.push({
          field: e.target.id,
          key: e.key,
          type: 'down',
          time: Date.now()
        });
      }
    };

    const handleKeyUp = (e) => {
      if (e.target.tagName === 'INPUT') {
        biometricData.current.keystrokes.push({
          field: e.target.id,
          key: e.key,
          type: 'up',
          time: Date.now()
        });
      }
    };

    const handleMouseMove = (e) => {
      // Throttle: only log every 10th move to keep the payload lean
      if (biometricData.current.mouseMoves.length % 10 === 0) {
        biometricData.current.mouseMoves.push({
          x: e.clientX,
          y: e.clientY,
          time: Date.now()
        });
      }
    };

    // Attach to document to catch events even as inputs are swapped (Job vs Business)
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      // Cleanup on unmount
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);


const { collectDEXData } = useDEXAgent();
  // New State for managing all form data
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    ssn: "",
    dob: "",
    streetAddress: "",
    city: "",
    state: "",
    zipCode: "",
    loanAmt: "",
    housingStatus: "",
    // Job Fields (Default)
    employerName: "",
    jobTitle: "",
    annualIncome: "",
    employmentType: "",
    // Business Fields
    businessLegalName: "",
    businessAddress: "",
    taxId: "",
    grossAnnualSales: "",
    netAnnualIncome: "",
    ownershipPercentage: "",
    personalGuaranty: false,
    dl_id_upload: null,
    passport_upload: null,
    bank_statements_upload: null,
    income_upload: null,
    por_upload: null, // Proof of Residency
    poc_upload: null, // Proof of Citizenship
  });

const handleFileUpload = async (formData, applicantId) => {
  const fileFields = ['bank_statements_upload', 'income_upload', 'dl_id_upload', 'passport_upload', 'por_upload', 'poc_upload'];
  const fileMetadata = [];
 
  for (const fieldName of fileFields) {
    const fileList = formData[fieldName];
 
    if (fileList && fileList.length > 0) {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        // --- ADDED: Convert file to Base64 ---
        const base64Data = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result.split(',')[1]); 
        });
 
        fileMetadata.push({
          applicantId: applicantId,
          fileList: fieldName,
          fileName: file.name,
          contentType: file.type || 'application/pdf',
          base64Data: base64Data // <--- THIS SENDS THE ACTUAL FILE CONTENT
        });
      }
    }
  }
 
  return { success: true, fileReferences: fileMetadata };
};

  const [suggestions, setSuggestions] = useState([]);
    const sessionId = sessionStorage.getItem("dex_session_id");
    console.log("Current Session ID in LoanDashboard:", sessionId);

  const handleInputChange = async (event) => {
  const { name, value } = event.target;

  // 1. Update the field the user is currently typing in
  setFormData((prev) => ({
    ...prev,
    [name]: value,
  }));

  if (name === "zipCode" && value.length === 5) {
  setFormData(prev => ({ ...prev, city: 'Loading...', state: '' }));
  
  try {
    const response = await fetch(`https://api.zippopotam.us/us/${value}`);
    if (response.ok) {
      const data = await response.json();
      const place = data.places[0];
      setFormData(prev => ({
        ...prev,
        city: place['place name'],
        state: place['state']
      }));
    } else {
      // If zip is invalid, clear the "Loading..." text
      setFormData(prev => ({ ...prev, city: '', state: '' }));
    }
  } catch (error) {
    setFormData(prev => ({ ...prev, city: '', state: '' }));
  }
}
if (name === "streetAddress" && value.length > 3) {
    // We include the city and state in the search to "force" local results
    const searchQuery = `${value}, ${formData.city}, ${formData.state}`;
    try {
      const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery)}&limit=5`);
      const data = await response.json();
      
      // Filter results to make sure they actually match the City or State
      const filtered = data.features.filter(f => 
        f.properties.postcode === formData.zipCode || 
        f.properties.city === formData.city
      );
      setSuggestions(filtered);
    } catch (err) {
      console.error("Autocomplete error", err);
    }
  } else {
    setSuggestions([]); // Clear suggestions if input is too short
  }
};

  const handleInputChangeNumber = (e) => {
  const { name, value } = e.target;
  const MAX_LIMIT = 50000000;

  // This Regex removes anything that is NOT a digit (0-9)
  let onlyNums = value.replace(/\D/g, '');

  if (onlyNums !== '') {
    const numValue = parseInt(onlyNums, 10);
    
    if (numValue > MAX_LIMIT) {
      onlyNums = MAX_LIMIT.toString();
    }
  }

  setFormData({
    ...formData,
    [name]: onlyNums
  });
};

// Add this to handle the checkbox in BusinessFields
const handleCheckboxChange = (e) => {
  const { name, checked } = e.target;
  setFormData(prev => ({ ...prev, [name]: checked }));
};

  // Handler for employment type radio button changes
  const handleEmploymentTypeChange = useCallback((event) => {
    const newType = event.target.value;
    setSelectedEmploymentType(newType);
    // You might want to clear the opposite fields when the type changes
    if (newType === "JOB") {
      setFormData((prev) => ({
        ...prev,
        businessLegalName: "",
        businessAddress: "",
        taxId: "",
        grossAnnualSales: "",
        netAnnualIncome: "",
        ownershipPercentage: "",
        personalGuaranty: false,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        employerName: "",
        jobTitle: "",
        annualIncome: "",
        employmentType: "",
      }));
    }
  },[]); // Handler for radio button changes

  const navigate = useNavigate();

  const handleFileChange = (event) => {
    const { name, files } = event.target;
    // Use files[0] for single file upload, or the whole FileList if 'multiple' is supported
    setFormData({
      ...formData,
      [name]: files.length > 0 ? files : null, // Store the FileList object (or files[0] if you only allow one)
    });
  };
  const handleApplicationSubmit = async () => {
  };

const getFileNameDisplay = (fieldName) => {
  const files = formData[fieldName]; // Looks up 'bank_statements_upload', 'income_upload', etc.
  if (!files || files.length === 0) return "No file chosen";
  if (files.length === 1) return files[0].name;
  return `${files.length} files selected`;
};

const handleSubmit = async (event) => {
  event.preventDefault();

  // 1. Prepare Metadata Payload
  let metadataPayload = { ...formData, session_id: sessionId,
    biometrics: biometricData.current};
  
  // Clean up file objects from metadata
  const fileFields = ['dl_id_upload', 'passport_upload', 'bank_statements_upload', 'income_upload', 'por_upload', 'poc_upload'];
  fileFields.forEach(field => delete metadataPayload[field]);

  if (selectedEmploymentType === "JOB") {
    const businessFields = ['businessLegalName', 'businessAddress', 'taxId', 'grossAnnualSales', 'netAnnualIncome', 'ownershipPercentage', 'personalGuaranty'];
    businessFields.forEach(f => delete metadataPayload[f]);
    metadataPayload.employmentMode = "JOB";
  } else {
    const jobFields = ['employerName', 'jobTitle', 'annualIncome', 'employmentType'];
    jobFields.forEach(f => delete metadataPayload[f]);
    metadataPayload.employmentMode = "BUSINESS";
  }

  try {
    // --- STEP 1: API Call 1 (Submit Metadata & Get Applicant ID) ---
    const metaResponse = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metadataPayload),
    });

    if (!metaResponse.ok) {
      throw new Error(`Metadata submission failed: ${metaResponse.status}`);
    }

    const metaData = await metaResponse.json();
    const applicantId = metaData.ApplicantID; // ID is extracted here

    if (!applicantId) {
      throw new Error("API response missing Applicant ID.");
    }

    // --- STEP 2: Trigger DEX Analysis (Now with applicantId) ---
    const dexData = await collectDEXData();

    try {
      // Note: We don't 'await' this if we don't want to block the UI, 
      // but we do send the applicantId now.
      fetch("https://deb5xke9pl.execute-api.us-west-2.amazonaws.com/DEXPROD1/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "SUBMISSION",
          session_id: sessionId,
          email: formData.email,
          ApplicantID: applicantId, 
          ...dexData,
        }),
      }).then(() => console.log("DEX Analysis Sent with ID:", applicantId));
    } catch (err) {
      console.warn("DEX Agent API failed", err);
    }

    // --- STEP 3: Handle File Uploads ---
    const uploadResult = await handleFileUpload(formData, applicantId);
    if (!uploadResult?.success) {
      throw new Error("File processing failed.");
    }

    const FILE_UPLOAD_BASE_URL = 'https://w5twk0b7bj.execute-api.us-west-2.amazonaws.com/dev/loan-submissions';
    const fileResponse = await fetch(FILE_UPLOAD_BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(uploadResult.fileReferences),
    });

    if (!fileResponse.ok) {
      throw new Error("File upload to server failed.");
    }

    // --- STEP 4: Final Success UI ---
    Swal.fire({
      title: 'Success!',
      html: `
        <div style="font-size: 1.1rem; margin-bottom: 10px;">Application submitted successfully!</div>
        <div style="background: #f4f4f4; padding: 10px; border-radius: 8px; font-weight: bold;">
            Application ID: <span style="color:rgb(22, 237, 44);">${applicantId}</span>
        </div>
      `,
      icon: 'success',
      confirmButtonColor: 'rgb(22, 237, 44)',
    });

  } catch (error) {
    console.error("Submission Error:", error);
    alert(`Error: ${error.message}`);
  }
};


  const toggleTab = (tabName) => {
    setActiveTab(activeTab === tabName ? null : tabName);
  }; // --- Employment Fields Components ---

  const isPersonalInfoComplete = () => {
  const { firstName, lastName, email, phoneNumber, ssn, dob, zipCode, city, streetAddress, state, housingStatus, loanAmt } = formData;
  return firstName && lastName && email && phoneNumber && ssn && dob && zipCode && city && streetAddress && state && housingStatus && loanAmt;
};

const isEmploymentComplete = () => {
  if (selectedEmploymentType === "JOB") {
    return formData.employerName && formData.jobTitle && formData.annualIncome;
  } else {
    return formData.businessLegalName && formData.taxId && formData.personalGuaranty;
  }
};

const isFinancialComplete = () => {
  return formData.bank_statements_upload && formData.income_upload;
};

const isKYCComplete = () => {
  // Check that all 4 required fields exist AND are not null/undefined
   return !!(
    formData.dl_id_upload && 
    formData.passport_upload && 
    formData.por_upload && 
    formData.poc_upload
  )
};

const isFormComplete = () => {
  return (
    isPersonalInfoComplete() &&
    isEmploymentComplete() &&
    isFinancialComplete() &&
    isKYCComplete()
  );
};
  

  return (
    <div className="loan-app-container">
            {/* Main Content (unchanged header/title) */}      
      <main className="main-content-loan">
        <div className="title-section">
          <div className="title-icon">
                        
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
                            
              <path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"></path>
                            <circle cx="12" cy="10" r="3"></circle>              
              <path d="M9 18h6"></path>            
            </svg>
                      
          </div>
                      
          <div>
                          <h1 className="page-title">Loan Application</h1>     
                  
          </div>
                    
        </div>
                {/* Form */}        
        <form className="form-wrapper" onSubmit={handleSubmit}>
                    {/* Personal Information */}   
          
          <section className="form-section">
  <div 
    className="section-header collapsible" 
    onClick={() => toggleTab("personalInfo")}
    style={{ cursor: 'pointer' }}
  >
    <div className="section-header-left">
      <div className={`check-icon-wrapper 
  ${activeTab === "personalInfo" ? "active" : ""} 
  ${isPersonalInfoComplete() ? "completed" : ""}`}
>
        <span className="check-icon">✓</span>
      </div>
      <div>
        <h3 className="section-title">Personal Information</h3>
        <p className="section-subtitle">Personal Identification and Residency Details</p>
      </div>
    </div>
    {/* Added expand icon to match other sections */}
    <span className="expand-icon">
      {activeTab === "personalInfo" ? "▲" : "▼"}
    </span>
  </div>

  {/* Conditionally show the grid only when the tab is active */}
  {activeTab === "personalInfo" && (
    <div className="form-grid">
       <div className="form-group">
                                
                <label className="form-label" htmlFor="firstName">
                  First name *
                </label>
                                
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  className="form-input"
                  value={formData.firstName}
    onChange={handleInputChange}
    required
                />
                              
              </div>
                            
              <div className="form-group">
                                
                <label className="form-label" htmlFor="lastName">
                  Last name *
                </label>
                                
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  className="form-input"
                  value={formData.lastName}
    onChange={handleInputChange}
    required
                />
                              
              </div>
                            
              <div className="form-group">
                                
                <label className="form-label" htmlFor="email">
                  Email address *
                </label>
                                
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="form-input"
                  autoComplete="Enter emailID"
                        value={formData.email}
    onChange={handleInputChange}
                />
                              
              </div>
                            
              <div className="form-group">
                                
                <label className="form-label" htmlFor="phoneNumber">
                  Phone number *
                </label>
                                
                <input
                  type="tel"
                  id="phoneNumber"
                  name="phoneNumber"
                  className="form-input"
                    value={formData.phoneNumber}
    onChange={handleInputChange}
                />
                              
              </div>
                            
              <div className="form-group">
                                
                <label className="form-label" htmlFor="ssn">
                  Social Security number*
                </label>
                                
                <input
                  type="text"
                  id="ssn"
                  name="ssn"
                  placeholder="XXX-XX-XXXX"
                  className="form-input"
                    value={formData.ssn}
    onChange={handleInputChange}
    required
                />
                              
              </div>
                            
              <div className="form-group">
                                
                <label className="form-label" htmlFor="dob">
                  Date of birth *
                </label>
                                
                <input
                  type="text"
                  id="dob"
                  name="dob"
                  placeholder="mm/dd/yyyy"
                  className="form-input"
                    value={formData.dob}
    onChange={handleInputChange}
                />
                              
              </div>

               <div className="form-group">
                                
                <label className="form-label" htmlFor="zipCode">
                  Zip code *
                </label>
                                
                <input
                  type="text"
                  id="zipCode"
                  name="zipCode"
                  placeholder="5 digit"
                  className="form-input"
                     value={formData.zipCode}
    onChange={handleInputChange}
                />          
              </div>

               <div className="form-group">
                                
                <label className="form-label" htmlFor="city">
                  City *
                </label>
                                
                <input
                  type="text"
                  id="city"
                  name="city"
                  className="form-input"
                    value={formData.city}
    onChange={handleInputChange}
                />
                              
              </div>
                            
              <div className="form-group full-width" style={{ position: "relative" }}>
                                
                <label className="form-label" htmlFor="streetAddress">
                  Street address *
                </label>
                                
                <input
                  type="text"
                  id="streetAddress"
                  name="streetAddress"
                  className="form-input"
                    value={formData.streetAddress}
    onChange={handleInputChange}
    autoComplete="off"
                />
                {/* CUSTOM SUGGESTIONS BOX */}
  {suggestions.length > 0 && (
    <ul className="address-suggestions">
      {suggestions.map((s, index) => (
        <li key={index} onClick={() => {
          setFormData(prev => ({
            ...prev,
            streetAddress: `${s.properties.housenumber || ''} ${s.properties.name}`.trim()
          }));
          setSuggestions([]); // Close dropdown
        }}>
          {s.properties.housenumber} {s.properties.name}, {s.properties.city}
        </li>
      ))}
    </ul>
  )}
                              
              </div>
                            
              <div className="form-group">
                                
                <label className="form-label" htmlFor="state">
                  State *
                </label>
                                
                <select id="state" name="state" className="form-select"  value={formData.state}
    onChange={handleInputChange}>
                  {/*                   <option>Select state</option>               
                    <option>New York</option>                  
                  <option>California</option>                  
                  <option>Texas</option>      */}
                  <option value="">Select state</option>
<option value="Alabama">Alabama</option>
<option value="Alaska">Alaska</option>
<option value="Arizona">Arizona</option>
<option value="Arkansas">Arkansas</option>
<option value="California">California</option>
<option value="Colorado">Colorado</option>
<option value="Connecticut">Connecticut</option>
<option value="Delaware">Delaware</option>
<option value="District of Columbia">District of Columbia</option>
<option value="Florida">Florida</option>
<option value="Georgia">Georgia</option>
<option value="Hawaii">Hawaii</option>
<option value="Idaho">Idaho</option>
<option value="Illinois">Illinois</option>
<option value="Indiana">Indiana</option>
<option value="Iowa">Iowa</option>
<option value="Kansas">Kansas</option>
<option value="Kentucky">Kentucky</option>
<option value="Louisiana">Louisiana</option>
<option value="Maine">Maine</option>
<option value="Maryland">Maryland</option>
<option value="Massachusetts">Massachusetts</option>
<option value="Michigan">Michigan</option>
<option value="Minnesota">Minnesota</option>
<option value="Mississippi">Mississippi</option>
<option value="Missouri">Missouri</option>
<option value="Montana">Montana</option>
<option value="Nebraska">Nebraska</option>
<option value="Nevada">Nevada</option>
<option value="New Hampshire">New Hampshire</option>
<option value="New Jersey">New Jersey</option>
<option value="New Mexico">New Mexico</option>
<option value="New York">New York</option>
<option value="North Carolina">North Carolina</option>
<option value="North Dakota">North Dakota</option>
<option value="Ohio">Ohio</option>
<option value="Oklahoma">Oklahoma</option>
<option value="Oregon">Oregon</option>
<option value="Pennsylvania">Pennsylvania</option>
<option value="Rhode Island">Rhode Island</option>
<option value="South Carolina">South Carolina</option>
<option value="South Dakota">South Dakota</option>
<option value="Tennessee">Tennessee</option>
<option value="Texas">Texas</option>
<option value="Utah">Utah</option>
<option value="Vermont">Vermont</option>
<option value="Virginia">Virginia</option>
<option value="Washington">Washington</option>
<option value="West Virginia">West Virginia</option>
<option value="Wisconsin">Wisconsin</option>
<option value="Wyoming">Wyoming</option>           
                </select>
                              
              </div>
                            
              <div className="form-group">
                                
                <label className="form-label" htmlFor="housingStatus">
                  Housing Status *
                </label>
                                
                <select
                  id="housingStatus"
                  name="housingStatus"
                  className="form-select"
                     value={formData.housingStatus}
    onChange={handleInputChange}
                >
                                    <option>Select housing status</option>     
                              <option>Rent</option>                  
                  <option>Own</option>                  
                  <option>Mortgage</option>                
                </select>
                              
              </div>

               <div className="form-group loan-amount-group">

                 <label className="form-label" htmlFor="loanAmt">
                  Loan Amount ($) *
                </label>

                  <input
                  type="text"
                  id="loanAmt"
                  name="loanAmt"
                  placeholder="Max: $5,000,000 for Business Loans.                     Max: $100,000 for Personal Loans"
                  className="form-input"
                     value={formData.loanAmt}
    onChange={handleInputChangeNumber}
                />

                </div>
    </div>
  )}
</section>
          
                    {/* Employment & Income */}          
          <section className="form-section">
                        
            <div
              className="section-header collapsible"
              onClick={() => toggleTab("employment")}
            >
                            
              <div className="section-header-left">
                                
               <div className={`check-icon-wrapper 
  ${activeTab === "employment" ? "active" : ""} 
  ${isEmploymentComplete() ? "completed" : ""}`}
>
                                    <span className="check-icon">✓</span>       
                          
                </div>
                                
                <div>
                                                      
                  <h3 className="section-title">Employment & Income</h3>       
                            
                  <p className="section-subtitle">
                                        Information about your employment and
                    income                   
                  </p>
                                  
                </div>
                              
              </div>
                            
              <span className="expand-icon">
                                {activeTab === "employment" ? "▲" : "▼"}       
                      
              </span>
                          
            </div>
                        
            {/* {activeTab === "employment" && (
              <div className="radio-group-container"> */}
              <div className={`radio-group-container ${activeTab === "employment" ? "visible" : "hidden"}`}>
                {/* The new radio button group */}                  
                <div
                  style={{
                    margin: "20px 90px",
                    display: "flex",
                    gap: "20px",
                    marginBottom: "10px",
                    fontFamily: "roboto",
                  }}
                >
                                      
                  <label className="radio">
                                          
                    <input
                      type="radio"
                      name="employmentMode"
                      value="JOB"
                      checked={selectedEmploymentType === "JOB"}
                      onChange={handleEmploymentTypeChange}
                    />
                                          
                    <span
                      style={{
                        marginLeft: "5px",
                        fontWeight:
                          selectedEmploymentType === "JOB" ? "bold" : "normal",
                      }}
                    >
                      JOB
                    </span>
                                        
                  </label>
                                      
                  <label className="radio">
                                          
                    <input
                      type="radio"
                      name="employmentMode"
                      value="BUSINESS"
                      checked={selectedEmploymentType === "BUSINESS"}
                      onChange={handleEmploymentTypeChange}
                    />
                                          
                    <span
                      style={{
                        marginLeft: "5px",
                        fontWeight:
                          selectedEmploymentType === "BUSINESS"
                            ? "bold"
                            : "normal",
                      }}
                    >
                      BUSINESS
                    </span>
                                        
                  </label>
                                    
                </div>
                                  {/* End of new radio button group */}         
                    
                <div className="form-grid">
                                  
                  {activeTab === "employment" &&
                  selectedEmploymentType === "JOB" && (
                    <JobFields 
                    formData={formData}
                    handleInputChange={handleInputChange}
                    />
                  )}
                 {activeTab === "employment" &&
                selectedEmploymentType === "BUSINESS" && (
                  <BusinessFields
                    formData={formData}
                    handleInputChange={handleInputChange}
                  />
                )}            
                </div>
              </div>
            {/* // )} */}
                      
          </section>
                    
          {/* Vehicle Information (File Uploads - IDs were already present) */} 
                  
          <section className="form-section">
                        
            <div
              className="section-header collapsible"
              onClick={() => toggleTab("financial")}
            >
                            
              <div className="section-header-left">
                                
                <div className={`check-icon-wrapper 
  ${activeTab === "financial" ? "active" : ""} 
  ${isFinancialComplete() ? "completed" : ""}`}
>
                                    <span className="check-icon">✓</span>       
                          
                </div>
                                
                <div>
                                    
                  <h3 className="section-title">Financial Documents</h3>       
                            
                  <p className="section-subtitle">
                                        Your official records to confirm income
                    and finance                   
                  </p>
                                  
                </div>
                              
              </div>
                            
              <span className="expand-icon">
                                {activeTab === "financial" ? "▲" : "▼"}         
                    
              </span>
                          
            </div>
                        
            {activeTab === "financial" && (
              <div 
              className="form-grid file-upload-grid"
              >
                                {/* Bank statements - pdf upload */}           
                    
                <div className="form-group">
                                    
                  <label
                    className="form-label required"
                    htmlFor="bank_statements_upload"
                  >
                                        Bank Statements (PDF)                   
                  </label>
                                    
                  <div className="file-input-container">
                                        
                    <input
                      type="file"
                      id="bank_statements_upload"
                      name="bank_statements_upload"
                      className="form-input-file"
                      accept=".pdf"
                      multiple
                      onChange={handleFileChange}
                    />
                                        
                    <label
                      htmlFor="bank_statements_upload"
                      className="custom-file-button"
                      onClick={(e) => e.stopPropagation()}
                    >
                                            Choose File(s)                     
                    </label>
                                        
                    <span className="file-name">{getFileNameDisplay("bank_statements_upload")}</span>           
                          
                  </div>
                                    
                  <p 
                  className="upload-hint"
                  >
                                        Upload 3-6 months of statements (PDF
                    only)                   
                  </p>
                                  
                </div>
                                {/* Pay stubs/ W-2/ 1099 -upload */}           
                    
                <div className="form-group">
                                    
                  <label
                    className="form-label required"
                    htmlFor="income_upload"
                  >
                                        Pay Stubs/W-2/1099                   
                  </label>
                                    
                  <div className="file-input-container">
                                        
                    <input
                      type="file"
                      id="income_upload"
                      name="income_upload"
                      className="form-input-file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      multiple
                      onChange={handleFileChange}
                    />
                                        
                    <label
                      htmlFor="income_upload"
                      className="custom-file-button"
                      onClick={(e) => e.stopPropagation()}
                    >
                                            Choose File(s)                     
                    </label>
                                        
                    <span className="file-name">{getFileNameDisplay("income_upload")}</span>           
                          
                  </div>
                                    
                  <p className="upload-hint">
                                        Upload recent pay stubs/Salary slips or latest tax
                    forms (PDF, JPG, PNG)                   
                  </p>
                                  
                </div>
                              
              </div>
            )}
                      
          </section>
          <section className="form-section">
                        
            <div
              className="section-header collapsible"
              onClick={() => toggleTab("personal")}
            >
                            
              <div className="section-header-left">
                                
                <div className={`check-icon-wrapper 
  ${activeTab === "personal" ? "active" : ""} 
  ${isKYCComplete() ? "completed" : ""}`}
>
                                    <span className="check-icon">✓</span>       
                          
                </div>
                <div>
                                    
                  <h3 className="section-title">
                    Personal Document Uploads (KYC)
                  </h3>
                                    
                  <p className="section-subtitle">
                                        Your personal records to verify the
                    identity and residency.                   
                  </p>
                                  
                </div>
                              
              </div>
                            
              <span className="expand-icon">
                                {activeTab === "personal" ? "▲" : "▼"}         
                    
              </span>
                          
            </div>
                        
            {activeTab === "personal" && (
              <div className="form-grid file-upload-grid">
                  
               <div className="form-group">
                                    
                  <label className="form-label required" htmlFor="dl_id_upload">
                                        Driver's License / State ID            
                          
                  </label>
                                    
                  <div className="file-input-container">
                                        
                    <input
                      type="file"
                      id="dl_id_upload"
                      name="dl_id_upload"
                      className="form-input-file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                    />
                                        
                    <label
                      htmlFor="dl_id_upload"
                      className="custom-file-button"
                      onClick={(e) => e.stopPropagation()}
                    >
                                            Choose File                     
                    </label>
                                        
                    <span className="file-name">{getFileNameDisplay("dl_id_upload")}</span>           
                          
                  </div>
                                    
                  <p className="upload-hint">
                                        Upload required ID (PDF, JPG, PNG)      
                                
                  </p>
                                  
                </div>
                        
                <div className="form-group">
                                    
                  <label className="form-label" htmlFor="passport_upload">
                                     Social Security Number (SSN)              
                        
                  </label>
                                    
                  <div className="file-input-container">
                                        
                    <input
                      type="file"
                      id="passport_upload"
                      name="passport_upload"
                      className="form-input-file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                    />
                                        
                    <label
                      htmlFor="passport_upload"
                      className="custom-file-button"
                      onClick={(e) => e.stopPropagation()}
                    >
                                            Choose File                     
                    </label>
                                        
                    <span className="file-name">{getFileNameDisplay("passport_upload")}</span>           
                          
                  </div>
                                    
                  <p className="upload-hint">
                                        Optional secondary ID (PDF, JPG, PNG)  
                                    
                  </p>
                                  
                </div>
                    
                <div className="form-group">
                                    
                  <label
                    className="form-label required"
                    htmlFor="por_upload"
                  >
                                        Proof of Residence                   
                  </label>
                                    
                  <div className="file-input-container">
                                        
                    <input
                      type="file"
                      id="por_upload"
                      name="por_upload"
                      className="form-input-file"
                      accept=".pdf"
                      multiple
                      onChange={handleFileChange}
                    />
                                        
                    <label
                      htmlFor="por_upload"
                      className="custom-file-button"
                      onClick={(e) => e.stopPropagation()}
                    >
                                            Choose File(s)                     
                    </label>
                                        
                    <span className="file-name">{getFileNameDisplay("por_upload")}</span>           
                          
                  </div>
                                    
                  <p className="upload-hint">
                                        Upload Utility Bill (Electric, Gas,
                    Water) * Mortgage Statement or Lease/Rental Agreement * Bank
                    or Credit Card Statement                   
                  </p>
                                  
                </div>
                                        
                    
                <div className="form-group">
                                    
                  <label
                    className="form-label"
                    htmlFor="poc_upload"
                  >
                                        Proof of Citizenship                 
                  </label>
                                    
                  <div className="file-input-container">
                                        
                    <input
                      type="file"
                      id="poc_upload"
                      name="poc_upload"
                      className="form-input-file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      multiple
                      onChange={handleFileChange}
                    />
                                        
                    <label
                      htmlFor="poc_upload"
                      className="custom-file-button"
                      onClick={(e) => e.stopPropagation()}
                    >
                                            Choose File(s)                     
                    </label>
                                        
                    <span className="file-name">{getFileNameDisplay("poc_upload")}</span>           
                          
                  </div>
                                    
                  <p className="upload-hint">
                                       Passport/ Birth certificate/ Naturalization
                     (PDF, JPG, PNG)                   
                  </p>
                </div>
              </div>
            )}
                      
          </section>  

          <div className="form-buttons">
            <button
              type="submit"
              className="submit-btn"
              onClick={handleApplicationSubmit}
              // disabled={!isFormComplete()}
  // style={{
  //   opacity: isFormComplete() ? 1 : 0.5,
  //   cursor: isFormComplete() ? "pointer" : "not-allowed",
  //   backgroundColor: isFormComplete() ? "#000048" : "rgb(0, 0, 72, 0.6)",
  // }}
            >
                            Submit application             
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default LoanDashboard;



