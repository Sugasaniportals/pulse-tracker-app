export const colors = {
  bg: "#0E1213",
  card: "#161C1B",
  cardBorder: "#1E2624",
  text: "#EAF5F0",
  textDim: "#9CA8A6",
  textFaint: "#5C6866",
  water: "#7EC8E3",
  med: "#FFB454",
  exercise: "#6FFFB0",
  other: "#C792EA",
  danger: "#FF8A65",
};

export const colorFor = (key) => colors[key] || colors.other;

export const BADGE_THRESHOLDS = [3, 7, 30, 100];
