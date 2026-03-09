import React, { useState } from "react"; // Import useState
import { useAppContext } from "../context/AppContext";
import "./DescriptionBox.css";

const DescriptionBox = () => {
  const { state, dispatch } = useAppContext();
  const { messages, fileName } = state;
  const currentStep = 1;
  const [applicantId, setApplicantId] = useState("");
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  // -----------------------------------------------

  const agentSteps = [
    "Upload Agent",
    "Preprocessor Agent",
    "SAR Narrative Agent",
    "Evaluator Agent",
    "Formatter Agent",
    "Finalizing Results",
  ];

  // 9	While setting conditions for the medium risk	Applying conditional loan parameters...
  // 10	Just before "Processing Complete."	Finalizing decision and generating report...

  // --- New Function to Handle API Call ---
  const handleStartClick = async () => {
    // Basic validation
    if (!applicantId) {
      setApiError("Please enter an Applicant ID.");
      return;
    }
    dispatch({
      type: "ADD_MESSAGE",
      payload: "Initializing secure connection...",
    });
    dispatch({
      type: "SET_PROGRESS",
      payload: 10,
    });

    setTimeout(() => {
      dispatch({
        type: "SET_PROGRESS",
        payload: 15,
      });
    }, 1500);

    setTimeout(() => {
      dispatch({
        type: "SET_PROGRESS",
        payload: 20,
      });
    }, 2200);

    dispatch({
      type: "START_PROCESSING",
      // No payload needed!
    });

    // Clear previous errors and set loading state
    setApiError(null);
    setIsApiLoading(true);

    const apiUrl =
      // "https://9psgf1hmt5.execute-api.us-west-2.amazonaws.com/v1/address-verify";
      "https://oifr8crfw4.execute-api.us-west-2.amazonaws.com/v1/address-agent";

    const payload = {
    
      applicationDetails: {
        applicationId: `${applicantId}`,
      },
    };

    // Initial log message delay
    let currentDelay = 2000; // Start after 2 seconds

    setTimeout(() => {
      dispatch({ type: "ADD_MESSAGE", payload: "KYC Agent has kicked Off..." }); //OK
      dispatch({
        type: "SET_PROGRESS",
        payload: 30,
      });
    }, currentDelay);

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      // console.log("data from address api", data);

      // --- Log Messages with 1.5s Cumulative Delay ---
      const logInterval = 700;

      currentDelay += logInterval;

      setTimeout(() => {
        dispatch({
          type: "ADD_MESSAGE",
          payload: "Verifying Applicant ID against records...", //OK
        });
        dispatch({
          type: "SET_PROGRESS",
          payload: 35,
        });
      }, currentDelay);

      currentDelay += logInterval;

      setTimeout(() => {
        dispatch({
          type: "ADD_MESSAGE",
          payload: "Encrypting and staging document data...", //OK
        });
        dispatch({
          type: "SET_PROGRESS",
          payload: 38,
        });
      }, currentDelay);
      currentDelay += logInterval;

      setTimeout(() => {
        dispatch({
          type: "ADD_MESSAGE",
          payload: "Cross-checking public address records...", //OK
        });
        dispatch({
          type: "SET_PROGRESS",
          payload: 42,
        });
      }, currentDelay);
      currentDelay += logInterval;

      setTimeout(() => {
        dispatch({
          type: "ADD_MESSAGE",
          payload: "Running deep-scan address verification...",
        });
        dispatch({
          type: "SET_PROGRESS",
          payload: 47,
        });
      }, currentDelay);
      currentDelay += logInterval;

      setTimeout(() => {
        dispatch({
          type: "ADD_MESSAGE",
          payload: "KYC documents successfully validated.",
        });
        dispatch({
          type: "SET_PROGRESS",
          payload: 48,
        });
      }, currentDelay);
      currentDelay += logInterval;

      setTimeout(() => {
        dispatch({
          type: "ADD_MESSAGE",
          payload: "Address Verification Report generated.",
        });
        dispatch({
          type: "SET_PROGRESS",
          payload: 50,
        });
      }, currentDelay);
      currentDelay += logInterval;

      setTimeout(() => {
        dispatch({
          type: "ADD_MESSAGE",
          payload: "Loan Validation process kicked-off.",
        });
      }, currentDelay);
      currentDelay += logInterval;

      setTimeout(() => {
        dispatch({
          type: "ADD_MESSAGE",
          payload: "Fetching complete applicant's data...",
        });
      }, currentDelay);
      currentDelay += logInterval;

      setTimeout(() => {
        dispatch({
          type: "ADD_MESSAGE",
          payload: "Financial data analysis in progress...",
        });
      }, currentDelay);
      currentDelay += logInterval;

      if (!response.ok) {
        // Use the error message from the API response if available
        throw new Error(
          data.message ||
            `API validation failed with status: ${response.status}`
        );
      } // Check for success and handle the nested JSON string body

      // console.log('API Success for Applicant ID:', applicantId, 'Data:', data);
      if (data.statusCode === 200 && data.body) {
        // 1. Parse the nested JSON string body
        // console.log("data.body", data.body);
        const parsedJsonBody = JSON.parse(data.body);

        // 2. Dispatch only the clean, parsed object
        setTimeout(() => {
          dispatch({
            type: "SET_ADDRESS_VERIFICATION_DATA",
            payload: parsedJsonBody,
          });
        }, 7000);

        // console.log("parsedJSONbody", parsedJsonBody);
      } else {
        // Handle API error case
      }
    } catch (err) {
      console.error("API Error:", err);
      setApiError(
        err.message || "An unknown error occurred during loan validation."
      );
    }
    //  finally {
    //   // Revert loading state after API call completes
    //   setIsApiLoading(false);
    // }
    setTimeout(() => {
      dispatch({
        type: "SET_PROGRESS",
        payload: 60,
      });
      dispatch({
        type: "ADD_MESSAGE",
        payload: "Checking Fraud Indicators...",
      });
    }, currentDelay);

    const apiUrl2 =
      // "https://uy0uil31b8.execute-api.us-west-2.amazonaws.com/FL_sn/FL_rn";
      "https://uy0uil31b8.execute-api.us-west-2.amazonaws.com/FL_sn/FL_rn";

    const payload2 = {
      // "body": "{\"applicantId\": \"LN-APP-857504\"}" //medium-risk
      // "body": "{\"applicantId\": \"LN-APP-857503\"}" // high-risk
      body: `{"applicantId": "${applicantId}"}`,
    };
    let logInterval = 1500;

    try {
      const response = await fetch(apiUrl2, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload2),
      });

      const data = await response.json();

      if (!response.ok) {
        // Use the error message from the API response if available
        throw new Error(
          data.message ||
            `API validation failed with status: ${response.status}`
        );
      } // Check for success and handle the nested JSON string body

      // console.log('API Success for Applicant ID:', applicantId, 'Data:', data);
      if (data.statusCode === 200 && data.body) {
        // 1. Parse the nested JSON string body
        const parsedJsonBody = JSON.parse(data.body); //Second API Response Parsed Body
        setTimeout(() => {
          dispatch({
            type: "ADD_MESSAGE",
            payload: "Checking Credit Score...",
          });
          dispatch({
            type: "SET_PROGRESS",
            payload: 65,
          });
        }, currentDelay);
        currentDelay += logInterval;

        // 2. Dispatch only the clean, parsed object

        setTimeout(() => {
          dispatch({
            type: "SET_LOAN_VALIDATION_DATA",
            payload: parsedJsonBody,
          });
          dispatch({
            type: "ADD_MESSAGE",
            payload: "Loan Validation Report generated...",
          });
        }, 20000);

        setTimeout(() => {
          dispatch({
            type: "ADD_MESSAGE",
            payload: "Checking Loan-to-Income (LTI) Ratio...",
          });
          dispatch({
            type: "SET_PROGRESS",
            payload: 70,
          });
        }, currentDelay);
        currentDelay += logInterval;

        setTimeout(() => {
          dispatch({
            type: "ADD_MESSAGE",
            payload: "Checking Debt-to-Income (DTI) Ratio...",
          });
          dispatch({
            type: "SET_PROGRESS",
            payload: 80,
          });
        }, currentDelay + 500);
        currentDelay += logInterval;

        setTimeout(() => {
          dispatch({
            type: "SET_PROGRESS",
            payload: 90,
          });
          dispatch({
            type: "ADD_MESSAGE",
            payload: "Generating Final Response...",
          });
        }, currentDelay + 500);
        currentDelay += logInterval;

        // console.log("parsedJSONbody-2", parsedJsonBody);
      } else {
        throw new Error(
          data.message ||
            `Loan validation failed with status code: ${data.statusCode}`
        );
      }
    } catch (err) {
      console.error("This is the error", err);
      setApiError(
        err.message || "An unknown error occurred during loan validation."
      );
      dispatch({
        type: "SET_LOAN_VALIDATION_ERROR", // <- Use a dedicated error type
        payload: err.message,
      });
      console.log("Dispatched loan validation error to context");
    } finally {
      setTimeout(() => {
        dispatch({
          type: "UPLOAD_SUCCESS",
        });
        dispatch({
          type: "SET_PROGRESS",
          payload: 100,
        });
      }, currentDelay + 3000);
      console.log("currentDelay before final steps:", currentDelay);
      currentDelay += logInterval;
      // Revert loading state after API call completes
      setIsApiLoading(false);
    }
  };

  return (
    <div className="applicant-box">
      <>
        <h3 className="agent-description">Enter Applicant Id</h3>
        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
            marginTop: "10px",
            marginBottom: "10px",
          }}
        >
          {/* Input Field */}
          <input
            type="text"
            value={applicantId}
            onChange={(e) => setApplicantId(e.target.value)}
            placeholder="Applicant ID"
            disabled={isApiLoading} // Disable input while loading
            style={{
              padding: "8px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              flexGrow: 1,
            }}
          />
          <button
            onClick={handleStartClick}
            disabled={isApiLoading || !applicantId}
            style={{
              padding: "8px 22px",
              backgroundColor: "#000048",
              color: "darkgray",
              border: "none",
              borderRadius: "4px",
              cursor: isApiLoading || !applicantId ? "not-allowed" : "pointer",
            }}
          >
            {isApiLoading ? "Starting..." : "Start"}
          </button>
        </div>
      </>
    </div>
  );
};

export default DescriptionBox;
