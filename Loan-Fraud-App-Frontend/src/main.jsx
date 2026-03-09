import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import LoanDashboard from "./pages/LoanDashboard.jsx";
import { Buffer } from "buffer";
import { BrowserRouter } from "react-router-dom";
window.global = window;
window.Buffer = Buffer;
import './assets/fonts/fonts.css';

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      {/* <LoanDashboard /> */}
    </BrowserRouter>
  </StrictMode>
);
