"use client";

type ReturnToDashboardButtonProps = {
  className?: string;
  disabled?: boolean;
  onClick?: () => void | Promise<void>;
};

export default function ReturnToDashboardButton({
  className = "",
  disabled = false,
  onClick
}: ReturnToDashboardButtonProps) {
  return (
    <button
      type="button"
      onClick={() => {
        if (onClick) {
          void onClick();
          return;
        }
        window.location.assign("/dashboard");
      }}
      disabled={disabled}
      className={`btn btn-primary w-full justify-center px-8 py-4 text-base md:w-auto ${className}`.trim()}
    >
      Command Center
    </button>
  );
}
