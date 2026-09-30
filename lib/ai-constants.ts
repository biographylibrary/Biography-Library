export interface AiSuggestion {
  id: string;
  original: string;
  suggestion: string;
  explanation: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface AiPanelState {
  type: 'grammar' | null;
  loading: boolean;
  suggestions: AiSuggestion[];
  error: string | null;
}

export const INITIAL_AI_STATE: AiPanelState = {
  type: null,
  loading: false,
  suggestions: [],
  error: null,
};
