import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

export function ChallanList() {
  const { user } = useAuth();
  const [challans, setChallans] = useState<any[]>([]);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState("");
  const canEdit = user?.role === "ADMIN" || user?.role === "SALES";

  const load = async () => {
    const res = await api.get("/challans", { params: { status: status || undefined, page, limit: 10 } });
    setChallans(res.data.data);
    setTotalPages(res.data.pagination.totalPages);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  const act = async (id: string, action: "confirm" | "cancel") => {
    setError("");
    try {
      await api.put(`/challans/${id}/${action}`);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Sales Challans</h1>
        {canEdit && <Link to="/challans/new" className="btn">+ New Challan</Link>}
      </div>

      <div className="filter-bar">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <table className="data-table">
        <thead><tr><th>Challan #</th><th>Customer</th><th>Total Qty</th><th>Status</th><th>Date</th>{canEdit && <th>Actions</th>}</tr></thead>
        <tbody>
          {challans.map((c) => (
            <tr key={c.id}>
              <td><Link to={`/challans/${c.id}`}>{c.challanNumber}</Link></td>
              <td>{c.customer?.name}</td>
              <td>{c.totalQuantity}</td>
              <td><span className={`status-pill status-${c.status.toLowerCase()}`}>{c.status}</span></td>
              <td>{new Date(c.createdAt).toLocaleDateString()}</td>
              {canEdit && (
                <td>
                  {c.status === "DRAFT" && (
                    <>
                      <button className="btn-link" onClick={() => act(c.id, "confirm")}>Confirm</button>{" | "}
                      <button className="btn-link" onClick={() => act(c.id, "cancel")}>Cancel</button>
                    </>
                  )}
                  {c.status === "CONFIRMED" && (
                    <button className="btn-link" onClick={() => act(c.id, "cancel")}>Cancel</button>
                  )}
                </td>
              )}
            </tr>
          ))}
          {challans.length === 0 && <tr><td colSpan={6} className="muted">No challans found.</td></tr>}
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
