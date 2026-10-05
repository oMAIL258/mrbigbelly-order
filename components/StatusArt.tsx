'use client';

type Props = { status: 'new' | 'confirmed' | 'ready' | 'done'; mode: 'pickup' | 'delivery' };

export function StatusArt({ status, mode }: Props) {
  if (status === 'confirmed') return <Cooking />;
  if (status === 'ready') return mode === 'delivery' ? <Scooter /> : <ReadyBag />;
  if (status === 'done') return mode === 'delivery' ? <Delivered /> : <ReadyBag done />;
  return <Waiting />;
}

const Frame = ({ children }: { children: React.ReactNode }) => (
  <svg viewBox="0 0 240 120" className="w-full max-w-[280px] mx-auto" role="img" aria-hidden="true">
    {children}
  </svg>
);

function Waiting() {
  return (
    <Frame>
      <style>{`
        @keyframes mbbDot { 0%,100% { opacity:.25 } 50% { opacity:1 } }
        .mbb-d { animation: mbbDot 1.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .mbb-d { animation: none; opacity: .7 } }
      `}</style>
      <rect x="62" y="34" width="116" height="62" rx="10" fill="var(--surface-2)" stroke="var(--rule)" strokeWidth="2" />
      <rect x="78" y="50" width="84" height="6" rx="3" fill="var(--rule)" />
      <rect x="78" y="64" width="56" height="6" rx="3" fill="var(--rule)" />
      <circle className="mbb-d" cx="98" cy="84" r="5" fill="var(--accent)" />
      <circle className="mbb-d" cx="118" cy="84" r="5" fill="var(--accent)" style={{ animationDelay: '.2s' }} />
      <circle className="mbb-d" cx="138" cy="84" r="5" fill="var(--accent)" style={{ animationDelay: '.4s' }} />
    </Frame>
  );
}

function Cooking() {
  return (
    <Frame>
      <style>{`
        @keyframes mbbSteam {
          0%   { transform: translateY(0) scale(1);   opacity: 0 }
          25%  { opacity: .75 }
          100% { transform: translateY(-26px) scale(1.35); opacity: 0 }
        }
        @keyframes mbbFlame { 0%,100% { transform: scaleY(1) } 50% { transform: scaleY(.72) } }
        @keyframes mbbWobble { 0%,100% { transform: rotate(-1.2deg) } 50% { transform: rotate(1.2deg) } }
        .mbb-steam { animation: mbbSteam 2.4s ease-out infinite; transform-origin: center bottom; }
        .mbb-flame { animation: mbbFlame .5s ease-in-out infinite; transform-origin: center bottom; }
        .mbb-pan   { animation: mbbWobble 2.6s ease-in-out infinite; transform-origin: 120px 86px; }
        @media (prefers-reduced-motion: reduce) {
          .mbb-steam, .mbb-flame, .mbb-pan { animation: none }
          .mbb-steam { opacity: .5 }
        }
      `}</style>
      <g className="mbb-steam"><path d="M104 56c0-8 8-8 8-16s-8-8-8-16" stroke="var(--accent-soft)" strokeWidth="4" fill="none" strokeLinecap="round" /></g>
      <g className="mbb-steam" style={{ animationDelay: '.8s' }}><path d="M120 56c0-8 8-8 8-16s-8-8-8-16" stroke="var(--accent-soft)" strokeWidth="4" fill="none" strokeLinecap="round" /></g>
      <g className="mbb-steam" style={{ animationDelay: '1.6s' }}><path d="M136 56c0-8 8-8 8-16s-8-8-8-16" stroke="var(--accent-soft)" strokeWidth="4" fill="none" strokeLinecap="round" /></g>

      <g className="mbb-pan">
        <path d="M74 62h92l-8 26a10 10 0 0 1-10 8H92a10 10 0 0 1-10-8z" fill="var(--accent)" />
        <rect x="68" y="56" width="104" height="8" rx="4" fill="var(--ink)" opacity=".85" />
      </g>
      <g className="mbb-flame">
        <path d="M112 100c0-6 8-8 8-14 4 4 8 8 8 14a8 8 0 0 1-16 0z" fill="#F2A33C" />
      </g>
      <rect x="86" y="108" width="68" height="5" rx="2.5" fill="var(--rule)" />
    </Frame>
  );
}

