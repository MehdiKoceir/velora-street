import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bell, CheckCircle2, AlertTriangle, MessageSquare, Info, X } from "lucide-react";

export interface ToastMessage {
  id: string;
  type: "success" | "warning" | "info" | "notify";
  title: string;
  message: string;
  channel?: "email" | "sms" | "whatsapp";
}

interface NotificationToastProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export default function NotificationToast({ toasts, onRemove }: NotificationToastProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full">
      <AnimatePresence>
        {toasts.map((toast) => {
          let Icon = Info;
          let colorClass = "border-gold-500 bg-charcoal-light text-white";
          let progressColor = "bg-gold-500";

          if (toast.type === "success") {
            Icon = CheckCircle2;
            colorClass = "border-green-500 bg-charcoal-light/95 text-white";
            progressColor = "bg-green-500";
          } else if (toast.type === "warning") {
            Icon = AlertTriangle;
            colorClass = "border-red-deep bg-charcoal-light/95 text-white";
            progressColor = "bg-red-deep";
          } else if (toast.type === "notify") {
            Icon = Bell;
            colorClass = "border-gold-500 bg-[#161616] text-white";
            progressColor = "bg-gold-500";
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
              className={`flex flex-col rounded-lg border p-4 shadow-xl backdrop-blur-md relative overflow-hidden ${colorClass}`}
              style={{ boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.7)" }}
            >
              {/* Outer top highlight bar */}
              <div className="flex gap-3 items-start">
                <div className="mt-0.5">
                  <Icon className="w-5 h-5 flex-shrink-0" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm tracking-wide font-sans">{toast.title}</span>
                    {toast.channel && (
                      <span className="text-[10px] font-mono uppercase bg-charcoal-deep px-1.5 py-0.5 rounded text-gold-400">
                        {toast.channel} Sim
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-300 mt-1 font-sans leading-relaxed">{toast.message}</p>
                </div>
                <button
                  onClick={() => onRemove(toast.id)}
                  className="text-gray-400 hover:text-white transition-colors duration-150 p-1 rounded hover:bg-white/5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {/* Timer Progress Bar */}
              <motion.div 
                className={`absolute bottom-0 left-0 h-[3px] ${progressColor}`}
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 5, ease: "linear" }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
