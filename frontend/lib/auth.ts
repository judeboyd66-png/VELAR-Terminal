export interface VelarUser {
  name: string
  email: string
  joinedAt: string
}

const KEY = 'velar-user'

export const auth = {
  getUser: (): VelarUser | null => {
    if (typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  },

  isAuthenticated: (): boolean => {
    return !!auth.getUser()
  },

  signUp: (name: string, email: string): VelarUser => {
    const user: VelarUser = { name, email, joinedAt: new Date().toISOString() }
    localStorage.setItem(KEY, JSON.stringify(user))
    return user
  },

  signIn: (email: string): VelarUser | null => {
    // Simple: check if email matches stored user
    const user = auth.getUser()
    if (user && user.email.toLowerCase() === email.toLowerCase()) return user
    // In production this would be a real API call
    return null
  },

  signOut: () => {
    localStorage.removeItem(KEY)
    window.location.href = '/'
  },
}
