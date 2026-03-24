// Auth disabled during development — restore when ready to ship
export function AuthGuard({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
