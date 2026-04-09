/**
 * Quiz Generator
 *
 * Generates multiple-choice quiz questions from content.
 * Handles map-reduce for large content with deduplication and curation.
 */

const Generator = require('./Generator');
const logger = require('../config/logger');
const { loadPrompt } = require('../prompts/loader');

class QuizGenerator extends Generator {
  getName() {
    return 'quiz';
  }

  needsDocumentContext() {
    return false;
  }

  getSummarizationFocus() {
    return 'Focus on facts, definitions, concepts, and any information that could be tested in a quiz. Preserve specific details, names, dates, and relationships between concepts.';
  }

  buildMapPrompt(content, params, depth) {
    const { count, focusTopic } = params;
    const targetCount = depth === 0 ? count : Math.ceil(count * 1.5);

    const topicInstruction = focusTopic
      ? `Focus specifically on: "${focusTopic}". Only create questions related to this topic.`
      : 'Cover the most important concepts from the material.';

    return loadPrompt('quiz/map', {
      isIntermediate: depth > 0,
      count: targetCount,
      topicInstruction,
      content,
    });
  }

  buildReducePrompt(partialResults, params, depth) {
    const { count, focusTopic } = params;
    const allQuestions = partialResults.flat();

    if (allQuestions.length === 0) {
      return null;
    }

    const targetCount = Math.min(count, allQuestions.length);

    return loadPrompt('quiz/reduce', {
      totalCount: allQuestions.length,
      targetCount,
      topicInstruction: focusTopic ? `All questions should relate to: "${focusTopic}".` : '',
      candidates: JSON.stringify(allQuestions, null, 2),
    });
  }

  parseResponse(responseText, depth) {
    const jsonStr = this.stripMarkdownCodeBlocks(responseText);

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      logger.error('QuizGenerator: Failed to parse JSON response', { error: e.message });
      throw new Error('Failed to parse quiz response. Please try again.');
    }

    if (!Array.isArray(parsed)) {
      logger.error('QuizGenerator: Response is not an array', { parsed });
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
        logger.warn(`QuizGenerator: Invalid question at index ${i}`, { q });
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

    if (!Array.isArray(result)) {
      throw new Error('Invalid quiz result format.');
    }

    // Empty array is valid - content may not have testable information
    if (result.length === 0) {
      logger.info('QuizGenerator: No questions generated (content may not have testable information)');
      return [];
    }

    // Take requested count, or all if we have fewer
    const finalQuestions = result.slice(0, count);

    logger.info(`QuizGenerator: Validated ${finalQuestions.length}/${count} questions`);
    return finalQuestions;
  }
}

module.exports = QuizGenerator;
