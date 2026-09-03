import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, apiErrorMessage } from "../../api/client";

interface LineItem {
  productId: string;
  quantity: number;
}

export function ChallanForm() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ productId: "", quantity: 1 }]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/customers", { params: { limit: 100 } }).then((res) => setCustomers(res.data.data));
    api.get("/products", { params: { limit: 100 } }).then((res) => setProducts(res.data.data));
  }, []);

  const updateItem = (idx: number, field: keyof LineItem, value: string) => {
    setItems((its) => its.map((it, i) => (i === idx ? { ...it, [field]: field === "quantity" ? Number(value) : value } : it)));
  };

  const addRow = () => setItems((its) => [...its, { productId: "", quantity: 1 }]);
  const removeRow = (idx: number) => setItems((its) => its.filter((_, i) => i !== idx));

  const stockFor = (productId: string) => products.find((p) => p.id === productId)?.stock ?? null;

  const submit = async (status: "DRAFT" | "CONFIRMED") => {
    setError("");
    setLoading(true);
    try {
      const payload = {
        customerId,
        status,
        items: items.filter((i) => i.productId && i.quantity > 0),
      };
      if (!payload.customerId) throw new Error("Please select a customer");
      if (payload.items.length === 0) throw new Error("Please add at least one product line");

      const res = await api.post("/challans", payload);
      navigate(`/challans/${res.data.data.id}`);
    } catch (err: any) {
      setError(err?.response ? apiErrorMessage(err) : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h1>New Sales Challan</h1>
      {error && <div className="alert-error">{error}</div>}

      <label className="block">Customer *
        <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
          <option value="">Select customer...</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.mobile})</option>)}
        </select>
      </label>

      <h2>Products</h2>
      <table className="data-table">
        <thead><tr><th>Product</th><th>Available Stock</th><th>Quantity</th><th></th></tr></thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx}>
              <td>
                <select value={item.productId} onChange={(e) => updateItem(idx, "productId", e.target.value)}>
                  <option value="">Select product...</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
              </td>
              <td>{item.productId ? stockFor(item.productId) : "-"}</td>
              <td><input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} style={{ width: 80 }} /></td>
              <td>{items.length > 1 && <button type="button" className="btn-link" onClick={() => removeRow(idx)}>Remove</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="btn-secondary" onClick={addRow}>+ Add Product Line</button>

      <div className="form-actions">
        <button type="button" className="btn-secondary" disabled={loading} onClick={() => submit("DRAFT")}>Save as Draft</button>
        <button type="button" disabled={loading} onClick={() => submit("CONFIRMED")}>Save & Confirm (deducts stock)</button>
      </div>
    </div>
  );
}
