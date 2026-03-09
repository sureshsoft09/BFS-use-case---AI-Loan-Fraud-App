import Login from "./Login";
import "./App.css";
import { Routes, Route } from "react-router-dom";
import Layout from './pages/Layout';
import BankingDashboard from "./pages/BankingDashboard";
import LoanDashboard from "./pages/LoanDashboard";
import MainDashboard from "./pages/MainDashboard";
import { AppProvider } from './context/AppContext';
import './assets/fonts/fonts.css';

function App() {
  return (
    <AppProvider>
     <Routes>
       <Route path="/" element={<Login/>} />
       <Route element={<Layout />}>
        <Route path="/dashboard" element={<MainDashboard />} />
       <Route path="/banking-dashboard" element={<BankingDashboard />} />
       <Route path="/loan-dashboard" element={<LoanDashboard />} />
       </Route>
     </Routes>
    </AppProvider>
  );
}

export default App;
