import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

export function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ customers: 0, products: 0, lowStock: 0, challans: 0 });

  useEffect(() => {
    (async () => {
      const [customersRes, productsRes, lowStockRes, challansRes] = await Promise.all([
        api.get("/customers?limit=1"),
        api.get("/products?limit=1"),
        api.get("/products?lowStock=true&limit=1"),
        api.get("/challans?limit=1"),
      ]);
      setStats({
        customers: customersRes.data.pagination.total,
        products: productsRes.data.pagination.total,
        lowStock: lowStockRes.data.pagination.total,
        challans: challansRes.data.pagination.total,
      });
    })();
  }, []);

  return (
    <div className="page">
      <h1>Welcome, {user?.name}</h1>
      <p className="muted">Role: {user?.role}</p>

      <div className="stat-grid">
        <Link to="/customers" className="stat-card">
          <div className="stat-value">{stats.customers}</div>
          <div className="stat-label">Customers</div>
        </Link>
        <Link to="/products" className="stat-card">
          <div className="stat-value">{stats.products}</div>
          <div className="stat-label">Products</div>
        </Link>
        <Link to="/products?lowStock=true" className="stat-card warning">
          <div className="stat-value">{stats.lowStock}</div>
          <div className="stat-label">Low Stock Alerts</div>
        </Link>
        <Link to="/challans" className="stat-card">
          <div className="stat-value">{stats.challans}</div>
          <div className="stat-label">Sales Challans</div>
        </Link>
      </div>
    </div>
  );
}