function Scooter() {
  return (
    <Frame>
      <style>{`
        @keyframes mbbRoad  { from { transform: translateX(0) } to { transform: translateX(-40px) } }
        @keyframes mbbWheel { to { transform: rotate(360deg) } }
        @keyframes mbbBob   { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-2px) } }
        .mbb-road  { animation: mbbRoad .6s linear infinite; }
        .mbb-wheel { animation: mbbWheel .7s linear infinite; }
        .mbb-ride  { animation: mbbBob 1s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .mbb-road,.mbb-wheel,.mbb-ride { animation: none } }
      `}</style>

      <g className="mbb-ride">
        {/* delivery box */}
        <rect x="52" y="48" width="34" height="26" rx="4" fill="var(--accent)" />
        <rect x="60" y="56" width="18" height="4" rx="2" fill="#fff" opacity=".9" />
        {/* body */}
        <path d="M86 76h34l14-20h14" stroke="var(--ink)" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M96 76c6-14 20-16 30-10" stroke="var(--accent)" strokeWidth="5" fill="none" strokeLinecap="round" />
        {/* rider */}
        <circle cx="118" cy="38" r="9" fill="var(--ink)" />
        <path d="M112 50c6-5 14-4 18 2l8 6" stroke="var(--ink)" strokeWidth="5" fill="none" strokeLinecap="round" />
      </g>

      <g transform="translate(86 88)">
        <circle r="13" fill="none" stroke="var(--ink)" strokeWidth="4" />
        <g className="mbb-wheel"><path d="M0-9v18M-9 0h18" stroke="var(--ink-3)" strokeWidth="2.5" /></g>
      </g>
      <g transform="translate(150 88)">
        <circle r="13" fill="none" stroke="var(--ink)" strokeWidth="4" />
        <g className="mbb-wheel"><path d="M0-9v18M-9 0h18" stroke="var(--ink-3)" strokeWidth="2.5" /></g>
      </g>

      <g className="mbb-road">
        {[0, 40, 80, 120, 160, 200, 240].map((x) => (
          <rect key={x} x={x} y="106" width="22" height="4" rx="2" fill="var(--rule)" />
        ))}
      </g>
    </Frame>
  );
}

function ReadyBag({ done = false }: { done?: boolean }) {
  return (
    <Frame>
      <style>{`
        @keyframes mbbPop { 0% { transform: scale(.9) } 60% { transform: scale(1.04) } 100% { transform: scale(1) } }
        @keyframes mbbShine { 0%,100% { opacity:.3 } 50% { opacity:.9 } }
        .mbb-bag { animation: mbbPop .5s ease-out both; transform-origin: 120px 80px; }
        .mbb-shine { animation: mbbShine 1.8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .mbb-bag,.mbb-shine { animation: none } }
      `}</style>
      <g className="mbb-bag">
        <path d="M80 48h80l-8 54a8 8 0 0 1-8 7H96a8 8 0 0 1-8-7z" fill="var(--accent)" />
        <path d="M104 48V38a16 16 0 0 1 32 0v10" stroke="var(--ink)" strokeWidth="5" fill="none" strokeLinecap="round" />
        {done && <path d="M104 76l12 12 22-24" stroke="#fff" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
      </g>
      {!done && <circle className="mbb-shine" cx="168" cy="44" r="6" fill="var(--accent-soft)" />}
    </Frame>
  );
}

function Delivered() {
  return (
    <Frame>
      <style>{`
        @keyframes mbbCheck { from { stroke-dashoffset: 60 } to { stroke-dashoffset: 0 } }
        @keyframes mbbRing { 0% { r: 30; opacity:.6 } 100% { r: 46; opacity: 0 } }
        .mbb-check { stroke-dasharray: 60; animation: mbbCheck .6s ease-out both; }
        .mbb-ring { animation: mbbRing 1.8s ease-out infinite; }
        @media (prefers-reduced-motion: reduce) { .mbb-check { animation: none; stroke-dashoffset: 0 } .mbb-ring { display: none } }
      `}</style>
      <circle className="mbb-ring" cx="120" cy="60" r="30" fill="none" stroke="var(--accent-soft)" strokeWidth="3" />
      <circle cx="120" cy="60" r="30" fill="var(--accent)" />
      <path className="mbb-check" d="M106 60l10 10 20-22" stroke="#fff" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="78" y="104" width="84" height="5" rx="2.5" fill="var(--rule)" />
    </Frame>
  );
}
