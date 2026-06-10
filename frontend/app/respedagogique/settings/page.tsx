"use client";

import { useState, useEffect, useRef } from "react";
import { Save, Lock, Bell, User, Palette, Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRespedContext } from "../RespedContext";
import {
  uploadProfileImage,
  deleteProfileImage,
  getProfileImageUrl,
} from "@/lib/profile.api";

// ─── API helpers ────────────────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

async function apiFetch(path: string, options?: RequestInit) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "API error");
  }
  return res.json();
}

// ─── Types ───────────────────────────────────────────────────────────────────
type Tab = "profile" | "security" | "notifications" | "preferences";

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface SecurityData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface NotifData {
  sessionAlerts: boolean;
  learnerRiskAlerts: boolean;
  trainerUpdates: boolean;
  feedbackAlerts: boolean;
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function RespedSettingsPage() {
  const { t: fullT } = useRespedContext();
  const t = fullT.settings;

  // ── localStorage-driven state ──
  const [dataRefresh, setDataRefresh] = useState("5min");

  // ── UI state ──
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [userId, setUserId] = useState<string | null>(null);
  const [profileStatus, setProfileStatus] = useState<
    "idle" | "saving" | "success" | "error"
  >("idle");
  const [secStatus, setSecStatus] = useState<
    "idle" | "saving" | "success" | "error" | "mismatch"
  >("idle");
  const [notifSaved, setNotifSaved] = useState(false);
  const [prefSaved, setPrefSaved] = useState(false);

  // ── Image state ──
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [imageVersion, setImageVersion] = useState(Date.now());
  const [imgLoading, setImgLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Form state ──
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [security, setSecurity] = useState<SecurityData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [notifs, setNotifs] = useState<NotifData>({
    sessionAlerts: true,
    learnerRiskAlerts: true,
    trainerUpdates: true,
    feedbackAlerts: false,
  });

  // ── Load localStorage on mount ──
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    let currentUserId = "";
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setUserId(u.id);
        currentUserId = u.id;
      } catch {}
    }

    const savedRefresh = localStorage.getItem("dataRefresh-resped") ?? "5min";
    const savedNotifs = localStorage.getItem(
      `notifications_settings_${currentUserId}`,
    );

    setDataRefresh(savedRefresh);
    if (savedNotifs) {
      try {
        setNotifs(JSON.parse(savedNotifs));
      } catch (e) {
        console.error("Error parsing resped notifications", e);
      }
    }
  }, []);

  // ── Load profile image ──
  useEffect(() => {
    apiFetch("/profile/me")
      .then((data) => {
        setProfileImage(data?.profileImage ?? null);
      })
      .catch(() => {});
  }, []);

  // ── Load profile from API ──
  useEffect(() => {
    setProfileLoading(true);
    setProfileError(null);

    apiFetch("/settings/profile")
      .then((data) => {
        setProfile({
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          email: data.email || "",
          phone: data.phone || "",
        });
        setProfileLoading(false);
      })
      .catch((err) => {
        console.error("Erreur chargement profile:", err);
        setProfileError(err.message ?? "Erreur de chargement");
        setProfileLoading(false);
      });
  }, []);

  // ── Handlers ──
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => {
      if (!prev) return null;
      return { ...prev, [name]: value };
    });
  };

  const handleSecurityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSecurity((prev) => ({ ...prev, [name]: value }));
  };

  const handleNotifChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setNotifs((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    setProfileStatus("saving");
    try {
      await apiFetch("/settings/profile", {
        method: "PUT",
        body: JSON.stringify(profile),
      });
      setProfileStatus("success");
    } catch {
      setProfileStatus("error");
    }
    setTimeout(() => setProfileStatus("idle"), 3000);
  };

  const handleChangePassword = async () => {
    if (security.newPassword !== security.confirmPassword) {
      setSecStatus("mismatch");
      setTimeout(() => setSecStatus("idle"), 3000);
      return;
    }
    setSecStatus("saving");
    try {
      await apiFetch("/settings/change-password", {
        method: "POST",
        body: JSON.stringify(security),
      });
      setSecStatus("success");
      setSecurity({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch {
      setSecStatus("error");
    }
    setTimeout(() => setSecStatus("idle"), 3000);
  };

  const handleSaveNotifs = () => {
    localStorage.setItem(
      `notifications_settings_${userId}`,
      JSON.stringify(notifs),
    );
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 2000);
  };

  const handleSavePrefs = () => {
    localStorage.setItem("dataRefresh-resped", dataRefresh);
    setPrefSaved(true);
    setTimeout(() => setPrefSaved(false), 2000);
  };

  // ── Image upload handler ──
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImgLoading(true);
      try {
        await uploadProfileImage(e.target.files[0]);
        setImageVersion(Date.now());
        const data = await apiFetch("/profile/me");
        setProfileImage(data?.profileImage ?? null);
        toast.success("Photo de profil mise à jour !");
      } catch (err: any) {
        toast.error(err.message || "Erreur lors de l'upload de la photo");
      } finally {
        setImgLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  };

  // ── Image delete handler ──
  const handleDeleteImage = async () => {
    setImgLoading(true);
    try {
      await deleteProfileImage();
      setProfileImage(null);
      toast.success("Photo supprimée !");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la suppression");
    } finally {
      setImgLoading(false);
    }
  };

  // ── CSS classes ──
  const cardBg = "bg-white border-gray-200";
  const textPrimary = "text-gray-900";
  const textSecondary = "text-gray-600";
  const inputCls =
    "w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors bg-white border-gray-300 text-gray-900";
  const selectCls =
    "w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors bg-white border-gray-300 text-gray-900";
  const borderColor = "border-gray-200";
  const hoverRow = "hover:bg-gray-50";

  const tabs: { id: Tab; label: string; icon: typeof User }[] = [
    { id: "profile", label: t.tabs.profile, icon: User },
    { id: "security", label: t.tabs.security, icon: Lock },
    { id: "notifications", label: t.tabs.notifications, icon: Bell },
    { id: "preferences", label: t.tabs.preferences, icon: Palette },
  ];

  return (
    <div className="min-h-screen bg-gray-50 transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${textPrimary}`}>{t.title}</h1>
          <p className={`mt-1 ${textSecondary}`}>{t.subtitle}</p>
        </div>

        {/* Tabs */}
        <div className={`flex gap-1 mb-6 border-b ${borderColor}`}>
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === id
                  ? "border-b-2 border-emerald-500 text-emerald-500"
                  : `${textSecondary} hover:${textPrimary}`
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ── PROFILE TAB ── */}
        {activeTab === "profile" && (
          <div className={`rounded-xl border p-8 shadow-sm ${cardBg}`}>
            <h2 className={`text-lg font-semibold mb-6 ${textPrimary}`}>
              {t.profile.title}
            </h2>

            {/* ── Photo de profil ── */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative group">
                {profileImage ? (
                  <img
                    key={`${profileImage}-${imageVersion}`}
                    src={getProfileImageUrl(profileImage, imageVersion)}
                    alt="Photo de profil"
                    className="w-32 h-32 rounded-full object-cover border-4 border-emerald-100 shadow-md"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-emerald-600 text-white flex items-center justify-center text-4xl font-bold border-4 border-emerald-100 shadow-md">
                    {profile?.firstName?.charAt(0)?.toUpperCase() ?? (
                      <User className="h-10 w-10" />
                    )}
                  </div>
                )}
                {/* Bouton upload */}
                <label className="absolute bottom-0 right-0 p-2 bg-white border border-gray-200 rounded-full shadow cursor-pointer hover:bg-gray-50 transition-colors">
                  {imgLoading ? (
                    <div className="h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="h-5 w-5 text-gray-600" />
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={imgLoading}
                  />
                </label>
                {/* Bouton suppression */}
                {profileImage && (
                  <button
                    onClick={handleDeleteImage}
                    disabled={imgLoading}
                    className="absolute bottom-0 left-0 p-2 bg-white border border-gray-200 rounded-full shadow cursor-pointer hover:bg-red-50 text-red-500 transition-colors"
                    title="Supprimer la photo"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Cliquez sur l'icône caméra pour changer votre photo
              </p>
            </div>

            {profileLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                <span className="ml-3 text-gray-500">Chargement...</span>
              </div>
            ) : profileError ? (
              <div className="text-center py-8">
                <p className="text-red-500 mb-4">{profileError}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm"
                >
                  Réessayer
                </button>
              </div>
            ) : !profile ? (
              <div className="text-center py-8 text-red-500">
                Profil non disponible
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label
                      className={`block text-sm font-medium mb-1.5 ${textSecondary}`}
                    >
                      {t.profile.firstName}
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={profile.firstName}
                      onChange={handleProfileChange}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-sm font-medium mb-1.5 ${textSecondary}`}
                    >
                      {t.profile.lastName}
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={profile.lastName}
                      onChange={handleProfileChange}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label
                      className={`block text-sm font-medium mb-1.5 ${textSecondary}`}
                    >
                      {t.profile.email}
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={profile.email}
                      onChange={handleProfileChange}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-sm font-medium mb-1.5 ${textSecondary}`}
                    >
                      {t.profile.phone}
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={profile.phone}
                      onChange={handleProfileChange}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSaveProfile}
                    disabled={profileStatus === "saving"}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Save className="h-4 w-4" />
                    {profileStatus === "saving"
                      ? t.profile.saving
                      : t.profile.save}
                  </button>
                  {profileStatus === "success" && (
                    <span className="text-emerald-500 text-sm font-medium">
                      {t.profile.success}
                    </span>
                  )}
                  {profileStatus === "error" && (
                    <span className="text-red-500 text-sm font-medium">
                      {t.profile.error}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── SECURITY TAB ── */}
        {activeTab === "security" && (
          <div className={`rounded-xl border p-8 shadow-sm ${cardBg}`}>
            <h2 className={`text-lg font-semibold mb-6 ${textPrimary}`}>
              {t.security.title}
            </h2>

            <div className="space-y-4 mb-6">
              <div>
                <label
                  className={`block text-sm font-medium mb-1.5 ${textSecondary}`}
                >
                  {t.security.current}
                </label>
                <input
                  type="password"
                  name="currentPassword"
                  value={security.currentPassword}
                  onChange={handleSecurityChange}
                  className={inputCls}
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label
                  className={`block text-sm font-medium mb-1.5 ${textSecondary}`}
                >
                  {t.security.new}
                </label>
                <input
                  type="password"
                  name="newPassword"
                  value={security.newPassword}
                  onChange={handleSecurityChange}
                  className={inputCls}
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label
                  className={`block text-sm font-medium mb-1.5 ${textSecondary}`}
                >
                  {t.security.confirm}
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={security.confirmPassword}
                  onChange={handleSecurityChange}
                  className={inputCls}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleChangePassword}
                disabled={secStatus === "saving"}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Lock className="h-4 w-4" />
                {secStatus === "saving" ? t.security.saving : t.security.save}
              </button>
              {secStatus === "success" && (
                <span className="text-emerald-500 text-sm font-medium">
                  {t.security.success}
                </span>
              )}
              {secStatus === "mismatch" && (
                <span className="text-red-500 text-sm font-medium">
                  {t.security.mismatch}
                </span>
              )}
              {secStatus === "error" && (
                <span className="text-red-500 text-sm font-medium">
                  {t.security.error}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── NOTIFICATIONS TAB ── */}
        {activeTab === "notifications" && (
          <div className={`rounded-xl border p-8 shadow-sm ${cardBg}`}>
            <h2 className={`text-lg font-semibold mb-6 ${textPrimary}`}>
              {t.notifications.title}
            </h2>

            <div className="space-y-3 mb-6">
              {t.notifications.items.map((item: any) => (
                <div
                  key={item.key}
                  className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${borderColor} ${hoverRow}`}
                >
                  <div>
                    <p className={`text-sm font-medium ${textPrimary}`}>
                      {item.label}
                    </p>
                    <p className={`text-xs mt-0.5 ${textSecondary}`}>
                      {item.desc}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-4">
                    <input
                      type="checkbox"
                      name={item.key}
                      checked={notifs[item.key as keyof NotifData]}
                      onChange={handleNotifChange}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer peer-checked:bg-emerald-500 peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </label>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveNotifs}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Save className="h-4 w-4" />
                {t.notifications.save}
              </button>
              {notifSaved && (
                <span className="text-emerald-500 text-sm font-medium">
                  {t.notifications.saved}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── PREFERENCES TAB ── */}
        {activeTab === "preferences" && (
          <div className={`rounded-xl border p-8 shadow-sm ${cardBg}`}>
            <h2 className={`text-lg font-semibold mb-6 ${textPrimary}`}>
              {t.preferences.title}
            </h2>

            <div className="space-y-5 mb-6">
              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${textSecondary}`}
                >
                  {t.preferences.dataRefresh}
                </label>
                <select
                  value={dataRefresh}
                  onChange={(e) => setDataRefresh(e.target.value)}
                  className={selectCls}
                >
                  <option value="1min">{t.preferences.refresh1}</option>
                  <option value="5min">{t.preferences.refresh5}</option>
                  <option value="15min">{t.preferences.refresh15}</option>
                  <option value="30min">{t.preferences.refresh30}</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSavePrefs}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Save className="h-4 w-4" />
                {t.preferences.save}
              </button>
              {prefSaved && (
                <span className="text-emerald-500 text-sm font-medium">
                  {t.preferences.saved}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
