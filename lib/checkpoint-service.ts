import { supabase } from './supabase';

export interface ConversationMessage {
  id: string;
  type: 'ai' | 'user';
  content: string;
  timestamp: Date;
}

export interface ConversationCheckpoint {
  id: string;
  user_id: string;
  biography_id: string;
  section: string;
  conversation_log: ConversationMessage[];
  questions_completed: number;
  last_question: string | null;
  answers: { question: string; answer: string }[];
  is_follow_up: boolean;
  has_had_follow_up: boolean;
  created_at: string;
  updated_at: string;
}

export async function saveCheckpoint(
  userId: string,
  biographyId: string,
  section: string,
  conversationLog: ConversationMessage[],
  questionsCompleted: number,
  lastQuestion: string | null,
  answers: { question: string; answer: string }[],
  isFollowUp: boolean = false,
  hasHadFollowUp: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await supabase
      .from('conversation_checkpoints')
      .select('id')
      .eq('user_id', userId)
      .eq('biography_id', biographyId)
      .eq('section', section)
      .maybeSingle();

    if (existing.error && existing.error.code !== 'PGRST116') {
      console.error('Error checking for existing checkpoint:', existing.error);
      return { success: false, error: existing.error.message };
    }

    const checkpointData = {
      user_id: userId,
      biography_id: biographyId,
      section,
      conversation_log: conversationLog,
      questions_completed: questionsCompleted,
      last_question: lastQuestion,
      answers,
      is_follow_up: isFollowUp,
      has_had_follow_up: hasHadFollowUp,
      updated_at: new Date().toISOString(),
    };

    if (existing.data) {
      const { error } = await supabase
        .from('conversation_checkpoints')
        .update(checkpointData)
        .eq('id', existing.data.id);

      if (error) {
        console.error('Error updating checkpoint:', error);
        return { success: false, error: error.message };
      }
    } else {
      const { error } = await supabase
        .from('conversation_checkpoints')
        .insert([checkpointData]);

      if (error) {
        console.error('Error creating checkpoint:', error);
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error saving checkpoint:', error);
    return { success: false, error: 'Failed to save checkpoint' };
  }
}

export async function loadCheckpoint(
  userId: string,
  biographyId: string,
  section: string
): Promise<ConversationCheckpoint | null> {
  try {
    const { data, error } = await supabase
      .from('conversation_checkpoints')
      .select('*')
      .eq('user_id', userId)
      .eq('biography_id', biographyId)
      .eq('section', section)
      .maybeSingle();

    if (error) {
      console.error('Error loading checkpoint:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      ...data,
      conversation_log: data.conversation_log || [],
      answers: data.answers || [],
    } as ConversationCheckpoint;
  } catch (error) {
    console.error('Unexpected error loading checkpoint:', error);
    return null;
  }
}

export async function deleteCheckpoint(
  checkpointId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('conversation_checkpoints')
      .delete()
      .eq('id', checkpointId);

    if (error) {
      console.error('Error deleting checkpoint:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error deleting checkpoint:', error);
    return { success: false, error: 'Failed to delete checkpoint' };
  }
}

export async function deleteCheckpointByBioSection(
  userId: string,
  biographyId: string,
  section: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('conversation_checkpoints')
      .delete()
      .eq('user_id', userId)
      .eq('biography_id', biographyId)
      .eq('section', section);

    if (error) {
      console.error('Error deleting checkpoint:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error deleting checkpoint:', error);
    return { success: false, error: 'Failed to delete checkpoint' };
  }
}

export async function hasActiveCheckpoint(
  userId: string,
  biographyId: string,
  section: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('conversation_checkpoints')
      .select('id')
      .eq('user_id', userId)
      .eq('biography_id', biographyId)
      .eq('section', section)
      .maybeSingle();

    if (error) {
      console.error('Error checking for checkpoint:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Unexpected error checking for checkpoint:', error);
    return false;
  }
}
