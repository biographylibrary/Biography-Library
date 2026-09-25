import Image from 'next/image';

export function PioneerBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#C4DAEB] py-0.5 pl-1 pr-2.5 text-xs font-medium text-[#121212]">
      <Image src="/logo-black.svg" alt="" width={14} height={16} className="h-4 w-auto" />
      {label}
    </span>
  );
}
