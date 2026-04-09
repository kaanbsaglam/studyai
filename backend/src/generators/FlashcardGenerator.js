/**
 * Flashcard Generator
 *
 * Generates flashcards (front/back pairs) from content.
 * Handles map-reduce for large content with deduplication.
 */

const Generator = require('./Generator');
const logger = require('../config/logger');
const { loadPrompt } = require('../prompts/loader');

class FlashcardGenerator extends Generator {
  getName() {
    return 'flashcard';
  }

  needsDocumentContext() {
    return false;
  }

  getSummarizationFocus() {
    return 'Focus on key concepts, definitions, terms, and their explanations. Preserve vocabulary, formulas, and factual information that can be turned into question-answer pairs.';
  }

  buildMapPrompt(content, params, depth) {
    const { count, focusTopic } = params;
    const targetCount = depth === 0 ? count : Math.ceil(count * 1.5);

    const topicInstruction = focusTopic
      ? `Focus specifically on: "${focusTopic}". Only create flashcards related to this topic.`
      : 'Cover the most important concepts from the material.';

    return loadPrompt('flashcard/map', {
      isIntermediate: depth > 0,
      count: targetCount,
      topicInstruction,
      content,
    });
  }

  buildReducePrompt(partialResults, params, depth) {
    const { count, focusTopic } = params;
    const allCards = partialResults.flat();

    if (allCards.length === 0) {
      return null;
    }

    const targetCount = Math.min(count, allCards.length);

    return loadPrompt('flashcard/reduce', {
      totalCount: allCards.length,
      targetCount,
      topicInstruction: focusTopic ? `All cards should relate to: "${focusTopic}".` : '',
      candidates: JSON.stringify(allCards, null, 2),
    });
  }

  parseResponse(responseText, depth) {
    const jsonStr = this.stripMarkdownCodeBlocks(responseText);

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      logger.error('FlashcardGenerator: Failed to parse JSON response', { error: e.message });
      throw new Error('Failed to parse flashcard response. Please try again.');
    }

    if (!Array.isArray(parsed)) {
      logger.error('FlashcardGenerator: Response is not an array', { parsed });
      throw new Error('Invalid flashcard response format. Please try again.');
    }

    // Validate each card
    const cards = [];
    for (let i = 0; i < parsed.length; i++) {
      const card = parsed[i];
      if (!card || typeof card.front !== 'string' || typeof card.back !== 'string') {
        logger.warn(`FlashcardGenerator: Invalid card at index ${i}`, { card });
        continue;
      }
      cards.push({
        front: card.front.trim(),
        back: card.back.trim(),
      });
    }

    return cards;
  }

  combineResults(results, params) {
    // Flatten all cards and deduplicate by front text
    const allCards = results.flat();
    return this.deduplicateBy(allCards, (c) => c.front);
  }

  validateResult(result, params) {
    const { count } = params;

    if (!Array.isArray(result)) {
      throw new Error('Invalid flashcard result format.');
    }

    // Empty array is valid - content may not have suitable concepts
    if (result.length === 0) {
      logger.info('FlashcardGenerator: No flashcards generated (content may not have suitable concepts)');
      return [];
    }

    // Take requested count, or all if we have fewer
    const finalCards = result.slice(0, count);

    logger.info(`FlashcardGenerator: Validated ${finalCards.length}/${count} cards`);
    return finalCards;
  }
}

module.exports = FlashcardGenerator;
