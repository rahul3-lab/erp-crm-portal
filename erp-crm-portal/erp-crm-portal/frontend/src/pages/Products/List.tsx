import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, apiErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

interface Product {
  id: string;
  name: string;
  sku: string;
  category?: string;
  unitPrice: string;
  stock: number;
  minStock: number;
  location?: string;
}

export function ProductList() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [lowStock, setLowStock] = useState(searchParams.get("lowStock") === "true");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [movementFor, setMovementFor] = useState<Product | null>(null);
  const canEdit = user?.role === "ADMIN" || user?.role === "WAREHOUSE";

  const load = async () => {
    const res = await api.get("/products", { params: { search, lowStock: lowStock || undefined, page, limit: 10 } });
    setProducts(res.data.data);
    setTotalPages(res.data.pagination.totalPages);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, lowStock]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const toggleLowStock = () => {
    const next = !lowStock;
    setLowStock(next);
    setSearchParams(next ? { lowStock: "true" } : {});
    setPage(1);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Products & Inventory</h1>
        {canEdit && <Link to="/products/new" className="btn">+ Add Product</Link>}
      </div>

      <form className="filter-bar" onSubmit={handleSearch}>
        <input placeholder="Search by name, SKU, category..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <label className="checkbox-label">
          <input type="checkbox" checked={lowStock} onChange={toggleLowStock} /> Low stock only
        </label>
        <button type="submit">Search</button>
      </form>

      <table className="data-table">
        <thead>
          <tr><th>Name</th><th>SKU</th><th>Category</th><th>Price</th><th>Stock</th><th>Location</th>{canEdit && <th>Actions</th>}</tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className={p.stock <= p.minStock ? "row-warning" : ""}>
              <td>{p.name}</td>
              <td>{p.sku}</td>
              <td>{p.category || "-"}</td>
              <td>₹{Number(p.unitPrice).toFixed(2)}</td>
              <td>{p.stock} {p.stock <= p.minStock && <span className="tag-warning">Low</span>}</td>
              <td>{p.location || "-"}</td>
              {canEdit && (
                <td>
                  <Link to={`/products/${p.id}/edit`}>Edit</Link>{" | "}
                  <button className="btn-link" onClick={() => setMovementFor(p)}>Stock</button>
                </td>
              )}
            </tr>
          ))}
          {products.length === 0 && <tr><td colSpan={7} className="muted">No products found.</td></tr>}
        </tbody>
      </table>

      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
        <span>Page {page} of {totalPages || 1}</span>
        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>

      {movementFor && (
        <StockMovementModal
          product={movementFor}
          onClose={() => setMovementFor(null)}
          onSaved={() => { setMovementFor(null); load(); }}
        />
      )}
    </div>
  );
}

function StockMovementModal({ product, onClose, onSaved }: { product: Product; onClose: () => void; onSaved: () => void }) {
  const [quantity, setQuantity] = useState(1);
  const [movementType, setMovementType] = useState("IN");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post(`/products/${product.id}/stock-movement`, { quantity: Number(quantity), movementType, reason });
      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Stock Movement: {product.name}</h2>
        <p className="muted">Current stock: {product.stock}</p>
        {error && <div className="alert-error">{error}</div>}
        <form className="form-grid" onSubmit={submit}>
          <label>Type
            <select value={movementType} onChange={(e) => setMovementType(e.target.value)}>
              <option value="IN">IN (add stock)</option>
              <option value="OUT">OUT (remove stock)</option>
            </select>
          </label>
          <label>Quantity<input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} required /></label>
          <label className="full">Reason<input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Purchase received, Damaged goods, Stock correction" required /></label>
          <div className="full form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Movement"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
