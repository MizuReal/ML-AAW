"use client";

import { useState } from "react";
import AuthModal from "@/components/AuthModal";

export default function Navigation() {
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState("login");

  const openModal = (selectedMode = "login") => {
    setMode(selectedMode);
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-sm font-semibold tracking-[0.4em] text-white">
            AQUASCOPE
          </span>
          <div className="flex flex-wrap items-center gap-2 text-sm uppercase tracking-[0.3em] text-slate-200">
            <a className="rounded-full px-4 py-2 transition hover:bg-white/10" href="#about">
              About
            </a>
            <a className="rounded-full px-4 py-2 transition hover:bg-white/10" href="#dashboard">
              Dashboard
            </a>
            <button
              className="rounded-full border border-white/30 px-4 py-2 text-white transition hover:border-white/70"
              type="button"
              onClick={() => openModal("login")}
            >
              Login
            </button>
            <button
              className="rounded-full bg-white px-4 py-2 text-slate-900 transition hover:-translate-y-0.5"
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
