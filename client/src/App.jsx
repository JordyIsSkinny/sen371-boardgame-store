import { Routes, Route } from "react-router-dom";
import { Layout } from "./layout/Layout.jsx";
import { ProtectedRoute, AdminRoute } from "./context/AuthContext.jsx";
import { Home } from "./pages/Home.jsx";
import { Catalogue } from "./pages/Catalogue.jsx";
import { ProductDetail } from "./pages/ProductDetail.jsx";
import { Cart } from "./pages/Cart.jsx";
import { Checkout } from "./pages/Checkout.jsx";
import { Login } from "./pages/Login.jsx";
import { Register } from "./pages/Register.jsx";
import { OrderConfirmation } from "./pages/OrderConfirmation.jsx";
import { OrderHistory } from "./pages/OrderHistory.jsx";
import { AdminDashboard } from "./pages/AdminDashboard.jsx";
import { NotFound } from "./pages/NotFound.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="catalogue" element={<Catalogue />} />
        <Route path="products/:productId" element={<ProductDetail />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route
          path="cart"
          element={
            <ProtectedRoute>
              <Cart />
            </ProtectedRoute>
          }
        />
        <Route
          path="checkout"
          element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          }
        />
        <Route
          path="orders"
          element={
            <ProtectedRoute>
              <OrderHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="orders/:orderId/confirmation"
          element={
            <ProtectedRoute>
              <OrderConfirmation />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
