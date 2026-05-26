import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';

/**
 * Generate reflection questions for a journal entry via the Supabase edge
 * function. Returns up to 10 questions.
 *
 * `demo` switches to the demo-mode edge function which doesn't require a
 * signed-in user — used by the landing-page sample entries.
 */
export const generateReflectionQuestions = async (
  content: string,
  mood: string,
  track?: { name: string; artist: string },
  demo?: boolean,
): Promise<string[]> => {
  const functionName = demo ? 'generate-reflection-demo' : 'generate-reflection';

  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: { content, mood, track },
    });

    if (error) {
      logger.error('api', `${functionName} returned error:`, error);
      throw new Error(getErrorMessage(error, 'Error generating reflection questions'));
    }

    return data.reflectionQuestions || [data.reflectionQuestion];
  } catch (error) {
    logger.error('api', `${functionName} call failed:`, error);
    throw new Error('Failed to generate reflection questions. Please try again later.');
  }
};
