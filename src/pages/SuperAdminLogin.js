import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { auth } from '../firebase/config';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import authManager from '../utils/authManager';

const SuperAdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      // Sign in with email and password using role-specific auth
      const userCredential = await authManager.signInWithRole(email, password, 'super-admin');
      const user = userCredential.user;

      // Check if user has super-admin claim
      const token = await user.getIdTokenResult();
      const hasSuperAdminClaim = token?.claims?.superAdmin === true;

      if (hasSuperAdminClaim) {
        toast.success('Welcome, Super Admin!');
        navigate('/super-admin/dashboard');
      } else {
        // Try to set super-admin claim if user is an admin
        try {
          const functions = getFunctions();
          const setSuperAdminClaim = httpsCallable(functions, 'setSuperAdminClaim');
          await setSuperAdminClaim({ userId: user.uid });
          
          // Refresh token to get updated claims
          await user.getIdToken(true);
          toast.success('Super-admin privileges granted!');
          navigate('/super-admin/dashboard');
        } catch (claimError) {
          console.error('Error setting super-admin claim:', claimError);
          toast.error('Access denied. Super-admin privileges required.');
          await authManager.signOutFromRole('super-admin');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[360px] bg-[radial-gradient(circle_at_top,_#22c55e22,_transparent_65%),radial-gradient(circle_at_30%_20%,_#0ea5e922,_transparent_55%),radial-gradient(circle_at_80%_0,_#4f46e522,_transparent_55%)]" />
      <div className="relative w-full max-w-lg space-y-6 rounded-3xl border border-slate-800 bg-slate-950/85 p-8 shadow-2xl shadow-black/50">
        <div className="text-center space-y-3">
          <div className="mx-auto h-14 w-14 flex items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 via-sky-400 to-indigo-400 shadow-lg shadow-emerald-500/30">
            <Shield className="h-7 w-7 text-slate-950" />
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">UltimateCare</p>
          <h2 className="text-3xl font-semibold text-slate-50">Super Admin Access</h2>
          <p className="text-sm text-slate-400">Sign in to the licensing and tenant management console</p>
        </div>

        <form className="space-y-4" onSubmit={handleLogin}>
          <div className="space-y-3">
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-50 placeholder-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-emerald-500/20"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-50 placeholder-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-emerald-500/20"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-emerald-500/90 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-900 mx-auto" />
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => navigate('/admin/login')}
            className="text-sm text-slate-500 hover:text-slate-300"
          >
            Back to Admin Login
          </button>
        </div>

        <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          <p className="font-semibold">Super Admin Access</p>
          <p className="mt-1 text-amber-200">This area is restricted to super administrators. Accounts must carry the super-admin claim to proceed.</p>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminLogin;
