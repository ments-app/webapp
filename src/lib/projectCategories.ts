export const PROJECT_CATEGORIES = [
  // Tech
  'Web App',
  'Mobile App',
  'AI / ML',
  'Open Source Tool',
  'Game',
  'Data / Analytics',
  'API / Dev Tool',
  'Browser Extension',
  'Hardware',
  'Cybersecurity',
  'Blockchain / Web3',
  'DevOps / Infrastructure',
  // Design & Creative
  'Design',
  'UI / UX',
  'Motion & Animation',
  'Photography',
  'Video & Film',
  'Music & Audio',
  'Writing & Publishing',
  'Illustration & Art',
  // Business & Social Impact
  'Startup / Business',
  'Social Impact / NGO',
  'Education',
  'Healthcare',
  'Sustainability / Climate',
  'Finance / Fintech',
  // Research & Academic
  'Research Paper',
  'Science Experiment',
  'Engineering Project',
  // Other
  'Event / Community',
  'Other',
] as const;

export type ProjectCategory = typeof PROJECT_CATEGORIES[number];
