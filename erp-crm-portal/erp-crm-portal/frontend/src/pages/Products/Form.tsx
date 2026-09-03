import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, apiErrorMessage } from "../../api/client";

const empty = { name: "", sku: "", category: "", unitPrice: "", stock: "0", minStock: "0", location: "" };

export function ProductForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [form, setForm] = useState<any>(empty);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit) {
      api.get(`/products/${id}`).then((res) => {
        const p = res.data.data;
        setForm({ ...p, category: p.category || "", location: p.location || "", unitPrice: String(p.unitPrice), stock: String(p.stock), minStock: String(p.minStock) });
      });
    }
  }, [id, isEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f: any) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        sku: form.sku,
        category: form.category,
        location: form.location,
        unitPrice: Number(form.unitPrice),
        minStock: Number(form.minStock),
        ...(isEdit ? {} : { stock: Number(form.stock) }),
      };
      if (isEdit) {
        await api.put(`/products/${id}`, payload);
      } else {
        await api.post("/products", payload);
      }
      navigate("/products");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h1>{isEdit ? "Edit Product" : "Add Product"}</h1>
      {error && <div className="alert-error">{error}</div>}
      <form className="form-grid" onSubmit={handleSubmit}>
        <label>Product Name *<input name="name" value={form.name} onChange={handleChange} required /></label>
        <label>SKU / Code *<input name="sku" value={form.sku} onChange={handleChange} required disabled={isEdit} /></label>
        <label>Category<input name="category" value={form.category} onChange={handleChange} /></label>
        <label>Unit Price *<input name="unitPrice" type="number" step="0.01" min="0" value={form.unitPrice} onChange={handleChange} required /></label>
        {!isEdit && (
          <label>Opening Stock<input name="stock" type="number" min="0" value={form.stock} onChange={handleChange} /></label>
        )}
        <label>Minimum Stock Alert Qty<input name="minStock" type="number" min="0" value={form.minStock} onChange={handleChange} /></label>
        <label>Location / Warehouse<input name="location" value={form.location} onChange={handleChange} /></label>
        {isEdit && <p className="muted full">To change stock quantity, use the "Stock" action from the product list (it is logged as a stock movement).</p>}
        <div className="full form-actions">
          <button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Product"}</button>
        </div>
      </form>
    </div>
  );
}
