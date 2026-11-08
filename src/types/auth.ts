export interface User {
  id: number
  fullName: string
  email: string
  phone?: string | null
  role: 'USER' | 'ADMIN'
  createdAt: string
  _count?: {
    properties?: number
    inquiries?: number
    favorites?: number
  }
}
