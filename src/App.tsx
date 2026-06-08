/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { fetchMenu, fetchReviews } from "./api";
import { MenuItem, CustomerReview } from "./types";
import PublicWebsite from "./components/PublicWebsite";
import AdminPortal from "./components/AdminPortal";
import NotificationToast, { ToastMessage } from "./components/NotificationToast";
import { LayoutDashboard, Compass, Sparkles, HelpCircle, Lock, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [roleMode, setRoleMode] = useState<"customer" | "admin">("customer");
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [syncCount, setSyncCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Administrative Passcode States
  const [isAdminVerified, setIsAdminVerified] = useState<boolean>(() => {
    try {
      return localStorage.getItem("velorastreet_admin_verified") === "true";
    } catch {
      return false;
    }
  });
  const [showAdminLockModal, setShowAdminLockModal] = useState(false);
  const [inputPasscode, setInputPasscode] = useState("");
  const [passcodeError, setPasscodeError] = useState("");

  // Synchronize dynamic databases from fullstack API
  useEffect(() => {
    async function syncData() {
      try {
        const [menuData, reviewsData] = await Promise.all([
          fetchMenu(),
          fetchReviews()
        ]);
        setMenu(menuData);
        setReviews(reviewsData);
      } catch (err) {
        console.error("Failed to synchronize REST APIs", err);
      } finally {
        setLoading(false);
      }
    }
    syncData();
  }, [syncCount]);

  // Toast adder helper
  const handleAddToast = (
    type: "success" | "warning" | "info" | "notify", 
    title: string, 
    message: string,
    channel?: "sms" | "whatsapp" | "email"
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastMessage = { id, type, title, message, channel };
    setToasts(prev => [...prev, newToast]);

    // Dissolve automatically after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const handleRemoveToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const triggerDataRefresh = () => {
    setSyncCount(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-900 text-white font-sans">
        <div className="w-12 h-12 border-4 border-neutral-100 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-mono text-xs tracking-widest uppercase text-neutral-400">Bootstrapping Velora Street Platform v2.0...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-900 text-neutral-100 relative font-sans">
      
      {/* GLOBAL SANDBOX USER WORKSPACE BAR */}
      <div className="bg-neutral-950 border-b border-white/10 py-2.5 px-4 z-40 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="bg-neutral-100 text-neutral-900 font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-mono">
              Velora Street Workspace Console
            </span>
            <span className="text-neutral-400 font-sans font-medium text-[11px] leading-relaxed">Toggle views to test real-time customer and staff order dispatch synchronization:</span>
          </div>
          
          <div className="flex gap-2.5 items-center">
            {isAdminVerified && (
              <button
                onClick={() => {
                  setIsAdminVerified(false);
                  localStorage.removeItem("velorastreet_admin_verified");
                  setRoleMode("customer");
                  handleAddToast("warning", "Admin Session Locked", "Your staff access credentials have been cleared.");
                }}
                className="flex items-center gap-1.5 bg-red-950/40 hover:bg-red-900/10 text-red-400 border border-red-500/25 py-1.5 px-2.5 rounded font-bold font-mono text-[9px] uppercase tracking-wider transition-colors cursor-pointer"
                title="Lock Administrative Portal Session"
              >
                <Lock className="w-3 h-3 text-red-500" />
                Clear Session
              </button>
            )}

            <button
              onClick={() => { setRoleMode("customer"); handleAddToast("info", "Role Shifted", "Switched to Velora Street Premium E-Commerce Storefront."); }}
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded font-bold tracking-widest uppercase transition-all border cursor-pointer ${
                roleMode === "customer"
                  ? "bg-neutral-100 text-neutral-950 border-neutral-100 font-extrabold shadow"
                  : "bg-neutral-900 text-neutral-400 border-white/10 hover:bg-white/5"
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Customer Storefront</span>
            </button>
            <button
              onClick={() => { 
                if (isAdminVerified) {
                  setRoleMode("admin"); 
                  handleAddToast("info", "Role Shifted", "Opened Manager & Staff Operations Dashboard."); 
                } else {
                  setShowAdminLockModal(true);
                  setPasscodeError("");
                  setInputPasscode("");
                }
              }}
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded font-bold tracking-widest uppercase transition-all border cursor-pointer ${
                roleMode === "admin"
                  ? "bg-neutral-100 text-neutral-950 border-neutral-100 font-extrabold shadow"
                  : "bg-neutral-900 text-neutral-400 border-white/10 hover:bg-white/5"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Staff Control Center</span>
            </button>
          </div>
        </div>
      </div>

      {/* RENDER ACTIVE SYSTEM VIEW */}
      <div className="flex-grow flex flex-col">
        {roleMode === "customer" ? (
          <PublicWebsite 
            menu={menu} 
            reviews={reviews} 
            onAddToast={handleAddToast} 
            onRefreshData={triggerDataRefresh} 
          />
        ) : (
          <AdminPortal 
            onAddToast={handleAddToast} 
            onRefreshData={triggerDataRefresh} 
          />
        )}
      </div>

      {/* SECURITY CONTROL CENTER VERIFICATION MODAL */}
      <AnimatePresence>
        {showAdminLockModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-900 border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl relative text-left text-white"
            >
              {/* Top accent bar */}
              <div className="absolute top-0 left-0 w-full h-[4px] bg-neutral-100" />

              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-neutral-100/10 rounded-lg text-neutral-100">
                    <Lock className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-mono tracking-widest text-neutral-400 font-bold block">
                      Velora Street Staff Access Gate
                    </span>
                    <h3 className="font-sans font-black text-lg text-white uppercase mt-0.5">
                      Staff Credentials
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAdminLockModal(false);
                    setInputPasscode("");
                    setPasscodeError("");
                  }}
                  className="p-1 rounded bg-neutral-950 border border-white/5 hover:border-neutral-500 text-gray-400 hover:text-white transition-all cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="bg-neutral-950 border border-white/10 p-3 rounded-lg text-xs text-neutral-300 leading-relaxed font-sans">
                🔐 Access to the Staff Operations Dashboard, Catalog Tool, and dispatch queues is strictly restricted to active Velora Street team members.
              </div>

              {passcodeError && (
                <div className="p-3 bg-red-950/40 border border-red-900 rounded text-xs text-red-200 font-mono leading-relaxed flex items-start gap-2">
                  <span className="text-red-500 font-black">⚠</span>
                  <div className="text-red-300">{passcodeError}</div>
                </div>
              )}

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (inputPasscode === "admin" || inputPasscode === "admin123") {
                    setIsAdminVerified(true);
                    localStorage.setItem("velorastreet_admin_verified", "true");
                    setRoleMode("admin");
                    setShowAdminLockModal(false);
                    setInputPasscode("");
                    setPasscodeError("");
                    handleAddToast("success", "Staff Verified", "Welcome back Staff! Velora Street portal active.");
                  } else {
                    setPasscodeError("Invalid Staff Passcode. Access denied.");
                    handleAddToast("warning", "Access Refused", "Verification passcode was incorrect.");
                  }
                }} 
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-neutral-400 block uppercase">
                    Staff Passcode *
                  </label>
                  <input
                    type="password"
                    required
                    value={inputPasscode}
                    onChange={(e) => setInputPasscode(e.target.value)}
                    placeholder="Enter admin passcode"
                    className="w-full bg-neutral-950 border border-white/10 focus:border-white p-3 text-sm text-white outline-none rounded font-mono"
                    autoFocus
                  />
                  <span className="text-[9px] text-neutral-500 block">
                    💡 Hint: Standard staff access password is <strong className="text-neutral-100">admin</strong>.
                  </span>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-950 font-bold font-mono tracking-wider text-xs uppercase rounded transition-all cursor-pointer shadow-lg"
                >
                  Authenticate Passcode
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FLOAT FLOATING INTERACTIVE TOAST SYSTEM */}
      <NotificationToast toasts={toasts} onRemove={handleRemoveToast} />

    </div>
  );
}
