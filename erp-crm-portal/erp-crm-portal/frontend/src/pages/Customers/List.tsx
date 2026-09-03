import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

interface Customer {
  id: string;
  name: string;
  mobile: string;
  businessName?: string;
  customerType: string;
  status: string;
  createdAt: string;
}

export function CustomerList() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const canEdit = user?.role === "ADMIN" || user?.role === "SALES";

  const load = async () => {
    const res = await api.get("/customers", { params: { search, status: status || undefined, page, limit: 10 } });
    setCustomers(res.data.data);
    setTotalPages(res.data.pagination.totalPages);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Customers</h1>
        {canEdit && <Link to="/customers/new" className="btn">+ Add Customer</Link>}
      </div>

      <form className="filter-bar" onSubmit={handleSearch}>
        <input placeholder="Search by name, mobile, business..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="LEAD">Lead</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <button type="submit">Search</button>
      </form>

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Mobile</th>
            <th>Business</th>
            <th>Type</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id}>
              <td><Link to={`/customers/${c.id}`}>{c.name}</Link></td>
              <td>{c.mobile}</td>
              <td>{c.businessName || "-"}</td>
              <td>{c.customerType}</td>
              <td><span className={`status-pill status-${c.status.toLowerCase()}`}>{c.status}</span></td>
            </tr>
          ))}
          {customers.length === 0 && (
            <tr><td colSpan={5} className="muted">No customers found.</td></tr>
          )}
        </tbody>
      </table>

      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
        <span>Page {page} of {totalPages || 1}</span>
        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>
    </div>
  );
}
