"use client";

type UnsavedChangesDialogProps = {
  open: boolean;
  description: string;
  onStay: () => void;
  onLeave: () => void;
};

export default function UnsavedChangesDialog({
  open,
  description,
  onStay,
  onLeave
}: UnsavedChangesDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-6">
      <div className="hero-card w-full max-w-2xl p-8 text-center">
        <div className="small-header text-red-700">Warning</div>
        <h2 className="mt-3 text-3xl font-semibold">Unsaved Changes</h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-black/70">{description}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button className="btn btn-primary min-w-[220px] justify-center py-4 text-base" type="button" onClick={onStay}>
            Stay on This Page
          </button>
          <button className="btn btn-ghost min-w-[220px] justify-center py-4 text-base" type="button" onClick={onLeave}>
            Leave Without Saving
          </button>
        </div>
      </div>
    </div>
  );
}
