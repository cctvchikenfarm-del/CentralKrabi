import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { auth } from '../api/index.js'

/**
 * useAuth — fetches and caches current user session.
 * Returns null if not authenticated (401 redirects to /login via api client).
 */
export function useAuth() {
  return useQuery({
    queryKey: ['me'],
    queryFn: auth.me,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * useLogout — mutation to clear session and redirect to login.
 */
export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: auth.logout,
    onSuccess: () => {
      qc.clear()
      window.location.href = '/login'
    },
  })
}

/**
 * hasPermission — checks if user has a specific permission key.
 * owner bypasses all.
 */
export function hasPermission(user, permKey) {
  if (!user) return false
  if (user.role === 'owner') return true
  return user.permissions?.includes(permKey) ?? false
}
