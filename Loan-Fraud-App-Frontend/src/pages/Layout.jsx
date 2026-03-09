// components/Layout.jsx
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const Layout = () => {
  const containerStyle = {
    zoom: "87%",
    minHeight: "125vh",
    width: "100%",
    transformOrigin: "top left"
  };
  return (
    <div className="app-container" style={containerStyle}>
      <Navbar />
      <div className="page-content">
        <Outlet /> {/* This is where BankingDashboard, LoanDashboard, etc., will render */}
      </div>
    </div>
  );
};

export default Layout;