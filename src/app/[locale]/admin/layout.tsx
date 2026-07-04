import { getDictionary } from '@/i18n/get-dictionary';
import type { Locale } from '@/i18n/config';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminGuard } from '@/components/admin/AdminGuard';

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: Locale };
}) {
  const dict = await getDictionary(params.locale);

  return (
    <AdminGuard locale={params.locale}>
      <div className="flex min-h-screen bg-cream dark:bg-ink-950">
        <AdminSidebar locale={params.locale} dict={dict} />
        <div className="flex-1 overflow-x-hidden px-6 py-8 sm:px-10">{children}</div>
      </div>
    </AdminGuard>
  );
}
