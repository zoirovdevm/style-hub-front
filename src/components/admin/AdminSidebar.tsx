'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingBag, ClipboardList, Tag, LogOut } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth-store';
import type { Dictionary } from '@/i18n/get-dictionary';
import type { Locale } from '@/i18n/config';

export function AdminSidebar({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const pathname = usePathname();
  const clearSession = useAuthStore((s) => s.clearSession);

  const links = [
    { href: `/${locale}/admin`, label: dict.admin.dashboard, icon: LayoutDashboard, exact: true },
    { href: `/${locale}/admin/products`, label: dict.admin.products, icon: ShoppingBag },
    { href: `/${locale}/admin/orders`, label: dict.admin.orders, icon: ClipboardList },
    { href: `/${locale}/admin/categories`, label: dict.admin.categories, icon: Tag },
  ];

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-ink-900/5 bg-ink-950 text-cream">
      <div className="px-6 py-8">
        <Link href={`/${locale}`} className="font-display text-xl font-semibold">
          Style<span className="text-gold-400">Hub</span>
          <span className="ml-2 text-xs font-normal text-cream/40">Admin</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {links.map((link) => {
          const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                active ? 'bg-gold-500 text-ink-950' : 'text-cream/60 hover:bg-cream/5 hover:text-cream'
              }`}
            >
              <link.icon size={17} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={() => {
          clearSession();
          window.location.href = `/${locale}`;
        }}
        className="m-3 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-cream/60 hover:bg-cream/5 hover:text-cream"
      >
        <LogOut size={17} />
        {dict.nav.logout}
      </button>
    </aside>
  );
}
