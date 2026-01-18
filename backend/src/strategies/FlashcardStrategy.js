/**
 * Flashcard Strategy
 *
 * Generates flashcards (front/back pairs) from content.
 * Handles map-reduce for large content with deduplication.
 */

const Strategy = require('./Strategy');
const logger = require('../config/logger');

class FlashcardStrategy extends Strategy {
  getName() {
    return 'flashcard';
  }

  needsDocumentContext() {
    return false;
  }

  buildMapPrompt(content, params, depth) {
    const { count, focusTopic } = params;
    // Generate 1.5x requested cards to allow for deduplication
    const targetCount = depth === 0 ? count : Math.ceil(count * 1.5);

    const topicInstruction = focusTopic
      ? `Focus specifically on: "${focusTopic}". Only create flashcards related to this topic.`
      : 'Cover the most important concepts from the material.';

    if (depth > 0) {
      // Intermediate extraction - simpler task
      return `Extract key concept pairs from this content and generate ${targetCount} flashcards.

${topicInstruction}

Content:
${content}

Requirements:
- Each card should test ONE concept
- Front should be a clear question or prompt
- Back should be a concise but complete answer

Respond with ONLY a valid JSON array:
[{"front": "Question?", "back": "Answer"}]

Generate ${targetCount} flashcards:`;
    }

    // Depth 0 - final output quality
    return `You are a study assistant that creates effective flashcards for learning.

Based on the following study material, create exactly ${targetCount} flashcards.
${topicInstruction}

Guidelines for good flashcards:
- Each card should test ONE concept
- Questions should be clear and specific
- Answers should be concise but complete
- Avoid yes/no questions
- Include a mix of definitions, concepts, and applications

Study Material:
${content}

Respond with ONLY a valid JSON array of flashcards in this exact format, no other text:
[{"front": "Question 1?", "back": "Answer 1"}, {"front": "Question 2?", "back": "Answer 2"}]

Generate exactly ${targetCount} flashcards:`;
  }

  buildReducePrompt(partialResults, params, depth) {
    const { count, focusTopic } = params;
    const allCards = partialResults.flat();

    const topicInstruction = focusTopic
      ? `All cards should relate to: "${focusTopic}".`
      : '';

    return `You are curating flashcards for quality and variety.

From these ${allCards.length} candidate flashcards, select the best ${count} cards.

${topicInstruction}

Selection criteria:
- Remove duplicate or very similar cards
- Ensure topic variety
- Prefer clearer, more educational cards
- Each card should test a distinct concept

Candidate flashcards:
${JSON.stringify(allCards, null, 2)}

Respond with ONLY a valid JSON array of exactly ${count} flashcards:
[{"front": "...", "back": "..."}]

Select the best ${count} flashcards:`;
  }

  parseResponse(responseText, depth) {
    const jsonStr = this.stripMarkdownCodeBlocks(responseText);

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      logger.error('FlashcardStrategy: Failed to parse JSON response', { error: e.message });
      throw new Error('Failed to parse flashcard response. Please try again.');
    }

    if (!Array.isArray(parsed)) {
      logger.error('FlashcardStrategy: Response is not an array', { parsed });
      throw new Error('Invalid flashcard response format. Please try again.');
    }

    // Validate each card
    const cards = [];
    for (let i = 0; i < parsed.length; i++) {
      const card = parsed[i];
      if (!card || typeof card.front !== 'string' || typeof card.back !== 'string') {
        logger.warn(`FlashcardStrategy: Invalid card at index ${i}`, { card });
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

    if (!Array.isArray(result) || result.length === 0) {
      throw new Error('No valid flashcards were generated.');
    }

    // Take requested count, or all if we have fewer
    const finalCards = result.slice(0, count);

    logger.info(`FlashcardStrategy: Validated ${finalCards.length}/${count} cards`);
    return finalCards;
  }
}

module.exports = FlashcardStrategy;
