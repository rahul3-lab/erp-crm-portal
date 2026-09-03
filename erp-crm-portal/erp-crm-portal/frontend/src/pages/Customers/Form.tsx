import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, apiErrorMessage } from "../../api/client";

const empty = {
  name: "",
  mobile: "",
  email: "",
  businessName: "",
  gstNumber: "",
  customerType: "RETAIL",
  address: "",
  status: "LEAD",
  followUpDate: "",
  notes: "",
};

export function CustomerForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [form, setForm] = useState<any>(empty);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit) {
      api.get(`/customers/${id}`).then((res) => {
        const c = res.data.data;
        setForm({
          ...c,
          email: c.email || "",
          businessName: c.businessName || "",
          gstNumber: c.gstNumber || "",
          address: c.address || "",
          notes: c.notes || "",
          followUpDate: c.followUpDate ? c.followUpDate.slice(0, 10) : "",
        });
      });
    }
  }, [id, isEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((f: any) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        ...form,
        followUpDate: form.followUpDate ? new Date(form.followUpDate).toISOString() : "",
      };
      if (isEdit) {
        await api.put(`/customers/${id}`, payload);
        navigate(`/customers/${id}`);
      } else {
        const res = await api.post("/customers", payload);
        navigate(`/customers/${res.data.data.id}`);
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h1>{isEdit ? "Edit Customer" : "Add Customer"}</h1>
      {error && <div className="alert-error">{error}</div>}
      <form className="form-grid" onSubmit={handleSubmit}>
        <label>Customer Name *<input name="name" value={form.name} onChange={handleChange} required /></label>
        <label>Mobile Number *<input name="mobile" value={form.mobile} onChange={handleChange} required /></label>
        <label>Email<input name="email" type="email" value={form.email} onChange={handleChange} /></label>
        <label>Business Name<input name="businessName" value={form.businessName} onChange={handleChange} /></label>
        <label>GST Number<input name="gstNumber" value={form.gstNumber} onChange={handleChange} /></label>
        <label>Customer Type
          <select name="customerType" value={form.customerType} onChange={handleChange}>
            <option value="RETAIL">Retail</option>
            <option value="WHOLESALE">Wholesale</option>
            <option value="DISTRIBUTOR">Distributor</option>
          </select>
        </label>
        <label>Status
          <select name="status" value={form.status} onChange={handleChange}>
            <option value="LEAD">Lead</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </label>
        <label>Follow-up Date<input name="followUpDate" type="date" value={form.followUpDate} onChange={handleChange} /></label>
        <label className="full">Address<textarea name="address" value={form.address} onChange={handleChange} /></label>
        <label className="full">Notes<textarea name="notes" value={form.notes} onChange={handleChange} /></label>
        <div className="full form-actions">
          <button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Customer"}</button>
        </div>
      </form>
    </div>
  );
}
