/**
 * Quiz Strategy
 *
 * Generates multiple-choice quiz questions from content.
 * Handles map-reduce for large content with deduplication and curation.
 */

const Strategy = require('./Strategy');
const logger = require('../config/logger');

class QuizStrategy extends Strategy {
  getName() {
    return 'quiz';
  }

  needsDocumentContext() {
    return false;
  }

  buildMapPrompt(content, params, depth) {
    const { count, focusTopic } = params;
    // Generate 1.5x requested questions to allow for deduplication
    const targetCount = depth === 0 ? count : Math.ceil(count * 1.5);

    const topicInstruction = focusTopic
      ? `Focus specifically on: "${focusTopic}". Only create questions related to this topic.`
      : 'Cover the most important concepts from the material.';

    if (depth > 0) {
      // Intermediate extraction - simpler task
      return `Extract key testable facts from this content and generate ${targetCount} multiple-choice questions.

${topicInstruction}

Content:
${content}

Requirements:
- Each question should test understanding of the material
- Include one correct answer and three plausible wrong answers
- Questions should be clear and unambiguous

Respond with ONLY a valid JSON array:
[{"question": "...", "correctAnswer": "...", "wrongAnswers": ["...", "...", "..."]}]

Generate ${targetCount} questions:`;
    }

    // Depth 0 - final output quality
    return `You are a quiz creator that makes effective multiple-choice questions for learning.

Based on the following study material, create exactly ${targetCount} multiple-choice quiz questions.
${topicInstruction}

Guidelines:
- Each question should test understanding of the material
- Questions should be clear and unambiguous
- The correct answer should be based on the provided content
- Wrong answers (distractors) should be plausible but clearly incorrect
- Vary the difficulty from easy to challenging

Study Material:
${content}

Respond with ONLY a valid JSON array in this exact format, no other text:
[{"question": "What is...?", "correctAnswer": "The correct answer", "wrongAnswers": ["Wrong answer 1", "Wrong answer 2", "Wrong answer 3"]}]

Generate exactly ${targetCount} questions:`;
  }

  buildReducePrompt(partialResults, params, depth) {
    const { count, focusTopic } = params;
    const allQuestions = partialResults.flat();

    const topicInstruction = focusTopic
      ? `All questions should relate to: "${focusTopic}".`
      : '';

    return `You are curating quiz questions for quality and variety.

From these ${allQuestions.length} candidate questions, select the best ${count} questions.

${topicInstruction}

Selection criteria:
- Remove duplicate or very similar questions
- Ensure topic variety
- Prefer clearer, more educational questions
- Ensure answers are accurate

Candidate questions:
${JSON.stringify(allQuestions, null, 2)}

Respond with ONLY a valid JSON array of exactly ${count} questions:
[{"question": "...", "correctAnswer": "...", "wrongAnswers": ["...", "...", "..."]}]

Select the best ${count} questions:`;
  }

  parseResponse(responseText, depth) {
    const jsonStr = this.stripMarkdownCodeBlocks(responseText);

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      logger.error('QuizStrategy: Failed to parse JSON response', { error: e.message });
      throw new Error('Failed to parse quiz response. Please try again.');
    }

    if (!Array.isArray(parsed)) {
      logger.error('QuizStrategy: Response is not an array', { parsed });
      throw new Error('Invalid quiz response format. Please try again.');
    }

    // Validate each question
    const questions = [];
    for (let i = 0; i < parsed.length; i++) {
      const q = parsed[i];
      if (
        !q ||
        typeof q.question !== 'string' ||
        typeof q.correctAnswer !== 'string' ||
        !Array.isArray(q.wrongAnswers) ||
        q.wrongAnswers.length < 3
      ) {
        logger.warn(`QuizStrategy: Invalid question at index ${i}`, { q });
        continue;
      }

      questions.push({
        question: q.question.trim(),
        correctAnswer: q.correctAnswer.trim(),
        wrongAnswers: q.wrongAnswers.slice(0, 3).map((a) => a.trim()),
      });
    }

    return questions;
  }

  combineResults(results, params) {
    // Flatten all questions and deduplicate by question text
    const allQuestions = results.flat();
    return this.deduplicateBy(allQuestions, (q) => q.question);
  }

  validateResult(result, params) {
    const { count } = params;

    if (!Array.isArray(result) || result.length === 0) {
      throw new Error('No valid quiz questions were generated.');
    }

    // Take requested count, or all if we have fewer
    const finalQuestions = result.slice(0, count);

    logger.info(`QuizStrategy: Validated ${finalQuestions.length}/${count} questions`);
    return finalQuestions;
  }
}

module.exports = QuizStrategy;
