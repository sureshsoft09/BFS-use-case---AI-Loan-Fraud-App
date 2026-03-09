import React, { createContext, useReducer, useContext } from "react";

const initialState = {
  messages: [],
  applicantId: null,
  narrative: "",
  isProcessing: false,
  processStatus: "",
  fileName: null,
  error: null,
  success: false,
  statusMessage: "",
  progress: 0,
  finished: false,
  selectedAgent: "dashboard", // - the nav which would be active and default
  activeHeading: "Dashboard Overview",
  addressVerificationData: null,  // for Rudresh 
loanValidationData: null,
  narratives: {
    preprocessor: "",
    sarNarrative: "",
    evaluator: "",
    formatter: "",
  },

  // activeTab: "preprocessor" | "sarNarrative" | "evaluator" | "formatter",
  activeTab: "KYC_Agent",
  activeResponseTab: "preprocessor",
};

const AppContext = createContext(undefined);

const appReducer = (state, action) => {
  switch (action.type) {
 
    case "START_PROCESSING":
  return {
    ...state,
    isProcessing: true,
    processStatus: true,
    fileName: null, // Good practice to reset or set to null/default
    narrative: "",
    error: null,
    success: false,
    // currentStep: 0,
    selectedAgent: "KYC_Agent",
  };
    case "ADD_MESSAGE":
      const newMessages = [...state.messages, action.payload];
      return {
        ...state,
        messages: newMessages.slice(-9),
        // messages: newMessages,
      };
    case "SET_NARRATIVE":
      return {
        ...state,
        narrative: action.payload,
        isProcessing: false,
      };
    case "SET_ERROR":
      return {
        ...state,
        error: action.payload,
        isProcessing: false,
        success: false,
      };
    case "UPLOAD_SUCCESS":
      return {
        ...state,
        processStatus: false,
        success: true,
        error: null,
      };
    case "RESET":
      return { ...initialState, currentStep: 0 };

    case "SET_STATUS_MESSAGE":
      return {
        ...state,
        statusMessage: action.payload,
      };

    case "SET_PROGRESS":
      return {
        ...state,
        progress: action.payload, // Update progress state
      };

    case "SET_CURRENT_STEP":
      return {
        ...state,
        currentStep: action.payload, // Update current step state
      };

    case "SET_FINISHED":
      return {
        ...state,
        finished: action.payload, // Update finished state
      };

    case "SET_COMPLETED_STEP":
      return {
        ...state,
        completedStep: action.payload, // Update current step state
      };

    case "SET_SELECTED_AGENT":
      return {
        ...state,
        selectedAgent: action.payload, // Update selected agent
      };

    case "SET_ACTIVE_HEADING":
      return {
        ...state,
        activeHeading: action.payload, // Update active heading
      };

    case "SET_NARRATIVE_FOR_STEP":
      return {
        ...state,
        narratives: {
          ...state.narratives,
          [action.payload.step]: action.payload.text,
        },
      };

    case "SET_ACTIVE_TAB":
      return {
        ...state,
        activeTab: action.payload,
      };

    case "SET_ACTIVE_RESPONSE_TAB":
      return {
        ...state,
        activeResponseTab: action.payload,
      };

       // NEW REDUCER CASE: Stores the parsed JSON body of the API response - Rudresh
    case "SET_ADDRESS_VERIFICATION_DATA":
      return {
        ...state,
        addressVerificationData: action.payload,
      };
 // NEW REDUCER CASE: SU[priyas]
  case "SET_LOAN_VALIDATION_DATA":
      return {
        ...state,
        loanValidationData: action.payload,
      };

case "SET_APPLICANT_ID" : {
      return {
        ...state,
        applicantId: action.payload,
      };
}

    default:
      return state;
  }
};

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined)
    throw new Error("useAppContext must be used within an AppProvider");
  return context;
};
