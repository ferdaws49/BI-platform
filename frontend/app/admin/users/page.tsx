"use client";

import { useEffect, useState, useMemo } from "react";
import type { User } from "./components/UserTable";
import { useToast } from "./components/Toast";

import UsersToolbar from "./components/UsersToolBar";
import UsersTable from "./components/UserTable";
import UserModal from "./components/UserModal";
import DeleteDialog from "./components/DeleteDialog";
import ResetPasswordDialog from "./components/ResetPasswordDialog";

const API = "http://localhost:5000";
const PER_PAGE = 6;

const ROLE_TO_ENUM: Record<string, string> = {
  Admin: "admin",
  Directeur: "directeur",
  "Resp. Pédagogique": "resp_pedagogique",
};

const staticUsers: User[] = [
  {
    id: 1,
    nom: "Trabelsi",
    prenom: "Sami",
    email: "s.trabelsi@centre.tn",
    role: "Admin",
    isActive: true,
    creeLe: "12 Jan 2026",
  },
  {
    id: 2,
    nom: "Mansour",
    prenom: "Leila",
    email: "l.mansour@centre.tn",
    role: "Directeur",
    isActive: true,
    creeLe: "08 Fév 2026",
  },
  {
    id: 3,
    nom: "Bouzid",
    prenom: "Karim",
    email: "k.bouzid@centre.tn",
    role: "Resp. Pédagogique",
    isActive: true,
    creeLe: "15 Fév 2026",
  },
  {
    id: 4,
    nom: "Chouchen",
    prenom: "Amira",
    email: "a.chouchen@centre.tn",
    role: "Resp. Pédagogique",
    isActive: false,
    creeLe: "20 Fév 2026",
  },
];

/**
 * Standardized API call wrapper for admin user management.
 * Injects the access token from localStorage for authentication.
 */
function apiCall(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("access_token");
  return fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
}

export default function UsersPage() {
  const { showToast, ToastComponent } = useToast(); // ← hook toast

  const [users, setUsers] = useState<User[]>(staticUsers);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [resetUser, setResetUser] = useState<User | null>(null);

  useEffect(() => {
    apiCall("/admin/users")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setUsers(data);
      })
      .catch(() => {});
  }, []);

  // ── Search & Filter Logic ──────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        (!q ||
          u.nom.toLowerCase().includes(q) ||
          u.prenom.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)) &&
        (!roleFilter || u.role === roleFilter),
    );
  }, [users, search, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleSearchChange = (v: string) => {
    setSearch(v);
    setPage(1);
  };
  const handleRoleFilterChange = (v: string) => {
    setRoleFilter(v);
    setPage(1);
  };
  const handleAddClick = () => {
    setEditUser(null);
    setShowModal(true);
  };
  const handleEdit = (u: User) => {
    setEditUser(u);
    setShowModal(true);
  };

  // ── CREATE / UPDATE ──────────────────────────────────────
  const handleSave = async (
    data: Omit<User, "id" | "creeLe"> & { password?: string },
  ) => {
    const roleEnum = ROLE_TO_ENUM[data.role] ?? data.role;

    if (editUser) {
      const res = await apiCall(`/admin/users/${editUser.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          nom: data.nom,
          prenom: data.prenom,
          email: data.email,
          role: roleEnum,
          isActive: data.isActive,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Erreur lors de la modification");
      }
      const updated: User = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === editUser.id ? updated : u)));
      showToast(
        `✓ ${updated.prenom} ${updated.nom} mis à jour avec succès`,
        "success",
      );
    } else {
      const res = await apiCall("/admin/users", {
        method: "POST",
        body: JSON.stringify({
          nom: data.nom,
          prenom: data.prenom,
          email: data.email,
          password: data.password,
          role: roleEnum,
          isActive: data.isActive,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Erreur lors de la création");
      }
      const created: User = await res.json();
      setUsers((prev) => [created, ...prev]);
      showToast(
        `✓ ${created.prenom} ${created.nom} créé avec succès`,
        "success",
      );
    }
  };

  // ── TOGGLE ACTIVE ────────────────────────────────────────
  const handleToggleActive = async (id: number) => {
    const target = users.find((u) => u.id === id);
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, isActive: !u.isActive } : u)),
    );
    try {
      const res = await apiCall(`/admin/users/${id}/toggle-active`, {
        method: "PATCH",
      });
      if (!res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === id ? { ...u, isActive: !u.isActive } : u)),
        );
        showToast("Erreur lors de la mise à jour", "error");
      } else {
        const newState = !target?.isActive;
        showToast(
          `✓ Compte ${newState ? "activé" : "désactivé"} avec succès`,
          newState ? "success" : "warning",
        );
      }
    } catch {}
  };

  // ── DELETE ───────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!deleteUser) return;
    try {
      const res = await apiCall(`/admin/users/${deleteUser.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== deleteUser.id));
        showToast(
          `✓ ${deleteUser.prenom} ${deleteUser.nom} supprimé avec succès`,
          "success",
        );
      } else {
        showToast("Erreur lors de la suppression", "error");
      }
    } catch {
      setUsers((prev) => prev.filter((u) => u.id !== deleteUser.id));
      showToast(`✓ ${deleteUser.prenom} ${deleteUser.nom} supprimé`, "success");
    }
    setDeleteUser(null);
  };

  // ── RESET PASSWORD ───────────────────────────────────────
  const handleResetPasswordConfirm = async () => {
    if (!resetUser) return;
    try {
      const res = await apiCall(`/admin/users/${resetUser.id}/reset-password`, {
        method: "POST",
      });
      if (res.ok) {
        showToast(
          `✓ Email de réinitialisation envoyé à ${resetUser.email}`,
          "success",
        );
      } else {
        showToast("Erreur lors de la réinitialisation", "error");
      }
    } catch {
      showToast("Erreur de connexion au serveur", "error");
    }
    setResetUser(null);
  };

  return (
    <div className="space-y-5">
      {/* Toast monté via portal sur document.body — jamais bloqué par overflow/z-index */}
      {ToastComponent}

      <UsersToolbar
        search={search}
        roleFilter={roleFilter}
        totalCount={filtered.length}
        onSearchChange={handleSearchChange}
        onRoleFilterChange={handleRoleFilterChange}
        onAddClick={handleAddClick}
      />

      <UsersTable
        users={paginated}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onToggleActive={handleToggleActive}
        onEdit={handleEdit}
        onDelete={setDeleteUser}
        onResetPassword={setResetUser}
      />

      {showModal && (
        <UserModal
          user={editUser}
          onClose={() => {
            setShowModal(false);
            setEditUser(null);
          }}
          onSave={handleSave}
        />
      )}

      {deleteUser && (
        <DeleteDialog
          user={deleteUser}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteUser(null)}
        />
      )}

      {resetUser && (
        <ResetPasswordDialog
          user={resetUser}
          onConfirm={handleResetPasswordConfirm}
          onClose={() => setResetUser(null)}
        />
      )}
    </div>
  );
}
