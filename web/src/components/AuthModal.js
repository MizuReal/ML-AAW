"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

const formFields = {
  login: [
    { label: "Email", type: "email", name: "email", autoComplete: "email" },
    { label: "Password", type: "password", name: "password", autoComplete: "current-password" },
  ],
  register: [
    { label: "Full name", type: "text", name: "name", autoComplete: "name" },
    { label: "Organization", type: "text", name: "organization", autoComplete: "organization" },
    { label: "Work email", type: "email", name: "email", autoComplete: "email" },
    { label: "Password", type: "password", name: "password", autoComplete: "new-password" },
  ],
};

const defaultFormState = () => ({
  login: { email: "", password: "" },
  register: { name: "", organization: "", email: "", password: "" },
});

export default function AuthModal({ open, mode = "login", onClose, onModeChange }) {
  const router = useRouter();
  const [formState, setFormState] = useState(defaultFormState);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (!open || typeof window === "undefined") {
      return undefined;
    }
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setLoading(false);
      setFeedback(null);
      setFormState(defaultFormState());
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const fields = formFields[mode];
  const currentValues = formState[mode];
  const disableSubmit = loading || !isSupabaseConfigured;

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({
      ...prev,
      [mode]: {
        ...prev[mode],
        [name]: value,
      },
    }));
  };

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  };

  const handleModeSwitch = (targetMode) => {
    if (mode === targetMode) {
      return;
    }
    setFeedback(null);
    setLoading(false);
    onModeChange?.(targetMode);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!supabase) {
      setFeedback({
        type: "error",
        message: "Supabase credentials missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable auth.",
      });
      return;
    }

    const payload = currentValues;
    if (!payload.email || !payload.password) {
      setFeedback({ type: "error", message: "Email and password are required." });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: payload.email.trim(),
          password: payload.password,
        });
        if (error) throw error;
        setFeedback({ type: "success", message: "Authenticated. Redirecting you to the dashboard..." });
      } else {
        const { error } = await supabase.auth.signUp({
          email: payload.email.trim(),
          password: payload.password,
          options: {
            data: {
              full_name: payload.name,
              organization: payload.organization,
            },
          },
        });
        if (error) throw error;
        setFeedback({ type: "success", message: "Account created. Check your inbox to confirm access." });
      }

      setTimeout(() => {
        onClose?.();
        setFormState(defaultFormState());
        if (mode === "login") {
          router.replace("/dashboard");
        }
      }, 800);
    } catch (error) {
      setFeedback({
        type: "error",
        message: error?.message ?? "Unable to complete the request right now.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className="modal-panel">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.4em] text-cyan-200/80">AquaScope Access</p>
            <h5 className="text-2xl text-white">{mode === "login" ? "Welcome back" : "Create an operator account"}</h5>
          </div>
          <button
            type="button"
            aria-label="Close authentication modal"
            className="rounded-full border border-white/20 bg-white/5 p-2 text-white transition hover:border-white/50"
            onClick={onClose}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="mt-6 flex gap-2 rounded-full border border-white/10 bg-white/5 p-1 text-xs uppercase tracking-[0.3em] text-white">
          <button
            className={`flex-1 rounded-full px-4 py-2 transition ${mode === "login" ? "bg-white text-slate-900" : "text-white/70"}`}
            type="button"
            onClick={() => handleModeSwitch("login")}
          >
            Login
          </button>
          <button
            className={`flex-1 rounded-full px-4 py-2 transition ${mode === "register" ? "bg-white text-slate-900" : "text-white/70"}`}
            type="button"
            onClick={() => handleModeSwitch("register")}
          >
            Register
          </button>
        </div>

        {feedback && (
          <p
            className={`mt-4 rounded-2xl border px-4 py-3 text-xs ${
              feedback.type === "error"
                ? "border-red-400/40 bg-red-500/10 text-red-100"
                : "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
            }`}
            role="status"
            aria-live="polite"
          >
            {feedback.message}
          </p>
        )}

        <form className="mt-8 space-y-4" onSubmit={handleSubmit} noValidate>
          {fields.map((field) => (
            <label key={field.name} className="block text-sm text-slate-200">
              <span className="text-xs uppercase tracking-[0.3em] text-white/60">{field.label}</span>
              <input
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-300/70"
                type={field.type}
                name={field.name}
                placeholder={`Enter ${field.label.toLowerCase()}`}
                autoComplete={field.autoComplete}
                required
                value={currentValues[field.name] ?? ""}
                onChange={handleInputChange}
                disabled={loading}
              />
            </label>
          ))}
          {mode === "login" ? (
            <div className="flex items-center justify-between text-xs text-white/60">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 rounded border-white/20 bg-transparent text-cyan-300 focus:ring-cyan-200" />
                Keep me signed in
              </label>
              <button type="button" className="text-cyan-200 hover:text-cyan-100">
                Forgot password?
              </button>
            </div>
          ) : (
            <p className="text-xs text-white/60">By registering you agree to AquaScope platform terms and data policy.</p>
          )}
          <button
            type="submit"
            className={`w-full rounded-full bg-gradient-to-r from-cyan-300 to-lime-200 py-3 text-sm font-semibold uppercase tracking-[0.4em] text-slate-900 transition ${
              disableSubmit ? "opacity-40" : "hover:opacity-90"
            }`}
            disabled={disableSubmit}
            aria-busy={loading}
          >
            {loading ? "Processing..." : mode === "login" ? "Access dashboard" : "Create workspace"}
          </button>
        </form>

        <div className="mt-6 rounded-2xl border border-white/5 bg-black/30 p-4 text-xs text-white/60">
          We federate with Supabase Auth, Azure AD, and custom SAML. Contact support for enterprise SSO.
        </div>
      </div>
    </div>
  );
}
