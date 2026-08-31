import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { ToastContainer } from "react-toastify";
import { FontSizeProvider } from "./contexts/FontSizeContext";
import App from "./App";
import "react-toastify/dist/ReactToastify.css";
import "./index.css";

const queryClient = new QueryClient();

const root = createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <FontSizeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </FontSizeProvider>
    {/* ToastContainer is OUTSIDE FontSizeProvider to prevent
        font-size CSS from interfering with toast rendering.
        autoClose is set to 5000ms (5 seconds) as a sensible default.
        Individual toast() calls can override with { autoClose: N }. */}
    <ToastContainer
      position="top-right"
      autoClose={5000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="light"
      style={{ fontSize: '14px', maxWidth: '100%', width: 'min(360px, 100%)' }}
    />
  </React.StrictMode>
);
