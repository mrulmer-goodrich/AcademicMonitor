"use client";

type ReturnToDashboardButtonProps = {
  className?: string;
};

export default function ReturnToDashboardButton({ className = "" }: ReturnToDashboardButtonProps) {
  return (
    <button
      type="button"
      onClick={() => window.location.assign("/dashboard")}
      className={`btn btn-primary w-full justify-center px-8 py-4 text-base md:w-auto ${className}`.trim()}
    >
      Return to Dashboard
    </button>
  );
}
