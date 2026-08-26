export const CLASSROOM_WIDTH = 1040;
export const CLASSROOM_HEIGHT = 528;

export type DeskGeometry = {
  id?: string;
  type: "STUDENT" | "TEACHER";
  x: number;
  y: number;
  width: number;
  height: number;
};

const STUDENT_WIDTH = 116;
const STUDENT_HEIGHT = 82;
const DESK_GAP = 16;
const CANVAS_MARGIN = 16;

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

function overlaps(
  a: Pick<DeskGeometry, "x" | "y" | "width" | "height">,
  b: Pick<DeskGeometry, "x" | "y" | "width" | "height">,
  gap = 0
) {
  return !(
    a.x + a.width + gap <= b.x ||
    b.x + b.width + gap <= a.x ||
    a.y + a.height + gap <= b.y ||
    b.y + b.height + gap <= a.y
  );
}

export function findOpenStudentDeskPosition(desks: DeskGeometry[]) {
  for (let y = CANVAS_MARGIN; y <= CLASSROOM_HEIGHT - STUDENT_HEIGHT - CANVAS_MARGIN; y += STUDENT_HEIGHT + DESK_GAP) {
    for (let x = CANVAS_MARGIN; x <= CLASSROOM_WIDTH - STUDENT_WIDTH - CANVAS_MARGIN; x += STUDENT_WIDTH + DESK_GAP) {
      const candidate = { x, y, width: STUDENT_WIDTH, height: STUDENT_HEIGHT };
      if (!desks.some((desk) => overlaps(candidate, desk, DESK_GAP))) return { x, y };
    }
  }

  return { x: CANVAS_MARGIN, y: CANVAS_MARGIN };
}

export function findOverlappingDeskIds(desks: DeskGeometry[]) {
  const ids = new Set<string>();
  for (let index = 0; index < desks.length; index += 1) {
    for (let comparison = index + 1; comparison < desks.length; comparison += 1) {
      const first = desks[index];
      const second = desks[comparison];
      if (first.id && second.id && overlaps(first, second)) {
        ids.add(first.id);
        ids.add(second.id);
      }
    }
  }
  return ids;
}
