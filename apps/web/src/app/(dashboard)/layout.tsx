import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DashboardNav } from '@/components/dashboard-nav';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-black relative">
      {/* Background effects */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#080808_1px,transparent_1px),linear-gradient(to_bottom,#080808_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20 pointer-events-none" />
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-neon-purple/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-neon-cyan/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="relative">
        <DashboardNav user={session?.user || null} />
        <main className="container mx-auto px-4 py-8">{children}</main>
      </div>
    </div>
  );
}
