import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, apiErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

export function ChallanDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [challan, setChallan] = useState<any>(null);
  const [error, setError] = useState("");
  const canEdit = user?.role === "ADMIN" || user?.role === "SALES";

  const load = async () => {
    const res = await api.get(`/challans/${id}`);
    setChallan(res.data.data);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const act = async (action: "confirm" | "cancel") => {
    setError("");
    try {
      await api.put(`/challans/${id}/${action}`);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  if (!challan) return <div className="page">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Challan {challan.challanNumber}</h1>
        <span className={`status-pill status-${challan.status.toLowerCase()}`}>{challan.status}</span>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <div className="detail-grid">
        <div><strong>Customer:</strong> {challan.customer?.name}</div>
        <div><strong>Mobile:</strong> {challan.customer?.mobile}</div>
        <div><strong>Total Quantity:</strong> {challan.totalQuantity}</div>
        <div><strong>Created by:</strong> {challan.createdBy?.name}</div>
        <div><strong>Date:</strong> {new Date(challan.createdAt).toLocaleString()}</div>
      </div>

      <h2>Line Items</h2>
      <table className="data-table">
        <thead><tr><th>Product</th><th>SKU</th><th>Unit Price (snapshot)</th><th>Qty</th><th>Subtotal</th></tr></thead>
        <tbody>
          {challan.items.map((it: any) => (
            <tr key={it.id}>
              <td>{it.productNameSnapshot}</td>
              <td>{it.productSkuSnapshot}</td>
              <td>₹{Number(it.unitPriceSnapshot).toFixed(2)}</td>
              <td>{it.quantity}</td>
              <td>₹{(Number(it.unitPriceSnapshot) * it.quantity).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {canEdit && challan.status === "DRAFT" && (
        <div className="form-actions">
          <button onClick={() => act("confirm")}>Confirm Challan (deduct stock)</button>
          <button className="btn-secondary" onClick={() => act("cancel")}>Cancel Challan</button>
        </div>
      )}
      {canEdit && challan.status === "CONFIRMED" && (
        <div className="form-actions">
          <button className="btn-secondary" onClick={() => act("cancel")}>Cancel Challan (restock)</button>
        </div>
      )}
    </div>
  );
}
