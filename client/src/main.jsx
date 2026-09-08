import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import "./index.css";

// See public/404.html: GitHub Pages bounces deep links here with the real
// path stashed in sessionStorage. Restore it before the router mounts so
// the app lands on the intended screen instead of always "/".
const redirectPath = sessionStorage.getItem("spa-redirect-path");
if (redirectPath) {
  sessionStorage.removeItem("spa-redirect-path");
  window.history.replaceState(null, "", redirectPath);
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
