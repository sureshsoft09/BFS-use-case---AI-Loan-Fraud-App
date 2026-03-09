import React from "react";
import { useAppContext } from "../context/AppContext";
import "./CommentaryBox.css";

const CommentaryBox = () => {
  const { state } = useAppContext();
  const { messages, isProcessing, error, fileName, currentStep,processStatus } = state;

  const agentSteps = [
    "Upload Agent",
    "Preprocessor Agent",
    "SAR Narrative Agent",
    "Evaluator Agent",
    "Formatter Agent",
    "Finalizing Results",
  ];

  const overallStatus = processStatus ? "Processing": "Completed";

    console.log("isProcessing", isProcessing);

  const progressText = isProcessing
    ? "In Progress"
    : error
    ? "Failed"
    : "All tasks completed";

  return (
    <div className="description-box">
      {!isProcessing ? (
        <h3 className="agent-description">Execution Panel</h3>
      ) : (
        <>
          {/* <h3 className="agent-action">Agent in Action...</h3> */}
          <>
             {" "}
            <span className="process-stream-container">
                               {" "}
              <span className="process-stream-label">
                                    Process Stream for Applicant ID:            
                     {" "}
              </span>
                               {" "}
              <span className="process-stream-filename">
                                    {fileName || "0001"}                 {" "}
              </span>
            </span>
            <div className="activity-time">
                              Status: {overallStatus} • {state.progress}%      
            </div>
          </>
          {messages.length > 0 && <h4>Progress:</h4>} 
          <div className="progress-bar-sidebar">
            <div
              className="progress-fill-sidebar"
              style={{ width: `${state.progress}%` }}
            ></div>
          </div>
                      {/* Radio buttons */}
          <div className="status-buttons">
            <label>
              <input
                type="radio"
                name="status"
                checked={isProcessing && !error}
                readOnly
              />
              Running
            </label>
            <label>
              <input type="radio" name="status" checked={!!error} readOnly />
              Error
            </label>
          </div>
          <hr
            style={{
              margin: "30px 0 10px 0",
              borderTop: "1px solid rgba(0,0,0,0.1)",
            }}
          />
          <div className="logs-container">
            {messages.length > 0 && <h4>Live Commentary logs:</h4>}
            {messages.map((msg, index) => (
              <p key={index}>
                <span className="text"> * {msg}</span>
              </p>
            ))}

            {/* <div className="task-queue">
              <h4>Task Queue:</h4>
              {isProcessing ? (
                currentStep < agentSteps.length - 1 ? (
                  <p style={{ fontWeight: "500" }}>
                    ⏭️ {agentSteps[currentStep + 1]}
                  </p>
                ) : (
                  <p style={{ fontWeight: "500" }}>
                    ⏭️ {agentSteps[currentStep]}
                  </p>
                )
              ) : (
                <p style={{ fontWeight: "bold" }}>✅ All tasks completed!</p>
              )}
            </div> */}
          </div>
        </>
      )}
    </div>
  );
};

export default CommentaryBox;
