'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';

const API = 'http://localhost:5000';

interface NotificationItem {
  type: 'note' | 'absence';
  id: number | string;
  titre: string;
  detail: string;
  date: string;
}

export default function NotificationBadge() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [nonLues, setNonLues] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.log('❌ Pas de token');
      return;
    }

    // Récupérer since du localStorage, sinon date très ancienne
    let since = localStorage.getItem('notifications_derniere_vue');
    if (!since) {
      since = '2000-01-01T00:00:00.000Z'; // Date très ancienne pour tout récupérer
    }
    
    console.log('📅 Since utilisé:', since);

    setLoading(true);
    try {
      const urlNotes = `${API}/results/mes-notes?since=${encodeURIComponent(since)}`;
      const urlAbsences = `${API}/schedules/mes-absences?since=${encodeURIComponent(since)}`;
      
      console.log('📡 URL notes:', urlNotes);
      console.log('📡 URL absences:', urlAbsences);

      const [notesRes, absencesRes] = await Promise.all([
        fetch(urlNotes, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(urlAbsences, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      console.log('📡 Status notes:', notesRes.status);
      console.log('📡 Status absences:', absencesRes.status);

      const notes = notesRes.ok ? await notesRes.json() : [];
      const absences = absencesRes.ok ? await absencesRes.json() : [];

      console.log('📡 Notes reçues:', notes);
      console.log('📡 Absences reçues:', absences);

      const items: NotificationItem[] = [
        ...notes.map((n: any) => ({
          type: 'note' as const,
          id: n.id,
          titre: `Nouvelle note : ${n.note}/20`,
          detail: `${n.formation?.titre || 'Formation'} — ${n.session?.titre || 'Session'}`,
          date: n.date,
        })),
        ...absences.map((a: any) => ({
          type: 'absence' as const,
          id: a.id,
          titre: 'Absence signalée',
          detail: a.session?.titre || 'Session',
          date: a.dateMarquage,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      console.log('📊 Total notifications:', items.length);

      setNotifications(items);
      setNonLues(items.length);
    } catch (err) {
      console.error('❌ Erreur notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    const willOpen = !open;
    setOpen(willOpen);
    
    if (willOpen && nonLues > 0) {
      const now = new Date().toISOString();
      localStorage.setItem('notifications_derniere_vue', now);
      setNonLues(0);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "À l'instant";
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    return d.toLocaleDateString('fr-FR');
  };

  const toutEffacer = () => {
    const now = new Date().toISOString();
    localStorage.setItem('notifications_derniere_vue', now);
    setNonLues(0);
    setNotifications([]);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={handleToggle}
        className="relative text-gray-400 hover:text-[#1b5333] transition-colors p-1"
      >
        <Bell size={22} />
        {nonLues > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white animate-pulse">
            {nonLues > 9 ? '9+' : nonLues}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-700">Notifications</h3>
            {notifications.length > 0 && (
              <button
                onClick={toutEffacer}
                className="text-xs text-[#1b5333] hover:text-[#144228] font-medium transition-colors"
              >
                Tout effacer
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">
                Chargement...
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">
                Aucune nouvelle notification
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={`${notif.type}-${notif.id}`}
                  className="px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                        notif.type === 'note' ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {notif.titre}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{notif.detail}</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {formatDate(notif.date)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}