/**
 * Flashcard Service
 *
 * Generates flashcards from documents or general knowledge using LLM.
 */

const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const { gatherDocumentsContentStructured } = require('./documentContent.service');
const { generateWithFallback } = require('./llm.service');
const llmConfig = require('../config/llm.config');
const { generateWithGenerator } = require('./pipeline.service');
const { getGenerator } = require('../generators');
const { loadPrompt } = require('../prompts/loader');

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
    const models = llmConfig.tiers[tier]?.studyAid || llmConfig.tiers.FREE.studyAid;
    const generator = getGenerator('flashcard');
    const { text: responseText, tokensUsed, weightedTokens } = await generateWithFallback(
      prompt,
      models,
      { schema: generator.getSchema(0) }
    );
    const parsed = generator.parseResponse(responseText, 0);
    const cards = generator.validateResult(parsed, { count });
    logger.info(`Generated ${cards.length} flashcards, ${tokensUsed} tokens used`);
    return { cards, tokensUsed, weightedTokens };
  }

  // Document-based mode - use pipeline for adaptive processing
  const contentInput = documents || content;
  const { result: cards, tokensUsed, weightedTokens, warnings } = await generateWithGenerator(
    'flashcard',
    contentInput,
    { count, focusTopic },
    { tier }
  );

  logger.info(`Generated ${cards.length} flashcards, ${tokensUsed} tokens used`);
  return { cards, tokensUsed, weightedTokens, warnings };
}

/**
 * Build the prompt for flashcard generation
 */
function buildFlashcardPrompt({ content, focusTopic, count, isGeneralKnowledge }) {
  const topicInstruction = focusTopic
    ? `Focus specifically on the topic: "${focusTopic}". Only create flashcards related to this topic.`
    : 'Cover the most important concepts from the material.';

  return loadPrompt('flashcard/generate', {
    count,
    isGeneralKnowledge,
    topic: focusTopic || 'general study topics',
    topicInstruction,
    content,
  });
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

/**
 * Update a flashcard set (title, focusTopic, and/or cards)
 * @param {string} id
 * @param {object} data
 * @param {string} [data.title]
 * @param {string} [data.focusTopic]
 * @param {Array<{id?: string, front: string, back: string}>} [data.cards]
 * @returns {Promise<object>} Updated flashcard set with cards
 */
async function updateFlashcardSet(id, data) {
  return prisma.$transaction(async (tx) => {
    // Update set metadata if provided
    const updateData = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.focusTopic !== undefined) updateData.focusTopic = data.focusTopic;

    if (Object.keys(updateData).length > 0) {
      await tx.flashcardSet.update({
        where: { id },
        data: updateData,
      });
    }

    // Replace all cards if provided
    if (data.cards) {
      await tx.flashcard.deleteMany({ where: { flashcardSetId: id } });
      await tx.flashcard.createMany({
        data: data.cards.map((card, index) => ({
          front: card.front,
          back: card.back,
          position: index,
          flashcardSetId: id,
        })),
      });
    }

    return tx.flashcardSet.findUnique({
      where: { id },
      include: {
        cards: { orderBy: { position: 'asc' } },
        classroom: { select: { id: true, name: true } },
      },
    });
  });
}

/**
 * Get progress for all cards in a flashcard set for a user
 */
async function getFlashcardSetProgress(flashcardSetId, userId) {
  return prisma.flashcardProgress.findMany({
    where: { flashcardSetId, userId },
  });
}

/**
 * Save progress for a single card (SM-2 spaced repetition)
 */
async function saveCardProgress({ userId, flashcardId, flashcardSetId, correct, confidence }) {
  const existing = await prisma.flashcardProgress.findUnique({
    where: { userId_flashcardId: { userId, flashcardId } },
  });

  const now = new Date();
  let easeFactor = existing?.easeFactor ?? 2.5;
  let interval = existing?.interval ?? 0;
  let repetitions = existing?.repetitions ?? 0;
  let totalCorrect = existing?.correct ?? 0;
  let totalWrong = existing?.wrong ?? 0;

  if (correct) {
    totalCorrect++;
    repetitions++;
    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    // Adjust ease factor based on confidence (SM-2 formula)
    const q = confidence || 3; // default to 3 if not provided
    easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;
  } else {
    totalWrong++;
    repetitions = 0;
    interval = 1;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
  }

  const nextReviewAt = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

  return prisma.flashcardProgress.upsert({
    where: { userId_flashcardId: { userId, flashcardId } },
    create: {
      userId,
      flashcardId,
      flashcardSetId,
      correct: totalCorrect,
      wrong: totalWrong,
      confidence: confidence || 0,
      easeFactor,
      interval,
      repetitions,
      nextReviewAt,
      lastReviewedAt: now,
    },
    update: {
      correct: totalCorrect,
      wrong: totalWrong,
      confidence: confidence || existing?.confidence || 0,
      easeFactor,
      interval,
      repetitions,
      nextReviewAt,
      lastReviewedAt: now,
    },
  });
}

/**
 * Reset all progress for a flashcard set for a user
 */
async function resetFlashcardSetProgress(flashcardSetId, userId) {
  return prisma.flashcardProgress.deleteMany({
    where: { flashcardSetId, userId },
  });
}

module.exports = {
  gatherDocumentsContentStructured,
  generateFlashcards,
  createFlashcardSet,
  getFlashcardSetById,
  getFlashcardSetsByClassroom,
  deleteFlashcardSet,
  updateFlashcardSet,
  getFlashcardSetProgress,
  saveCardProgress,
  resetFlashcardSetProgress,
};
