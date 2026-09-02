import { invokeFunctionWithTimeout } from '@/lib/invokeFunction';
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
    const { data, error } = await invokeFunctionWithTimeout<{
      reflectionQuestions?: string[];
      reflectionQuestion?: string;
    }>(functionName, { body: { content, mood, track } });

    if (error) throw error;
    if (!data) throw new Error('No reflection questions returned');

    return data.reflectionQuestions || (data.reflectionQuestion ? [data.reflectionQuestion] : []);
  } catch (error) {
    logger.error('api', `${functionName} call failed:`, error);
    // Preserves a FunctionTimeoutError's specific message when that's what
    // happened, instead of masking every failure behind one generic string.
    throw new Error(getErrorMessage(error, 'Failed to generate reflection questions. Please try again later.'));
  }
};
