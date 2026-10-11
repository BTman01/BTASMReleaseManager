import React, { useState } from 'react';
import {
  loginWithEmail,
  registerWithEmail,
  requestPasswordReset,
  getStoredRememberMe,
  setStoredRememberMe,
} from '../services/firebase';
import { ArkSpecimenImplantLogo } from './icons';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string) => void;
  canBypassOffline?: boolean;
}

type AuthTab = 'signin' | 'signup' | 'forgot';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  canBypassOffline = true,
}) => {
  const [activeTab, setActiveTab] = useState<AuthTab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState<boolean>(getStoredRememberMe());
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRememberMeChange = (checked: boolean) => {
    setRememberMe(checked);
    setStoredRememberMe(checked);
  };

  const parseFirebaseError = (error: any): string => {
    const code = error?.code || '';
    if (code === 'auth/operation-not-allowed') {
      return 'Email/Password sign-in is not yet enabled in the Firebase Console. In Firebase Console > Authentication > Sign-in method, click "Email/Password" and toggle "Enable".';
    }
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      return 'Incorrect email or password. Please try again.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'An account with this email already exists. Please sign in instead.';
    }
    if (code === 'auth/weak-password') {
      return 'Password should be at least 6 characters long.';
    }
    if (code === 'auth/invalid-email') {
      return 'Please enter a valid email address.';
    }
    if (code === 'auth/too-many-requests') {
      return 'Access temporarily disabled due to many failed attempts. Try again later or reset password.';
    }
    return error?.message || 'An unexpected authentication error occurred.';
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const user = await loginWithEmail(email, password, rememberMe);
      onSuccess(user.email || email);
      onClose();
    } catch (err: any) {
      setErrorMsg(parseFirebaseError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please provide an email and password.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const user = await registerWithEmail(email, password, displayName, rememberMe);
      onSuccess(user.email || email);
      onClose();
    } catch (err: any) {
      setErrorMsg(parseFirebaseError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg('Please enter your account email to receive a reset link.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await requestPasswordReset(email);
      setSuccessMsg(`Password reset email sent to ${email}. Check your inbox!`);
    } catch (err: any) {
      setErrorMsg(parseFirebaseError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      {/* Background radial glow */}
      <div className="absolute w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none"></div>

      <div className="relative w-full max-w-md bg-gray-950/95 border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden flex flex-col">
        {/* Top Header Glow Bar */}
        <div className="h-1 bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-500"></div>

        {/* Modal Header */}
        <div className="p-6 pb-4 flex items-start justify-between border-b border-gray-800/80">
          <div className="flex items-center space-x-3.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-950/80 to-slate-900 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <ArkSpecimenImplantLogo className="w-7 h-7 drop-shadow-[0_0_8px_rgba(34,211,238,0.7)]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-gray-100 via-cyan-200 to-teal-300">
                  Server Control Hub
                </h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
                  CLOUD
                </span>
              </div>
              <p className="text-xs text-gray-400">
                {activeTab === 'signin' && 'Sign in to access your servers & mobile link'}
                {activeTab === 'signup' && 'Create your master account for cloud sync'}
                {activeTab === 'forgot' && 'Reset your master account credentials'}
              </p>
            </div>
          </div>

          {canBypassOffline && (
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-white hover:bg-gray-800/60 rounded-lg transition-colors cursor-pointer"
              title="Close window"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-800/80 bg-gray-900/40 px-6 pt-2">
          <button
            onClick={() => { setActiveTab('signin'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`pb-2.5 px-3 text-xs font-bold uppercase tracking-wider transition-colors relative cursor-pointer ${
              activeTab === 'signin' ? 'text-cyan-400' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Sign In
            {activeTab === 'signin' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab('signup'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`pb-2.5 px-3 text-xs font-bold uppercase tracking-wider transition-colors relative cursor-pointer ${
              activeTab === 'signup' ? 'text-cyan-400' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Register
            {activeTab === 'signup' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab('forgot'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`pb-2.5 px-3 text-xs font-bold uppercase tracking-wider transition-colors relative cursor-pointer ${
              activeTab === 'forgot' ? 'text-cyan-400' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Reset
            {activeTab === 'forgot' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
            )}
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-start space-x-2 animate-fade-in">
              <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs flex items-start space-x-2 animate-fade-in">
              <svg className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{successMsg}</span>
            </div>
          )}

          {/* Email / Password Form (Primary Desktop Flow) */}
          <form
            onSubmit={
              activeTab === 'signin'
                ? handleSignIn
                : activeTab === 'signup'
                ? handleSignUp
                : handleForgotPassword
            }
            className="space-y-3.5"
          >
            {activeTab === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Admin Name / Call-Sign
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Commander Rex"
                  className="w-full bg-gray-900/80 border border-gray-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full bg-gray-900/80 border border-gray-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 transition-colors"
              />
            </div>

            {activeTab !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-300">
                    Password
                  </label>
                  {activeTab === 'signin' && (
                    <button
                      type="button"
                      onClick={() => { setActiveTab('forgot'); setErrorMsg(null); setSuccessMsg(null); }}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-gray-900/80 border border-gray-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg px-3 py-2 pr-10 text-sm text-gray-100 placeholder-gray-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer p-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Remember Me Toggle */}
            {activeTab !== 'forgot' && (
              <div className="pt-1 flex items-center justify-between">
                <label className="flex items-center space-x-2.5 cursor-pointer text-xs text-gray-300">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => handleRememberMeChange(e.target.checked)}
                    className="w-4 h-4 rounded bg-gray-900 border-gray-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-gray-900 cursor-pointer"
                  />
                  <span>Remember me for auto-login</span>
                </label>
                <span className="text-[10px] text-gray-500 font-mono">
                  {rememberMe ? 'Auto-signs in on launch' : 'Asks each launch'}
                </span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 via-cyan-500 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white font-bold text-sm tracking-wide shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Connecting...</span>
                </>
              ) : (
                <span>
                  {activeTab === 'signin' && 'Sign In to Server Hub'}
                  {activeTab === 'signup' && 'Create Cloud Account'}
                  {activeTab === 'forgot' && 'Send Password Reset'}
                </span>
              )}
            </button>
          </form>

          {/* Offline / Local Bypass */}
          {canBypassOffline && (
            <div className="pt-2 text-center border-t border-gray-800/80">
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-gray-400 hover:text-cyan-400 transition-colors inline-flex items-center space-x-1.5 cursor-pointer py-1"
              >
                <span>Continue Offline (Local Server Only)</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
