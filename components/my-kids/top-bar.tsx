import Image from "next/image";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

interface MyKidsTopBarProps {
  eaName: string;
  schoolName?: string;
}

export function MyKidsTopBar({ eaName, schoolName }: MyKidsTopBarProps) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
      <Link
        href="/my-kids"
        className="flex items-center gap-3 min-w-0"
        aria-label="My Kids home"
      >
        <Image
          src="/zazi_izandi_logo.png"
          alt="Zazi iZandi"
          width={120}
          height={40}
          className="h-8 w-auto shrink-0"
          priority
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            {eaName}
          </p>
          {schoolName ? (
            <p className="truncate text-xs text-slate-500">{schoolName}</p>
          ) : null}
        </div>
      </Link>

      <UserButton
        afterSignOutUrl="/"
        appearance={{
          elements: {
            avatarBox: "h-9 w-9",
          },
        }}
      />
    </header>
  );
}
