import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Navbar } from "./components/Navbar";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { CustomerList } from "./pages/Customers/List";
import { CustomerForm } from "./pages/Customers/Form";
import { CustomerDetail } from "./pages/Customers/Detail";
import { ProductList } from "./pages/Products/List";
import { ProductForm } from "./pages/Products/Form";
import { ChallanList } from "./pages/Challans/List";
import { ChallanForm } from "./pages/Challans/Form";
import { ChallanDetail } from "./pages/Challans/Detail";

function Layout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return (
    <>
      {isAuthenticated && <Navbar />}
      <main className="app-main">{children}</main>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

            <Route path="/customers" element={<ProtectedRoute><CustomerList /></ProtectedRoute>} />
            <Route path="/customers/new" element={<ProtectedRoute roles={["ADMIN", "SALES"]}><CustomerForm /></ProtectedRoute>} />
            <Route path="/customers/:id" element={<ProtectedRoute><CustomerDetail /></ProtectedRoute>} />
            <Route path="/customers/:id/edit" element={<ProtectedRoute roles={["ADMIN", "SALES"]}><CustomerForm /></ProtectedRoute>} />

            <Route path="/products" element={<ProtectedRoute><ProductList /></ProtectedRoute>} />
            <Route path="/products/new" element={<ProtectedRoute roles={["ADMIN", "WAREHOUSE"]}><ProductForm /></ProtectedRoute>} />
            <Route path="/products/:id/edit" element={<ProtectedRoute roles={["ADMIN", "WAREHOUSE"]}><ProductForm /></ProtectedRoute>} />

            <Route path="/challans" element={<ProtectedRoute><ChallanList /></ProtectedRoute>} />
            <Route path="/challans/new" element={<ProtectedRoute roles={["ADMIN", "SALES"]}><ChallanForm /></ProtectedRoute>} />
            <Route path="/challans/:id" element={<ProtectedRoute><ChallanDetail /></ProtectedRoute>} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
}
