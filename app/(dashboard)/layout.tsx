import { Sidebar } from '@/components/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      {/*
        Desktop: offset 56px (w-14, collapsed) — sidebar expand pakai overlay hover, tidak geser konten
        Mobile: tidak ada offset kiri, tapi ada padding bawah untuk bottom navbar
      */}
      <main className="md:ml-14 min-h-screen">
        <div className="p-4 md:p-8 pb-24 md:pb-8">{children}</div>
      </main>
    </div>
  )
}
