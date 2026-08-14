import Link from "next/link";

type Props = { compact?: boolean };

export default function GjcLogo({ compact = false }: Props) {
  return (
    <Link href="/" aria-label="Guruji Collections home" className="inline-flex items-center gap-3">
      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#171717] text-[#c68a32] shadow-sm ring-1 ring-black/10">
        <svg aria-hidden="true" viewBox="0 0 48 48" className="absolute inset-[6px] h-[calc(100%-12px)] w-[calc(100%-12px)]">
          <path d="M8 18l5-6 5 5 6-9 6 9 5-5 5 6v4H8z" fill="currentColor" />
          <path d="M10 24h28v3H10z" fill="currentColor" />
        </svg>
        <span className="relative mt-4 text-[10px] font-black tracking-[-0.08em] text-white">GJC</span>
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
