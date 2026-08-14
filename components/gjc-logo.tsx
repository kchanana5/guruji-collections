import Link from "next/link";

type Props = { compact?: boolean };

export default function GjcLogo({ compact = false }: Props) {
  return (
    <Link href="/" aria-label="Guruji Collections home" className="inline-flex items-center gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#171717] shadow-sm ring-1 ring-black/10">
        <svg aria-hidden="true" viewBox="0 0 48 48" className="h-8 w-8">
          <path d="M10 12h18c5 0 8 3 8 7 0 2-.8 3.8-2.2 5.1 2.6 1.1 4.2 3.2 4.2 6.1 0 4.7-3.5 7.8-9 7.8H10V12Zm7 6v7h9c1.9 0 3-1.2 3-3.4 0-2.4-1.2-3.6-3.6-3.6H17Zm0 13v7h11c2.5 0 3.8-1.3 3.8-3.6 0-2.3-1.4-3.4-4.1-3.4H17Z" fill="#C99A52" />
          <path d="M7 10h3v29H7z" fill="#fff" opacity=".95" />
        </svg>
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block text-[15px] font-black tracking-[0.28em] text-[#171717]">GURUJI</span>
          <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.32em] text-[#b17a2c]">Collections</span>
        </span>
      )}
    </Link>
  );
}
