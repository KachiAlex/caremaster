// Polyfills MUST be imported before anything else so that all downstream
// code (React, libraries, app code) can rely on the polyfilled APIs.
// react-app-polyfill/ie11  — fetch, Promise, URL, Map/Set, etc. for IE11
// react-app-polyfill/stable — requestAnimationFrame, matchMedia, etc.
import 'react-app-polyfill/ie11';
import 'react-app-polyfill/stable';
// core-js polyfills for modern APIs not covered by react-app-polyfill
import 'core-js/web/url';
import 'core-js/web/url-search-params';
import 'core-js/web/structured-clone';
import 'core-js/es/object/from-entries';
import 'core-js/es/promise/all-settled';
import 'core-js/es/array/flat';
import 'core-js/es/array/flat-map';
import 'core-js/es/string/replace-all';
import 'core-js/es/global-this';

import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { ToastContainer } from "react-toastify";
import { FontSizeProvider } from "./contexts/FontSizeContext";
import App from "./App";
import "react-toastify/dist/ReactToastify.css";
import "./index.css";

// Configure React Query with sensible caching defaults.
// staleTime: data is considered fresh for 1 minute (prevents refetch on
//   every component mount/navigation). Background refetch still happens
//   when stale, but the UI shows cached data instantly.
// cacheTime: cached data is kept in memory for 5 minutes after the last
//   observer unsubscribes (so navigating away and back doesn't refetch).
// refetchOnWindowFocus: refetch when the user returns to the tab, but only
//   if data is stale (respects staleTime).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,        // 1 minute
      cacheTime: 5 * 60 * 1000,     // 5 minutes
      refetchOnWindowFocus: 'always',
      refetchOnMount: true,
      retry: 1,
    },
  },
});

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
        Max 3 toasts visible, newest on top, 4s default autoClose. */}
    <ToastContainer
      position="top-right"
      autoClose={4000}
      hideProgressBar={false}
      newestOnTop={true}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="light"
      limit={3}
      style={{ fontSize: '14px', maxWidth: '100%', width: 'min(360px, 100%)' }}
    />
  </React.StrictMode>
);
