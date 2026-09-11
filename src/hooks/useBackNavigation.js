import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * useBackNavigation — in-memory navigation stack for tab + modal back navigation.
 *
 * Tracks tab switches and modal open/close state so a single `goBack()` can:
 *   1. Close any open modal first.
 *   2. If no modal, return to the previous tab.
 *   3. If on the default tab, fall back to browser history (navigate(-1)).
 *
 * @param {Object} options
 * @param {string} options.defaultTab  - The initial / landing tab ID.
 * @param {Object} options.modalStates - Object whose truthy values indicate open modals,
 *                                        e.g. { showVitalsModal, showCareLogsModal, ... }.
 *                                        The hook auto-detects when any value is truthy.
 * @param {Function} options.closeAllModals - Called with no arguments when goBack()
 *                                        needs to close all modals. Should set every
 *                                        show*Modal state to false.
 * @returns {Object} { canGoBack, goBack, pushTab, breadcrumbs, currentTab }
 */
const useBackNavigation = ({ defaultTab, modalStates = {}, closeAllModals }) => {
  const navigate = useNavigate();

  // Stack of tab IDs. Index 0 is the initial tab. Each pushTab appends.
  const stackRef = useRef([defaultTab]);
  // Whether we just popped (so the next setActiveTab shouldn't push)
  const isPoppingRef = useRef(false);
  // Latest closeAllModals ref so goBack always calls the freshest version
  const closeAllModalsRef = useRef(closeAllModals);
  closeAllModalsRef.current = closeAllModals;

  const [currentTab, setCurrentTab] = useState(defaultTab);
  const [canGoBack, setCanGoBack] = useState(false);

  // --- Modal state tracking -------------------------------------------------
  // Compute whether any modal is currently open. We use a ref so goBack can
  // read the latest value without re-creating the callback.
  const isModalOpenRef = useRef(false);

  useEffect(() => {
    const anyModalOpen = Object.values(modalStates).some(Boolean);
    isModalOpenRef.current = anyModalOpen;
  });  // runs after every render — always fresh

  // --- canGoBack computation -------------------------------------------------
  const updateCanGoBack = useCallback(() => {
    const stack = stackRef.current;
    const hasTabHistory = stack.length > 1;
    const hasModalOpen = isModalOpenRef.current;
    // Can go back if a modal is open OR if there's tab history OR if there's
    // browser history. We can't synchronously check browser history length
    // reliably, so we treat it as always-available as a last resort.
    setCanGoBack(hasModalOpen || hasTabHistory);
  }, []);

  useEffect(() => {
    updateCanGoBack();
  }, [updateCanGoBack, modalStates]);

  // --- pushTab — called when the user switches to a new tab -----------------
  const pushTab = useCallback((tabId) => {
    if (isPoppingRef.current) {
      // We're navigating back — don't push, just consume the flag
      isPoppingRef.current = false;
      return;
    }
    const stack = stackRef.current;
    // Avoid pushing duplicates (same tab clicked twice)
    if (stack[stack.length - 1] === tabId) return;
    stack.push(tabId);
    updateCanGoBack();
  }, [updateCanGoBack]);

  // --- goBack — the main back action ----------------------------------------
  const goBack = useCallback(() => {
    // 1. Close modals first
    if (isModalOpenRef.current) {
      if (typeof closeAllModalsRef.current === 'function') {
        closeAllModalsRef.current();
      }
      return;
    }

    // 2. Return to previous tab
    const stack = stackRef.current;
    if (stack.length > 1) {
      stack.pop();
      const prevTab = stack[stack.length - 1];
      isPoppingRef.current = true;
      setCurrentTab(prevTab);
      updateCanGoBack();
      // Return the tab so the caller can setActiveTab
      return prevTab;
    }

    // 3. Fall back to browser history
    navigate(-1);
  }, [navigate, updateCanGoBack]);

  // --- breadcrumbs for display ----------------------------------------------
  const [breadcrumbs, setBreadcrumbs] = useState([{ tabId: defaultTab }]);

  const refreshBreadcrumbs = useCallback(() => {
    setBreadcrumbs(stackRef.current.map(tabId => ({ tabId })));
  }, []);

  useEffect(() => {
    refreshBreadcrumbs();
  }, [currentTab, refreshBreadcrumbs]);

  return {
    canGoBack,
    goBack,
    pushTab,
    breadcrumbs,
    currentTab,
  };
};

export default useBackNavigation;
