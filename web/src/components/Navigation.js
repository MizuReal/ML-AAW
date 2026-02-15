"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import AuthModal from "@/components/AuthModal";
import { getUserRole, isAdminRole } from "@/lib/profileRole";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

export default function Navigation() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState("login");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const openModal = (selectedMode = "login") => {
    setMode(selectedMode);
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) {
      return;
    }

    let isMounted = true;

    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) {
        return;
      }
      setIsAuthenticated(Boolean(data?.session));
    };

    syncSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }
      setIsAuthenticated(Boolean(session));
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleDashboardClick = async () => {
    if (!isAuthenticated) {
      openModal("login");
      return;
    }

    if (!supabase) {
      router.push("/dashboard");
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      const role = userId ? await getUserRole(userId) : null;
      router.push(isAdminRole(role) ? "/admin/dashboard" : "/dashboard");
    } catch {
      router.push("/dashboard");
    }
  };

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-sm font-semibold tracking-[0.4em] text-slate-900">
            AQUASCOPE
          </span>
          <div className="flex flex-wrap items-center gap-2 text-sm uppercase tracking-[0.3em] text-slate-600">
            <a className="rounded-full px-4 py-2 transition hover:bg-slate-100" href="#about">
              About
            </a>
            <button
              type="button"
              className="rounded-full px-4 py-2 transition hover:bg-slate-100"
              onClick={handleDashboardClick}
            >
              Dashboard
            </button>
            <button
              className="rounded-full border border-slate-300 px-4 py-2 text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              type="button"
              onClick={() => openModal("login")}
            >
              Login
            </button>
            <button
              className="rounded-full bg-sky-600 px-4 py-2 text-white transition hover:-translate-y-0.5 hover:bg-sky-700"
              type="button"
              onClick={() => openModal("register")}
            >
              Register
            </button>
          </div>
        </nav>
      </header>
      <AuthModal open={modalOpen} mode={mode} onClose={closeModal} onModeChange={setMode} />
    </>
  );
}
