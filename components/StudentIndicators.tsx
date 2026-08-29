type IndicatorStudent = {
  ml?: boolean;
  mlNew?: boolean;
  iep504?: boolean;
  ec?: boolean;
  ca?: boolean;
  hiit?: boolean;
  eog?: "FIVE" | "FOUR" | "THREE" | "NP" | null;
};

type StudentIndicatorsProps = {
  student: IndicatorStudent;
  size?: "seating" | "monitoring";
};

function eogColor(eog: NonNullable<IndicatorStudent["eog"]>) {
  return eog === "FIVE"
    ? "#3f6db5"
    : eog === "FOUR"
    ? "#4caf50"
    : eog === "THREE"
    ? "#f2994a"
    : "#e74c3c";
}

export default function StudentIndicators({ student, size = "monitoring" }: StudentIndicatorsProps) {
  const bottomCount =
    Number(Boolean(student.ml)) +
    Number(Boolean(student.mlNew)) +
    Number(Boolean(student.iep504)) +
    Number(Boolean(student.ec)) +
    Number(Boolean(student.ca));
  const bottomSize =
    size === "monitoring"
      ? "h-5 w-5"
      : bottomCount >= 5
      ? "h-4 w-4"
      : bottomCount >= 4
      ? "h-5 w-5"
      : "h-6 w-6";
  const topSize = size === "monitoring" ? "h-5 w-5" : "h-6 w-6";
  const topRight = size === "monitoring" ? "right-1 top-1" : "right-0.5 top-0.5";
  const bottomLeft = size === "monitoring" ? "bottom-1 left-1" : "bottom-0.5 left-0.5";
  const bottomRight = size === "monitoring" ? "bottom-1 right-1" : "bottom-0.5 right-0.5";

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10"
      data-student-indicators={size}
    >
      <div className={`absolute ${topRight} flex items-center gap-0.5`} data-indicator-zone="top-right">
        {student.hiit && (
          <span className={`${topSize} rounded-full border border-black/70`} style={{ background: "#b18ad8" }} />
        )}
        {student.eog && (
          <span
            className={`${topSize} rounded-full border border-black/70`}
            style={{ background: eogColor(student.eog) }}
          />
        )}
      </div>

      <div className={`absolute ${bottomLeft} flex items-center gap-0.5`} data-indicator-zone="bottom-left">
        {student.ml && (
          <span className={`${bottomSize} rounded-full border border-black/70`} style={{ background: "#9ecae1" }} />
        )}
        {student.mlNew && (
          <span
            className={`${bottomSize} rounded-full border border-black/70`}
            style={{
              background: "repeating-linear-gradient(45deg,#9ecae1,#9ecae1 3px,#ffffff 3px,#ffffff 6px)"
            }}
          />
        )}
      </div>

      <div className={`absolute ${bottomRight} flex items-center gap-0.5`} data-indicator-zone="bottom-right">
        {student.iep504 && (
          <span className={`${bottomSize} rounded-full border border-black/70`} style={{ background: "#f5a9b8" }} />
        )}
        {student.ec && (
          <span className={`${bottomSize} rounded-full border border-black/70`} style={{ background: "#ffd633" }} />
        )}
        {student.ca && <span className={`${bottomSize} rounded-full border border-black/70 bg-white`} />}
      </div>
    </div>
  );
}
