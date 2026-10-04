'use client';
import Link from 'next/link';
import { useCart } from '@/lib/cart';

export function Header({ title, back }: { title?: string; back?: string }) {
  const lines = useCart((s) => s.lines);
  const count = lines.reduce((n, l) => n + l.qty, 0);
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 bg-bg/95 backdrop-blur border-b border-rule px-4 py-3">
      {back ? (
        <Link href={back} className="text-ink-2 text-xl leading-none" aria-label="Back">←</Link>
      ) : (
        <img src="/logo.jpg" alt="" className="h-9 w-9 rounded-full object-cover" />
      )}
      <div className="serif text-lg flex-1 truncate">{title ?? 'Mr. Big Belly'}</div>
      <Link href="/cart" className="relative rounded-full border border-rule bg-white px-3 py-1.5 text-sm">
        Cart
        {count > 0 && (
          <span className="absolute -right-1 -top-1 rounded-full bg-accent text-white text-[10px] px-1.5 py-0.5">{count}</span>
        )}
      </Link>
    </header>
  );
}
