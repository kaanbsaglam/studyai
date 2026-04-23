/**
 * Quiz Service
 *
 * Generates multiple-choice quizzes from documents or general knowledge using LLM.
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
 * Generate quiz questions using LLM
 * @param {object} params
 * @param {string} [params.content] - Document content to generate from (legacy, use documents instead)
 * @param {Array<{id: string, name: string, content: string}>} [params.documents] - Structured documents
 * @param {string} [params.focusTopic] - Topic to focus on
 * @param {number} params.count - Number of questions to generate
 * @param {boolean} params.isGeneralKnowledge - Whether this is a general knowledge request
 * @param {string} [params.tier='FREE'] - User tier for model selection
 * @returns {Promise<{questions: Array, tokensUsed: number, warnings?: string[]}>}
 */
async function generateQuiz({ content, documents, focusTopic, count, isGeneralKnowledge, tier = 'FREE' }) {
  logger.info(`Generating ${count} quiz questions`, {
    focusTopic: focusTopic || 'none',
    isGeneralKnowledge,
    hasContent: !!content,
    hasDocuments: !!documents,
  });

  // General knowledge mode - use direct LLM call (no content to chunk)
  if (isGeneralKnowledge) {
    const prompt = buildQuizPrompt({ content: null, focusTopic, count, isGeneralKnowledge: true });
    const models = llmConfig.tiers[tier]?.studyAid || llmConfig.tiers.FREE.studyAid;
    const generator = getGenerator('quiz');
    const { text: responseText, tokensUsed, weightedTokens } = await generateWithFallback(
      prompt,
      models,
      { schema: generator.getSchema(0) }
    );
    const parsed = generator.parseResponse(responseText, 0);
    const questions = generator.validateResult(parsed, { count });
    logger.info(`Generated ${questions.length} quiz questions, ${tokensUsed} tokens used`);
    return { questions, tokensUsed, weightedTokens };
  }

  // Document-based mode - use pipeline for adaptive processing
  const contentInput = documents || content;
  const { result: questions, tokensUsed, weightedTokens, warnings } = await generateWithGenerator(
    'quiz',
    contentInput,
    { count, focusTopic },
    { tier }
  );

  logger.info(`Generated ${questions.length} quiz questions, ${tokensUsed} tokens used`);
  return { questions, tokensUsed, weightedTokens, warnings };
}

/**
 * Build the prompt for quiz generation
 */
function buildQuizPrompt({ content, focusTopic, count, isGeneralKnowledge }) {
  const topicInstruction = focusTopic
    ? `Focus specifically on: "${focusTopic}". Only create questions related to this topic.`
    : 'Cover the most important concepts from the material.';

  return loadPrompt('quiz/generate', {
    count,
    isGeneralKnowledge,
    topic: focusTopic || 'general knowledge',
    topicInstruction,
    content,
  });
}

/**
 * Create a quiz set with questions in the database
 */
async function createQuizSet({ title, focusTopic, classroomId, userId, questions }) {
  const quizSet = await prisma.quizSet.create({
    data: {
      title,
      focusTopic,
      classroomId,
      userId,
      questions: {
        create: questions.map((q, index) => ({
          question: q.question,
          correctAnswer: q.correctAnswer,
          wrongAnswers: q.wrongAnswers,
          position: index,
        })),
      },
    },
    include: {
      questions: {
        orderBy: { position: 'asc' },
      },
    },
  });

  return quizSet;
}

/**
 * Get a quiz set by ID
 */
async function getQuizSetById(id) {
  return prisma.quizSet.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { position: 'asc' },
      },
      classroom: {
        select: { id: true, name: true },
      },
    },
  });
}

/**
 * Get all quiz sets for a classroom
 */
async function getQuizSetsByClassroom(classroomId) {
  return prisma.quizSet.findMany({
    where: { classroomId },
    include: {
      _count: {
        select: { questions: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Delete a quiz set
 */
async function deleteQuizSet(id) {
  await prisma.quizSet.delete({
    where: { id },
  });
}

/**
 * Update a quiz set (title, focusTopic, and/or questions)
 * @param {string} id
 * @param {object} data
 * @returns {Promise<object>} Updated quiz set with questions
 */
async function updateQuizSet(id, data) {
  return prisma.$transaction(async (tx) => {
    const updateData = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.focusTopic !== undefined) updateData.focusTopic = data.focusTopic;

    if (Object.keys(updateData).length > 0) {
      await tx.quizSet.update({
        where: { id },
        data: updateData,
      });
    }

    if (data.questions) {
      await tx.quizQuestion.deleteMany({ where: { quizSetId: id } });
      await tx.quizQuestion.createMany({
        data: data.questions.map((q, index) => ({
          question: q.question,
          correctAnswer: q.correctAnswer,
          wrongAnswers: q.wrongAnswers,
          position: index,
          quizSetId: id,
        })),
      });
    }

    return tx.quizSet.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { position: 'asc' } },
        classroom: { select: { id: true, name: true } },
      },
    });
  });
}

/**
 * Record a quiz attempt
 * @param {object} params
 * @param {string} params.quizSetId
 * @param {number} params.score
 * @param {number} params.totalQuestions
 * @returns {Promise<object>}
 */
async function recordQuizAttempt({ quizSetId, score, totalQuestions }) {
  return prisma.quizAttempt.create({
    data: {
      quizSetId,
      score,
      totalQuestions,
    },
  });
}

/**
 * Get quiz attempts for a quiz set
 * @param {string} quizSetId
 * @param {number} limit - Max number of attempts to return
 * @returns {Promise<Array>}
 */
async function getQuizAttempts(quizSetId, limit = 10) {
  return prisma.quizAttempt.findMany({
    where: { quizSetId },
    orderBy: { completedAt: 'desc' },
    take: limit,
  });
}

module.exports = {
  gatherDocumentsContentStructured,
  generateQuiz,
  createQuizSet,
  getQuizSetById,
  getQuizSetsByClassroom,
  deleteQuizSet,
  recordQuizAttempt,
  getQuizAttempts,
  updateQuizSet,
};
