/** The icon categories, in the order the gallery shows them, with their labels. */
export const iconCategoryNames = [
  "navigation",
  "actions",
  "status",
  "security",
  "people",
  "data",
  "charts",
  "development",
  "infrastructure",
  "hardware",
  "layout",
  "editor",
  "design",
  "shapes",
  "devices",
  "places",
  "finance",
  "transport",
  "health",
  "science",
  "education",
  "food",
  "sports",
  "nature",
  "weather",
] as const;

export type IconCategory = (typeof iconCategoryNames)[number];

/** A human label for each category. */
export const iconCategoryLabels: Record<IconCategory, string> = {
  navigation: "Navigation",
  actions: "Actions",
  status: "Status & time",
  security: "Security",
  people: "People & messages",
  data: "Files & data",
  charts: "Charts & analytics",
  development: "Development",
  infrastructure: "Infrastructure",
  hardware: "Hardware",
  layout: "Layout & text",
  editor: "Text editing",
  design: "Design tools",
  shapes: "Shapes & math",
  devices: "Devices & media",
  places: "Commerce & places",
  finance: "Finance",
  transport: "Transport",
  health: "Health",
  science: "Science",
  education: "Education",
  food: "Food & drink",
  sports: "Sports & leisure",
  nature: "Nature",
  weather: "Weather & appearance",
};

/** What a set file exports: icons by category. Each name must be unique across the whole set. */
export type IconSet = Partial<Record<IconCategory, Record<string, string>>>;
