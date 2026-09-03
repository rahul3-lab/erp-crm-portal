import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, apiErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

export function CustomerDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [customer, setCustomer] = useState<any>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const canEdit = user?.role === "ADMIN" || user?.role === "SALES";

  const load = async () => {
    const res = await api.get(`/customers/${id}`);
    setCustomer(res.data.data);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const addFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.post(`/customers/${id}/follow-up`, { note });
      setNote("");
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  if (!customer) return <div className="page">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>{customer.name}</h1>
        {canEdit && <Link to={`/customers/${id}/edit`} className="btn">Edit</Link>}
      </div>

      <div className="detail-grid">
        <div><strong>Mobile:</strong> {customer.mobile}</div>
        <div><strong>Email:</strong> {customer.email || "-"}</div>
        <div><strong>Business:</strong> {customer.businessName || "-"}</div>
        <div><strong>GST:</strong> {customer.gstNumber || "-"}</div>
        <div><strong>Type:</strong> {customer.customerType}</div>
        <div><strong>Status:</strong> <span className={`status-pill status-${customer.status.toLowerCase()}`}>{customer.status}</span></div>
        <div><strong>Follow-up date:</strong> {customer.followUpDate ? customer.followUpDate.slice(0, 10) : "-"}</div>
        <div className="full"><strong>Address:</strong> {customer.address || "-"}</div>
        <div className="full"><strong>Notes:</strong> {customer.notes || "-"}</div>
      </div>

      <h2>Follow-up History</h2>
      {canEdit && (
        <form className="inline-form" onSubmit={addFollowUp}>
          <input placeholder="Add a follow-up note..." value={note} onChange={(e) => setNote(e.target.value)} required />
          <button type="submit">Add</button>
        </form>
      )}
      {error && <div className="alert-error">{error}</div>}
      <ul className="follow-up-list">
        {customer.followUps?.map((f: any) => (
          <li key={f.id}>
            <span>{f.note}</span>
            <span className="muted small">{f.createdBy?.name} - {new Date(f.createdAt).toLocaleString()}</span>
          </li>
        ))}
        {customer.followUps?.length === 0 && <li className="muted">No follow-ups yet.</li>}
      </ul>

      <h2>Sales Challans</h2>
      <table className="data-table">
        <thead><tr><th>Challan #</th><th>Status</th><th>Total Qty</th><th>Date</th></tr></thead>
        <tbody>
          {customer.challans?.map((c: any) => (
            <tr key={c.id}>
              <td><Link to={`/challans/${c.id}`}>{c.challanNumber}</Link></td>
              <td>{c.status}</td>
              <td>{c.totalQuantity}</td>
              <td>{new Date(c.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
          {customer.challans?.length === 0 && <tr><td colSpan={4} className="muted">No challans yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
