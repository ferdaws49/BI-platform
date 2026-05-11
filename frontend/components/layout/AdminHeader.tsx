"use client";

import { Bell, Check, Trash2, Clock } from "lucide-react";
import { useNotifications, Notification } from "@/context/NotificationContext";
import { useState, useEffect, useRef } from "react";

interface AdminHeaderProps {
  title: string;
  subtitle: string;
  adminRole?: string;
}

export default function AdminHeader({ title, subtitle, adminRole = "Super Admin" }: AdminHeaderProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  
  // Debug log
  useEffect(() => {
    console.log("[AdminHeader] Notifications reçues :", notifications.length, "Non lues :", unreadCount);
  }, [notifications, unreadCount]);

  const [showDropdown, setShowDropdown] = useState(false);
  const [user, setUser] = useState<{ nom: string; prenom: string; role: string } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch {}
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  const userName = user ? `${user.prenom} ${user.nom}` : "Admin";
  const userInitials = user ? `${user.prenom[0]}${user.nom[0]}`.toUpperCase() : "AD";

  return (
    <header className="bg-background border-b border-border shadow-sm px-6 py-4 flex items-center justify-between gap-3 transition-colors duration-300 relative z-40">
      <div>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <div className="flex items-center gap-6">
        {/* ── Notification Bell + Dropdown ── */}
        <div className="relative" ref={dropdownRef}>
          <div 
            className="relative cursor-pointer transition hover:scale-110 p-1"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <Bell className="text-foreground" size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full animate-pulse">
                {unreadCount}
              </span>
            )}
          </div>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div className="absolute right-0 mt-3 w-80 bg-card border border-border shadow-xl rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
                <h3 className="font-semibold text-sm">Notifications</h3>
                {notifications.length > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-[10px] text-emerald-600 hover:underline font-medium"
                  >
                    Tout marquer comme lu
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <p className="text-sm italic">Aucune notification</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      className={`p-4 border-b border-border last:border-0 hover:bg-muted/20 transition-colors relative group ${!notif.isRead ? 'bg-emerald-50/10' : ''}`}
                    >
                      {!notif.isRead && (
                        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                      )}
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-xs font-bold ${
                          notif.type === 'success' ? 'text-emerald-600' :
                          notif.type === 'error' ? 'text-red-500' :
                          'text-blue-500'
                        }`}>
                          {notif.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock size={10} />
                          {formatTime(notif.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{notif.message}</p>
                      <button 
                        onClick={() => markAsRead(notif.id)}
                        className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition p-1 hover:bg-emerald-100 rounded text-emerald-600"
                        title="Marquer comme lu"
                      >
                        <Check size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {notifications.length > 0 && (
                <div className="p-2 border-t border-border bg-muted/10 text-center">
                  <button 
                    onClick={clearAll}
                    className="text-[10px] text-red-500 hover:text-red-600 flex items-center justify-center gap-1 w-full py-1 transition"
                  >
                    <Trash2 size={10} />
                    Effacer tout l'historique
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── User Profile ── */}
        <div className="flex items-center gap-3 pl-4 border-l border-border">
          <div className="flex flex-col items-end">
            <span className="text-sm text-foreground font-semibold leading-none">{userName}</span>
            <span className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">{user?.role || adminRole}</span>
          </div>
          <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-800 dark:text-emerald-400 text-xs font-bold shadow-sm">
            {userInitials}
          </div>
        </div>
      </div>
    </header>
  );
}