export const CLASSROOM_WIDTH = 1040;
export const CLASSROOM_HEIGHT = 528;

type DeskGeometry = {
  type: "STUDENT" | "TEACHER";
  x: number;
  y: number;
  width: number;
  height: number;
};

export function normalizeDeskGeometry<T extends DeskGeometry>(desk: T): T {
  const maxWidth = desk.type === "TEACHER" ? 156 : 116;
  const maxHeight = desk.type === "TEACHER" ? 92 : 82;
  const width = Math.min(maxWidth, Math.max(1, desk.width));
  const height = Math.min(maxHeight, Math.max(1, desk.height));

  return {
    ...desk,
    width,
    height,
    x: Math.min(Math.max(0, desk.x), CLASSROOM_WIDTH - width),
    y: Math.min(Math.max(0, desk.y), CLASSROOM_HEIGHT - height)
  };
}
