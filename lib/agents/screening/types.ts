export type ScreeningPassage = {
  text: string;
  section_key: string;
  reason: string;
  severity: number;
};

export type ScreeningResult = {
  passages: ScreeningPassage[];
  overall_severity: number;
  aiError?: boolean;
  parseError?: boolean;
  summary?: string;
};
