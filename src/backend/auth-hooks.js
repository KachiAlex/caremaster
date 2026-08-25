/**
 * react-backend-hooks/auth.js - React hooks compatibility layer.
 *
 * Replaces react-firebase-hooks/auth with hooks that work against the
 * Express backend auth (JWT in localStorage).
 */

import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, updatePassword, sendEmailVerification } from 'backend/auth.js';

/**
 * useAuthState(auth) → [user, loading, error]
 *
 * Subscribes to onAuthStateChanged. On mount, checks localStorage for an
 * existing JWT session. Returns the user object (with getIdToken) or null.
 */
export function useAuthState(auth) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      unsubscribe = onAuthStateChanged(auth, (u) => {
        setUser(u);
        setLoading(false);
        setError(null);
      });
    } catch (err) {
      setError(err);
      setLoading(false);
    }
    return () => unsubscribe();
  }, [auth]);

  return [user, loading, error];
}

export function useSignInWithEmailAndPassword(auth) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const signIn = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      setLoading(false);
      return result;
    } catch (err) {
      setError(err);
      setLoading(false);
      return null;
    }
  }, [auth]);

  return [signIn, loading, error];
}

export function useCreateUserWithEmailAndPassword(auth) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createUser = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      setLoading(false);
      return result;
    } catch (err) {
      setError(err);
      setLoading(false);
      return null;
    }
  }, [auth]);

  return [createUser, loading, error];
}

export function useSendPasswordResetEmail(auth) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendReset = useCallback(async (email) => {
    setLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setLoading(false);
      return true;
    } catch (err) {
      setError(err);
      setLoading(false);
      return false;
    }
  }, [auth]);

  return [sendReset, loading, error];
}

export function useSendEmailVerification(auth) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendVerify = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await sendEmailVerification(auth?.currentUser);
      setLoading(false);
      return true;
    } catch (err) {
      setError(err);
      setLoading(false);
      return false;
    }
  }, [auth]);

  return [sendVerify, loading, error];
}

export function useUpdatePassword(auth) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updatePwd = useCallback(async (newPassword) => {
    setLoading(true);
    setError(null);
    try {
      await updatePassword(auth?.currentUser, newPassword);
      setLoading(false);
      return true;
    } catch (err) {
      setError(err);
      setLoading(false);
      return false;
    }
  }, [auth]);

  return [updatePwd, loading, error];
}

export function useSignOut(auth) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const doSignOut = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await signOut(auth);
      setLoading(false);
      return true;
    } catch (err) {
      setError(err);
      setLoading(false);
      return false;
    }
  }, [auth]);

  return [doSignOut, loading, error];
}
