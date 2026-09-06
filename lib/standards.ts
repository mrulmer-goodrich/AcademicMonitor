export const supportedGradeLevels = [6, 7, 8] as const;

export type GradeLevel = (typeof supportedGradeLevels)[number];

export type MathStandard = {
  code: string;
  description: string;
};

export function isGradeLevel(value: unknown): value is GradeLevel {
  return supportedGradeLevels.includes(Number(value) as GradeLevel);
}

export function normalizeGradeLevels(value: unknown): GradeLevel[] {
  const values = Array.isArray(value) ? value : [value];
  return Array.from(new Set(values.map(Number).filter(isGradeLevel))).sort((left, right) => left - right);
}

export function qualifyStandardCode(code: string | null | undefined, gradeLevel: GradeLevel) {
  if (!code) return null;
  const withoutNc = code.trim().toUpperCase().replace(/^NC\./, "");
  if (!withoutNc) return null;
  if (/^[678]\.[A-Z]+\.\d+[A-Z]?$/.test(withoutNc)) return withoutNc;

  const legacy = withoutNc.match(/^([A-Z]+)\.?([0-9]+[A-Z]?)$/);
  return legacy ? `${gradeLevel}.${legacy[1]}.${legacy[2]}` : withoutNc;
}

const grade6Standards: MathStandard[] = [
  { code: "6.RP.1", description: "Describe and model ratios as multiplicative relationships." },
  { code: "6.RP.2", description: "Find and interpret equivalent unit ratios in context." },
  { code: "6.RP.3", description: "Use equivalent whole-number ratios to solve problems." },
  { code: "6.RP.4", description: "Use ratio reasoning to solve percent problems." },
  { code: "6.NS.1", description: "Interpret and compute fraction quotients using visual models and common denominators." },
  { code: "6.NS.2", description: "Fluently divide multi-digit numbers and interpret quotients and remainders." },
  { code: "6.NS.3", description: "Fluently add, subtract, multiply, and divide decimals." },
  { code: "6.NS.4", description: "Use prime factorization, factors, multiples, and the distributive property." },
  { code: "6.NS.5", description: "Interpret rational numbers, opposites, zero, and absolute value in context." },
  { code: "6.NS.6", description: "Represent rational numbers on number lines and coordinate planes." },
  { code: "6.NS.7", description: "Order rational numbers and interpret inequalities in context." },
  { code: "6.NS.8", description: "Graph points in four quadrants and find coordinate distances." },
  { code: "6.NS.9", description: "Model and solve integer addition and subtraction from -20 to 20." },
  { code: "6.EE.1", description: "Write and evaluate numerical expressions with whole-number exponents." },
  { code: "6.EE.2", description: "Write, read, and evaluate algebraic expressions." },
  { code: "6.EE.3", description: "Apply operation properties to generate equivalent expressions." },
  { code: "6.EE.4", description: "Identify and justify equivalent expressions." },
  { code: "6.EE.5", description: "Use substitution to test whether a value makes an equation true." },
  { code: "6.EE.6", description: "Use variables and expressions to represent problem situations." },
  { code: "6.EE.7", description: "Write and solve one-step addition and multiplication equations." },
  { code: "6.EE.8", description: "Write, test, and graph one-variable inequalities." },
  { code: "6.EE.9", description: "Represent relationships between dependent and independent variables." },
  { code: "6.G.1", description: "Find areas of triangles, quadrilaterals, and polygons by composing and decomposing." },
  { code: "6.G.2", description: "Find volumes of rectangular prisms with fractional edge lengths." },
  { code: "6.G.3", description: "Draw coordinate-plane polygons and find horizontal or vertical side lengths." },
  { code: "6.G.4", description: "Use nets to represent prisms and pyramids and find surface area." },
  { code: "6.SP.1", description: "Recognize statistical questions that anticipate variability." },
  { code: "6.SP.2", description: "Describe data distributions by center, spread, and shape." },
  { code: "6.SP.3", description: "Use measures of center and variability to describe data." },
  { code: "6.SP.4", description: "Display numerical data with dot plots, histograms, and box plots." },
  { code: "6.SP.5", description: "Summarize numerical data in context using center, variability, and distribution shape." }
];

