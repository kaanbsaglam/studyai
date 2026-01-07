/**
 * Flashcard Service
 *
 * Generates flashcards from classroom documents using LLM.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { env } = require('../config/env');
const prisma = require('../lib/prisma');
const logger = require('../config/logger');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// Maximum characters to include in context (roughly ~15-20k tokens)
// This prevents context overflow with large document sets
const MAX_CONTEXT_CHARS = 60000;

/**
 * Gather content from all READY documents in a classroom
 * @param {string} classroomId
 * @returns {Promise<{content: string, truncated: boolean, documentCount: number}>}
 */
async function gatherClassroomContent(classroomId) {
  // Get all chunks from READY documents in this classroom
  const chunks = await prisma.documentChunk.findMany({
    where: {
      document: {
        classroomId,
        status: 'READY',
      },
    },
    include: {
      document: {
        select: {
          id: true,
          originalName: true,
        },
      },
    },
    orderBy: [
      { documentId: 'asc' },
      { chunkIndex: 'asc' },
    ],
  });

  if (chunks.length === 0) {
    return { content: '', truncated: false, documentCount: 0 };
  }

  // Group chunks by document for better context
  const docMap = new Map();
  for (const chunk of chunks) {
    const docId = chunk.document.id;
    if (!docMap.has(docId)) {
      docMap.set(docId, {
        name: chunk.document.originalName,
        chunks: [],
      });
    }
    docMap.get(docId).chunks.push(chunk.content);
  }

  // Build content string with document headers
  let content = '';
  let truncated = false;

  for (const [docId, doc] of docMap) {
    const docContent = `\n\n=== ${doc.name} ===\n${doc.chunks.join('\n\n')}`;

    // Check if adding this document would exceed limit
    if (content.length + docContent.length > MAX_CONTEXT_CHARS) {
      truncated = true;
      // Try to add partial content if there's room
      const remaining = MAX_CONTEXT_CHARS - content.length;
      if (remaining > 500) {
        content += docContent.substring(0, remaining) + '\n\n[Content truncated...]';
      }
      break;
    }

    content += docContent;
  }

  return {
    content: content.trim(),
    truncated,
    documentCount: docMap.size,
  };
}

/**
 * Generate flashcards using LLM
 * @param {object} params
 * @param {string} params.content - Document content to generate from
 * @param {string} [params.focusTopic] - Optional topic to focus on
 * @param {number} params.count - Number of flashcards to generate
 * @returns {Promise<{cards: Array<{front: string, back: string}>, tokensUsed: number}>}
 */
async function generateFlashcards({ content, focusTopic, count }) {
  const prompt = buildFlashcardPrompt({ content, focusTopic, count });

  logger.info(`Generating ${count} flashcards${focusTopic ? ` focused on "${focusTopic}"` : ''}`);

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  // Get token usage
  const usageMetadata = result.response.usageMetadata;
  const tokensUsed = usageMetadata?.totalTokenCount || 0;

  // Parse the JSON response
  const cards = parseFlashcardResponse(responseText);

  logger.info(`Generated ${cards.length} flashcards, ${tokensUsed} tokens used`);

  return { cards, tokensUsed };
}

/**
 * Build the prompt for flashcard generation
 */
function buildFlashcardPrompt({ content, focusTopic, count }) {
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
 * @param {Array<{front: string, back: string}>} params.cards
 * @returns {Promise<object>} Created flashcard set with cards
 */
async function createFlashcardSet({ title, focusTopic, classroomId, userId, cards }) {
  const flashcardSet = await prisma.flashcardSet.create({
    data: {
      title,
      focusTopic,
      classroomId,
      userId,
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
  gatherClassroomContent,
  generateFlashcards,
  createFlashcardSet,
  getFlashcardSetById,
  getFlashcardSetsByClassroom,
  deleteFlashcardSet,
  MAX_CONTEXT_CHARS,
};
