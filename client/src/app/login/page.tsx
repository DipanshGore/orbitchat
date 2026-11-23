"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Rocket,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Loader2,
  ShieldAlert,
  KeyRound,
  UserPlus,
  Compass,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { BrandLogo } from "../../components/layout/BrandLogo";
import { ThemeToggle } from "../../components/layout/ThemeToggle";

const DEMO_USERS = [
  {
    username: "nova",
    displayName: "Commander Nova",
    role: "Station Lead",
    avatar: "mars",
  },
  {
    username: "leo",
    displayName: "Dr. Leo Vance",
    role: "Telemetry Scientist",
    avatar: "jupiter",
  },
  {
    username: "maya",
    displayName: "Maya Chen",
    role: "Quantum Architect",
    avatar: "saturn",
  },
  {
    username: "kai",
    displayName: "Kai Thorne",
    role: "Propulsion Engineer",
    avatar: "neptune",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { user, login, register, quickGuest } = useAuthStore();

  const [tab, setTab] = useState<"signin" | "register" | "guest">("signin");
  const [mobileStep, setMobileStep] = useState<"options" | "credentials">("options");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [guestName, setGuestName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // If already logged in, redirect to home
  useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user, router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      await login(identifier, password);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to establish orbital link.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      await register({
        username,
        email,
        password,
        displayName: displayName.trim() || username,
      });
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Registration denied.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      await quickGuest(guestName.trim() || undefined);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Guest link failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (uname: string) => {
    setIsSubmitting(true);
    setError("");
    try {
      await login(uname, "password123");
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Quick link failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectOption = (selectedTab: "signin" | "register" | "guest") => {
    setTab(selectedTab);
    setError("");
    setMobileStep("credentials");
  };

  // Reusable Credential Forms component
  const renderCredentialForms = (isMobile = false) => (
    <div className="flex flex-col justify-center">
      {/* Mobile Back Button to return to options */}
      {isMobile && (
        <button
          type="button"
          onClick={() => {
            setError("");
            setMobileStep("options");
          }}
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-accent mb-4 transition-colors min-h-[44px] -ml-1 py-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to access options</span>
        </button>
      )}

      {/* Tabs: Sign In / Register / Guest Quick-Join */}
      <div className="grid grid-cols-3 p-1 rounded-xl bg-surface-2 border border-border text-xs font-bold mb-6">
        <button
          type="button"
          onClick={() => {
            setTab("signin");
            setError("");
          }}
          className={`py-2 rounded-lg transition-colors text-center min-h-[38px] ${
            tab === "signin"
              ? "bg-surface text-accent shadow-sm"
              : "text-muted hover:text-text"
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("register");
            setError("");
          }}
          className={`py-2 rounded-lg transition-colors text-center min-h-[38px] ${
            tab === "register"
              ? "bg-surface text-accent shadow-sm"
              : "text-muted hover:text-text"
          }`}
        >
          Register
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("guest");
            setError("");
          }}
          className={`py-2 rounded-lg transition-colors text-center min-h-[38px] ${
            tab === "guest"
              ? "bg-surface text-accent shadow-sm"
              : "text-muted hover:text-text"
          }`}
        >
          Guest Link
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs font-medium flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* TAB 1: SIGN IN */}
      {tab === "signin" && (
        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
              Callsign or Transmission Email
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. nova or nova@orbit.chat"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-border text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
              Security Passcode
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-border text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !identifier || !password}
            className="w-full py-3 rounded-xl bg-accent text-accent-contrast font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:opacity-95 disabled:opacity-50 transition-all min-h-[46px]"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Link to Orbit <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* TAB 2: REGISTER */}
      {tab === "register" && (
        <form onSubmit={handleRegister} className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
              Callsign (Username)
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="e.g. starlight"
              required
              maxLength={30}
              className="w-full px-3.5 py-2 rounded-xl bg-surface border border-border text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent text-sm"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Captain Lyra"
              required
              maxLength={40}
              className="w-full px-3.5 py-2 rounded-xl bg-surface border border-border text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent text-sm"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
              Cosmic Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="lyra@orbit.chat"
              required
              className="w-full px-3.5 py-2 rounded-xl bg-surface border border-border text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent text-sm"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
              Passcode (min 6 chars)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full px-3.5 py-2 rounded-xl bg-surface border border-border text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !username || !email || !password}
            className="w-full py-3 mt-2 rounded-xl bg-accent text-accent-contrast font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:opacity-95 disabled:opacity-50 transition-all min-h-[46px]"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Register Callsign <Rocket className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* TAB 3: GUEST QUICK-JOIN */}
      {tab === "guest" && (
        <form onSubmit={handleGuestJoin} className="space-y-4">
          <div className="p-3 rounded-xl bg-surface-2 border border-border text-xs text-muted">
            Instant transient orbital clearance. You receive a guest session and auto-join
            public station channels without credentials.
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
              Temporary Callsign (Optional)
            </label>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="e.g. Space Wanderer"
              maxLength={30}
              className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-secondary text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:opacity-95 disabled:opacity-50 transition-all min-h-[46px]"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Quick Join as Guest <Sparkles className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* DEMO ACCOUNTS DIRECT BUTTONS */}
      <div className="mt-8 pt-5 border-t border-border/70">
        <span className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-2.5 text-center">
          One-Click Mission Crew Sign-In
        </span>
        <div className="grid grid-cols-2 gap-2">
          {DEMO_USERS.map((demo) => (
            <button
              key={demo.username}
              type="button"
              onClick={() => handleQuickLogin(demo.username)}
              disabled={isSubmitting}
              className="p-2.5 rounded-xl bg-surface-2 border border-border hover:border-accent hover:bg-surface text-left transition-all flex flex-col min-h-[52px] group"
            >
              <span className="font-bold text-xs text-text group-hover:text-accent transition-colors truncate">
                {demo.displayName}
              </span>
              <span className="text-[10px] text-muted truncate">{demo.role}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-dvh flex flex-col justify-between p-4 sm:p-6 overflow-y-auto">
      {/* Top Bar with Brand & Theme Toggle */}
      <header className="flex items-center justify-between max-w-6xl w-full mx-auto pb-4">
        <div className="flex items-center gap-3">
          <BrandLogo size={36} />
          <div>
            <span className="font-heading font-black text-lg text-text">OrbitChat</span>
            <span className="text-[10px] text-muted block uppercase tracking-wider font-semibold">
              Deep Space Communications
            </span>
          </div>
        </div>

        {/* Theme toggle at top right */}
        <ThemeToggle />
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center my-auto py-6">
        {/* DESKTOP SPLIT CARD (md: and larger) */}
        <div className="hidden md:grid glass-panel w-full max-w-4xl grid-cols-2 shadow-2xl overflow-hidden border border-border/70">
          {/* Left Column: Animated Orbital Illustration */}
          <div className="relative p-8 md:p-10 flex flex-col justify-between bg-gradient-to-br from-surface-2 to-surface/40 border-r border-border/70">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 text-accent text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" /> Orbit Station v2.6
              </div>

              <h1 className="font-heading text-2xl sm:text-3xl font-black text-text leading-tight">
                Cosmic Real-Time Communications
              </h1>

              <p className="text-xs sm:text-sm text-muted leading-relaxed">
                Connect seamlessly across orbital planes. Engineered with strict typing, asymmetric
                glass architecture, Web Audio telemetry chimes, and autonomous OrbitBot AI.
              </p>
            </div>

            {/* Orbit SVG Graphic */}
            <div className="py-8 flex justify-center items-center">
              <div className="relative w-48 h-48 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-accent/40 animate-spin [animation-duration:30s]" />
                <div className="absolute inset-4 rounded-full border border-secondary/40 animate-spin [animation-duration:20s] [animation-direction:reverse]" />
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-accent to-amber-500 shadow-xl flex items-center justify-center text-white font-bold text-2xl animate-pulse">
                  🪐
                </div>
                <div className="absolute top-2 left-10 w-4 h-4 rounded-full bg-secondary shadow-md animate-ping" />
                <div className="absolute bottom-4 right-10 w-3 h-3 rounded-full bg-accent shadow" />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted border-t border-border/60 pt-4">
              <span>Encrypted Relays Active</span>
              <span className="text-success font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-success inline-block" /> All Satellites Green
              </span>
            </div>
          </div>

          {/* Right Column: Forms on Desktop */}
          <div className="p-8 flex flex-col justify-center">
            {renderCredentialForms(false)}
          </div>
        </div>

        {/* MOBILE VIEW (Under md: 768px) */}
        <div className="md:hidden w-full max-w-md">
          {mobileStep === "options" ? (
            /* MOBILE STEP 1: OPTIONS SELECTION MENU */
            <div className="glass-panel p-6 shadow-2xl border border-border/70 space-y-6 animate-in fade-in duration-200">
              {/* Header inside mobile card */}
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/15 text-accent text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" /> Orbit Station Relay
                </div>
                <h1 className="font-heading text-2xl font-black text-text">
                  Welcome Aboard
                </h1>
                <p className="text-xs text-muted leading-relaxed">
                  Select an option below to enter your orbital credentials or connect instantly.
                </p>
              </div>

              {/* 3 Prominent Option Cards */}
              <div className="space-y-3">
                {/* 1. Sign In Option */}
                <button
                  type="button"
                  onClick={() => selectOption("signin")}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-surface-2/80 hover:bg-surface border border-border hover:border-accent transition-all text-left group min-h-[64px] shadow-sm active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-accent/15 text-accent flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-sm text-text block group-hover:text-accent transition-colors">
                        Sign In
                      </span>
                      <span className="text-xs text-muted block">
                        Enter existing callsign and passcode
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>

                {/* 2. Register Option */}
                <button
                  type="button"
                  onClick={() => selectOption("register")}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-surface-2/80 hover:bg-surface border border-border hover:border-accent transition-all text-left group min-h-[64px] shadow-sm active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-sm text-text block group-hover:text-accent transition-colors">
                        Register
                      </span>
                      <span className="text-xs text-muted block">
                        Create a new crew member account
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>

                {/* 3. Guest Link Option */}
                <button
                  type="button"
                  onClick={() => selectOption("guest")}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-surface-2/80 hover:bg-surface border border-border hover:border-secondary transition-all text-left group min-h-[64px] shadow-sm active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-sm text-text block group-hover:text-secondary transition-colors">
                        Guest Link
                      </span>
                      <span className="text-xs text-muted block">
                        Quick-join with temporary access
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted group-hover:text-secondary group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              </div>

              {/* DEMO ACCOUNTS ON MOBILE OPTIONS SCREEN */}
              <div className="pt-4 border-t border-border/70">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-2.5 text-center">
                  One-Click Demo Crew Sign-In
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {DEMO_USERS.map((demo) => (
                    <button
                      key={demo.username}
                      type="button"
                      onClick={() => handleQuickLogin(demo.username)}
                      disabled={isSubmitting}
                      className="p-2.5 rounded-xl bg-surface-2 border border-border hover:border-accent hover:bg-surface text-left transition-all flex flex-col min-h-[52px] group"
                    >
                      <span className="font-bold text-xs text-text group-hover:text-accent transition-colors truncate">
                        {demo.displayName}
                      </span>
                      <span className="text-[10px] text-muted truncate">{demo.role}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* MOBILE STEP 2: CREDENTIAL DETAILS PAGE */
            <div className="glass-panel p-6 shadow-2xl border border-border/70 animate-in fade-in duration-200">
              {renderCredentialForms(true)}
            </div>
          )}
        </div>
      </main>

      <footer className="text-center text-xs text-muted py-2">
        OrbitChat &copy; 2026 Deep Space Real-Time Communications.
      </footer>
    </div>
  );
}
