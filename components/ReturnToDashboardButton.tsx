import Link from "next/link";

type ReturnToDashboardButtonProps = {
  className?: string;
};

export default function ReturnToDashboardButton({ className = "" }: ReturnToDashboardButtonProps) {
  return (
    <Link
      href="/dashboard"
      className={`btn btn-primary w-full justify-center px-8 py-4 text-base md:w-auto md:min-w-[260px] ${className}`.trim()}
    >
      Return to Dashboard
    </Link>
  );
}
