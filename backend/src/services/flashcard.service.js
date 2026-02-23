/**
 * Flashcard Service
 *
 * Generates flashcards from documents or general knowledge using LLM.
 */

const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const { gatherDocumentsContentStructured } = require('./documentContent.service');
const { generateText } = require('./llm.service');
const { generateWithGenerator } = require('./pipeline.service');

/**
 * Generate flashcards using LLM
 * @param {object} params
 * @param {string} [params.content] - Document content to generate from (legacy, use documents instead)
 * @param {Array<{id: string, name: string, content: string}>} [params.documents] - Structured documents
 * @param {string} [params.focusTopic] - Topic to focus on (required if no content)
 * @param {number} params.count - Number of flashcards to generate
 * @param {boolean} params.isGeneralKnowledge - Whether this is a general knowledge request
 * @param {string} [params.tier='FREE'] - User tier for model selection
 * @returns {Promise<{cards: Array<{front: string, back: string}>, tokensUsed: number, warnings?: string[]}>}
 */
async function generateFlashcards({ content, documents, focusTopic, count, isGeneralKnowledge, tier = 'FREE' }) {
  logger.info(`Generating ${count} flashcards`, {
    focusTopic: focusTopic || 'none',
    isGeneralKnowledge,
    hasContent: !!content,
    hasDocuments: !!documents,
  });

  // General knowledge mode - use direct LLM call (no content to chunk)
  if (isGeneralKnowledge) {
    const prompt = buildFlashcardPrompt({ content: null, focusTopic, count, isGeneralKnowledge: true });
    const { text: responseText, tokensUsed } = await generateText(prompt, { tier });
    const cards = parseFlashcardResponse(responseText);
    logger.info(`Generated ${cards.length} flashcards, ${tokensUsed} tokens used`);
    return { cards, tokensUsed };
  }

  // Document-based mode - use pipeline for adaptive processing
  const contentInput = documents || content;
  const { result: cards, tokensUsed, warnings } = await generateWithGenerator(
    'flashcard',
    contentInput,
    { count, focusTopic },
    { tier }
  );

  logger.info(`Generated ${cards.length} flashcards, ${tokensUsed} tokens used`);
  return { cards, tokensUsed, warnings };
}

/**
 * Build the prompt for flashcard generation
 */
function buildFlashcardPrompt({ content, focusTopic, count, isGeneralKnowledge }) {
  // General knowledge mode (no documents)
  if (isGeneralKnowledge) {
    const topic = focusTopic || 'general study topics';
    return `You are a study assistant that creates effective flashcards for learning.

Create exactly ${count} flashcards about: "${topic}"

Guidelines for good flashcards:
- Each card should test ONE concept
- Questions should be clear and specific
- Answers should be concise but complete
- Avoid yes/no questions
- Include a mix of definitions, concepts, and applications
- Cover fundamental to intermediate level knowledge

Respond with ONLY a valid JSON array of flashcards in this exact format, no other text:
[
  {"front": "Question 1?", "back": "Answer 1"},
  {"front": "Question 2?", "back": "Answer 2"}
]

Generate exactly ${count} flashcards:`;
  }

  // Document-based mode
  const topicInstruction = focusTopic
    ? `Focus specifically on the topic: "${focusTopic}". Only create flashcards related to this topic.`
    : 'Cover the most important concepts from the material.';

  return `You are a study assistant that creates effective flashcards for learning.

Based on the following study material, create exactly ${count} flashcards.
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
[
  {"front": "Question 1?", "back": "Answer 1"},
  {"front": "Question 2?", "back": "Answer 2"}
]

Generate exactly ${count} flashcards:`;
}

/**
 * Parse the LLM response into flashcard objects
 * @param {string} responseText
 * @returns {Array<{front: string, back: string}>}
 * @throws {Error} If parsing fails
 */
function parseFlashcardResponse(responseText) {
  // Try to extract JSON from the response
  // Sometimes the model wraps it in markdown code blocks
  let jsonStr = responseText.trim();

  // Remove markdown code blocks if present
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith('```')) {
    jsonStr = jsonStr.slice(0, -3);
  }
  jsonStr = jsonStr.trim();

  // Try to parse the JSON
  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    logger.error('Failed to parse flashcard JSON response', { responseText, error: e.message });
    throw new Error('Failed to generate flashcards. The AI response was not in the expected format. Please try again.');
  }

  // Validate the structure
  if (!Array.isArray(parsed)) {
    logger.error('Flashcard response is not an array', { parsed });
    throw new Error('Failed to generate flashcards. The AI response was not in the expected format. Please try again.');
  }

  // Validate each card
  const cards = [];
  for (let i = 0; i < parsed.length; i++) {
    const card = parsed[i];
    if (!card || typeof card.front !== 'string' || typeof card.back !== 'string') {
      logger.warn(`Invalid flashcard at index ${i}`, { card });
      continue; // Skip invalid cards instead of failing completely
    }
    cards.push({
      front: card.front.trim(),
      back: card.back.trim(),
    });
  }

  if (cards.length === 0) {
    throw new Error('Failed to generate flashcards. No valid cards were created. Please try again.');
  }

  return cards;
}

/**
 * Create a flashcard set with cards in the database
 * @param {object} params
 * @param {string} params.title
 * @param {string} [params.focusTopic]
 * @param {string} params.classroomId
 * @param {string} params.userId
 * @param {boolean} params.isGeneralKnowledge
 * @param {Array<{front: string, back: string}>} params.cards
 * @returns {Promise<object>} Created flashcard set with cards
 */
async function createFlashcardSet({ title, focusTopic, classroomId, userId, isGeneralKnowledge, cards }) {
  const flashcardSet = await prisma.flashcardSet.create({
    data: {
      title,
      focusTopic,
      classroomId,
      userId,
      // Note: We no longer store documentId since we support multiple docs
      // The set is associated with the classroom
      cards: {
        create: cards.map((card, index) => ({
          front: card.front,
          back: card.back,
          position: index,
        })),
      },
    },
    include: {
      cards: {
        orderBy: { position: 'asc' },
      },
    },
  });

  return flashcardSet;
}

/**
 * Get a flashcard set by ID
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function getFlashcardSetById(id) {
  return prisma.flashcardSet.findUnique({
    where: { id },
    include: {
      cards: {
        orderBy: { position: 'asc' },
      },
      classroom: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

/**
 * Get all flashcard sets for a classroom
 * @param {string} classroomId
 * @returns {Promise<Array>}
 */
async function getFlashcardSetsByClassroom(classroomId) {
  return prisma.flashcardSet.findMany({
    where: { classroomId },
    include: {
      _count: {
        select: { cards: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Delete a flashcard set
 * @param {string} id
 * @returns {Promise<void>}
 */
async function deleteFlashcardSet(id) {
  await prisma.flashcardSet.delete({
    where: { id },
  });
}

module.exports = {
  gatherDocumentsContentStructured,
  generateFlashcards,
  createFlashcardSet,
  getFlashcardSetById,
  getFlashcardSetsByClassroom,
  deleteFlashcardSet,
};