const grade7Standards: MathStandard[] = [
  { code: "7.RP.1", description: "Compute unit rates involving ratios of fractions." },
  { code: "7.RP.2", description: "Recognize and represent proportional relationships." },
  { code: "7.RP.3", description: "Use scale factors and unit rates to solve ratio and percent problems." },
  { code: "7.NS.1", description: "Add and subtract rational numbers and describe sums and differences in context." },
  { code: "7.NS.2", description: "Multiply and divide rational numbers using operation properties and algorithms." },
  { code: "7.NS.3", description: "Solve problems with rational-number expressions and all four operations." },
  { code: "7.EE.1", description: "Add, subtract, expand, and factor linear expressions." },
  { code: "7.EE.2", description: "Interpret equivalent expressions in real-world and mathematical contexts." },
  { code: "7.EE.3", description: "Solve multi-step problems using rational-number algebraic expressions." },
  { code: "7.EE.4", description: "Write and solve multi-step equations and inequalities." },
  { code: "7.G.1", description: "Solve scale-drawing problems and create scale drawings." },
  { code: "7.G.2", description: "Build triangles and determine when given measures create unique, multiple, or no triangles." },
  { code: "7.G.4", description: "Use relationships and formulas for circle area and circumference." },
  { code: "7.G.5", description: "Use angle relationships to write and solve equations." },
  { code: "7.G.6", description: "Solve area, perimeter, volume, and surface-area problems." },
  { code: "7.SP.1", description: "Use representative random samples to make valid population inferences." },
  { code: "7.SP.2", description: "Compare repeated random samples to estimate population characteristics." },
  { code: "7.SP.3", description: "Use variability and graphical overlap to compare two populations." },
  { code: "7.SP.4", description: "Use measures of center and variability to compare populations." },
  { code: "7.SP.5", description: "Interpret probability as a number from 0 to 1." },
  { code: "7.SP.6", description: "Use experimental probability to predict long-run frequency." },
  { code: "7.SP.7", description: "Develop probability models and compare theoretical and experimental results." },
  { code: "7.SP.8", description: "Find compound-event probabilities using organized representations and simulations." }
];

const grade8Standards: MathStandard[] = [
  { code: "8.NS.1", description: "Distinguish rational and irrational numbers by their decimal expansions." },
  { code: "8.NS.2", description: "Approximate irrational numbers and expressions with roots and pi." },
  { code: "8.EE.1", description: "Apply integer-exponent properties to generate equivalent expressions." },
  { code: "8.EE.2", description: "Represent and evaluate square roots and cube roots." },
  { code: "8.EE.3", description: "Use scientific notation to estimate and compare quantities." },
  { code: "8.EE.4", description: "Multiply and divide with scientific notation in real-world problems." },
  { code: "8.EE.7", description: "Write and solve one-variable linear equations and inequalities." },
  { code: "8.EE.8", description: "Analyze and solve systems of two linear equations by graphing." },
  { code: "8.F.1", description: "Recognize functions as relationships with one output for each input." },
  { code: "8.F.2", description: "Compare linear functions represented in different ways." },
  { code: "8.F.3", description: "Identify linear functions from tables, equations, and graphs." },
  { code: "8.F.4", description: "Model linear relationships using slope-intercept form." },
  { code: "8.F.5", description: "Analyze and sketch qualitative features of functional relationships." },
  { code: "8.G.2", description: "Use transformations to define and describe congruence." },
  { code: "8.G.3", description: "Describe coordinate effects of dilations, translations, rotations, and reflections." },
  { code: "8.G.4", description: "Use transformations to define and describe similarity." },
  { code: "8.G.5", description: "Analyze triangle and parallel-line angle relationships." },
  { code: "8.G.6", description: "Explain the Pythagorean Theorem and its converse." },
  { code: "8.G.7", description: "Apply the Pythagorean Theorem and its converse to solve problems." },
  { code: "8.G.8", description: "Use the Pythagorean Theorem to find coordinate-plane distances." },
  { code: "8.G.9", description: "Relate and use volume formulas for cones, cylinders, and spheres." },
  { code: "8.SP.1", description: "Construct and interpret scatter plots for bivariate data." },
  { code: "8.SP.2", description: "Fit and assess a linear model for a scatter plot." },
  { code: "8.SP.3", description: "Interpret and use slope and intercept in bivariate-data models." },
  { code: "8.SP.4", description: "Use two-way tables and relative frequencies to investigate association." }
];

export const ncMathStandardsByGrade: Record<GradeLevel, MathStandard[]> = {
  6: grade6Standards,
  7: grade7Standards,
  8: grade8Standards
};

export function standardsForGrade(gradeLevel: GradeLevel) {
  return ncMathStandardsByGrade[gradeLevel];
}
