export interface User {
  id: number
  fullName: string
  email: string
  phone?: string | null
  telegram?: string | null
  role: 'USER' | 'ADMIN'
  emailVerified: boolean
  createdAt: string
}
