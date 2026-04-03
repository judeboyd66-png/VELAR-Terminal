import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'

export type { User }

export const auth = {
  signUp: async (name: string, email: string, password: string): Promise<User> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    if (error) throw error
    if (!data.user) throw new Error('Sign up failed')
    return data.user
  },

  signIn: async (email: string, password: string): Promise<User> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (!data.user) throw new Error('Sign in failed')
    return data.user
  },

  signOut: async (): Promise<void> => {
    await supabase.auth.signOut()
  },

  getUser: async (): Promise<User | null> => {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  getSession: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  },
}
