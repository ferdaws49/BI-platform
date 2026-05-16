'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles, ArrowRight } from 'lucide-react';

const API_URL = 'http://localhost:5000';

export default function ApprenantWelcomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          router.replace('/login');
          return;
        }

        const res = await fetch(`${API_URL}/inscriptions/student`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
          setChecking(false);
          return; // Reste sur Welcome
        }

        const text = await res.text();
        const regs = text ? JSON.parse(text) : [];

        if (Array.isArray(regs) && regs.length > 0) {
          router.replace('/apprenant/dashboard');
        } else {
          setChecking(false); // Nouveau apprenant, reste sur Welcome
        }
      } catch (err) {
        console.error(err);
        setChecking(false);
      }
    };

    check();
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-gray-50 flex items-center justify-center p-6">
      <div className="max-w-2xl text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider">
          <Sparkles size={14} /> Welcome to your learning space
        </div>
        
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
          Start your <span className="text-[#1b5333]">journey</span> today
        </h1>
        
        <p className="text-gray-500 text-lg max-w-lg mx-auto">
          You are validated by the administration. Explore our available programs and enroll in your first training session.
        </p>
        
        <button 
          onClick={() => router.push('/apprenant/catalogue')}
          className="bg-[#1b5333] text-white px-10 py-5 rounded-2xl font-bold text-lg flex items-center gap-3 hover:bg-[#154128] transition-all shadow-xl mx-auto"
        >
          Browse All Trainings <ArrowRight size={22} />
        </button>
      </div>
    </div>
  );
}