// components/Navbar.jsx
import React from 'react';
import { useLocation } from 'react-router-dom';
import './Navbar.css'; // Add styling here
import CognizantLogo from '../assets/cogni-logo.svg'; 
import Profile from '../assets/profile-pic.png';
import { FiSearch } from 'react-icons/fi';


const Navbar = () => {
  const location = useLocation();
  const isBankingDashboard = location.pathname.includes('/banking');
  return (
    <nav className="main-navbar">
      <div className="nav-left">
        {/* Replace with an <img> tag for the actual logo */}
        <div className="logo-placeholder">
              <img src={CognizantLogo} alt='Cognizant Logo' className='logo-img'/>

            </div> 
        <span className="brand-name">Cognizant</span>
      </div>

      {/* Middle Section: Search Bar */}
      <div className="nav-center">
        {isBankingDashboard && (
        <div className="search-container">
          <div className="search-input-wrapper">
            <FiSearch className="search-icon" />
            <input 
              type="text" 
              placeholder="Search by Application ID, Customer Name or ID" 
              className="search-input"
            />
          </div>
          <button className="search-button">Search</button>
        </div>
        )}
      </div>
      
      <div className="nav-right">
        <div className="admin-info">
          <p className="admin-name">Admin</p>
          <p className="admin-email">admin321@bankofamerica.com</p>
        </div>
        <img 
          src={Profile}
          alt="profile" 
          className="profile-pic" 
        />
      </div>
    </nav>
  );
};

export default Navbar;