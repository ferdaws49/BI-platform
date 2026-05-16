const API = 'http://localhost:5000'

// ── Register ───────────────────────────────────────
export async function registerUser(data: any) {
  const res = await fetch(`${API}/auth/registerapprenant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const json = await res.json()
  if (!res.ok) return { success: false, error: json.message }
  return { success: true }
}

// ── Forgot password ────────────────────────────────
export async function requestPasswordReset(email: string) {
  const res = await fetch(`${API}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return { success: false, error: err.message || err.error || 'Erreur' }
  }
  return res.json()
}

// ── Verify token (GET) ─────────────────────────────
export async function verifyResetToken(userId: string, resetPasswordToken: string) {
  // ⬇️ AJOUTE /auth/ ICI
  const res = await fetch(
    `${API}/auth/reset-password/${userId}/${encodeURIComponent(resetPasswordToken)}`,
    { method: 'GET' }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return { success: false, error: err.message || err.error || 'Lien invalide ou expiré' }
  }

  return res.json()
}

// ── Reset password (POST) ──────────────────────────
export async function resetPassword(
  userId: number,
  resetPasswordToken: string,
  newPassword: string
) {
  // ⬇️ AJOUTE /auth/ ICI
  const res = await fetch(`${API}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, resetPasswordToken, newPassword }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return { success: false, error: err.message || err.error || 'Erreur lors de la mise à jour' }
  }

  return res.json()
}