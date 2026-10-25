/** The illustration categories, in the order the gallery shows them, with their labels. */
export const illustrationCategoryNames = [
  "empty",
  "errors",
  "security",
  "account",
  "data",
  "onboarding",
  "activity",
  "devops",
  "commerce",
  "communication",
  "collaboration",
  "celebration",
  "features",
] as const;

export type IllustrationCategory = (typeof illustrationCategoryNames)[number];

/** A human label for each category. */
export const illustrationCategoryLabels: Record<IllustrationCategory, string> = {
  empty: "Empty states",
  errors: "Errors and limits",
  security: "Security",
  account: "Account",
  data: "Data & reports",
  onboarding: "Onboarding",
  activity: "Activity",
  devops: "Infrastructure & operations",
  commerce: "Commerce",
  communication: "Communication",
  collaboration: "Collaboration",
  celebration: "Success & celebration",
  features: "Features & settings",
};

/** What a set file exports: illustrations (inner SVG for a 160×120 viewBox) by category. */
export type IllustrationSet = Partial<Record<IllustrationCategory, Record<string, string>>>;
