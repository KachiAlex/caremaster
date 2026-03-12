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
          <ToastContainer
            position="top-right"
            autoClose={6000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            style={{ fontSize: '14px', maxWidth: '100%', width: 'min(360px, 100%)' }}
          />
        </BrowserRouter>
      </QueryClientProvider>
    </FontSizeProvider>
  </React.StrictMode>
);
