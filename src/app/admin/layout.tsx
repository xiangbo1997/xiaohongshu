'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    // 登录页面不需要验证
    if (pathname === '/admin/login') {
      setChecking(false)
      setAuthenticated(true)
      return
    }

    // 验证管理员身份
    fetch('/api/admin/verify')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setAuthenticated(true)
        } else {
          router.replace('/admin/login')
        }
      })
      .catch(() => {
        router.replace('/admin/login')
      })
      .finally(() => {
        setChecking(false)
      })
  }, [pathname, router])

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-700">验证中...</p>
      </div>
    )
  }

  if (!authenticated && pathname !== '/admin/login') {
    return null
  }

  return <>{children}</>
}
