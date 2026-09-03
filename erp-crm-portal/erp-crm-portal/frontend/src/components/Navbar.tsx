import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="navbar">
      <div className="navbar-brand">ERP + CRM Portal</div>
      <nav className="navbar-links">
        <NavLink to="/" end>Dashboard</NavLink>
        <NavLink to="/customers">Customers</NavLink>
        <NavLink to="/products">Products</NavLink>
        <NavLink to="/challans">Sales Challans</NavLink>
      </nav>
      <div className="navbar-user">
        <span className="badge">{user.role}</span>
        <span>{user.name}</span>
        <button onClick={handleLogout} className="btn-link">Logout</button>
      </div>
    </header>
  );
}
