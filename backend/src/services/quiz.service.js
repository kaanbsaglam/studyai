/**
 * Quiz Service
 *
 * Generates multiple-choice quizzes from documents or general knowledge using LLM.
 */

const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const { gatherDocumentsContent, MAX_CONTEXT_CHARS } = require('./documentContent.service');
const { generateText } = require('./llm.service');

/**
 * Generate quiz questions using LLM
 * @param {object} params
 * @param {string} [params.content] - Document content to generate from
 * @param {string} [params.focusTopic] - Topic to focus on
 * @param {number} params.count - Number of questions to generate
 * @param {boolean} params.isGeneralKnowledge - Whether this is a general knowledge request
 * @param {string} [params.tier='FREE'] - User tier for model selection
 * @returns {Promise<{questions: Array, tokensUsed: number}>}
 */
async function generateQuiz({ content, focusTopic, count, isGeneralKnowledge, tier = 'FREE' }) {
  const prompt = buildQuizPrompt({ content, focusTopic, count, isGeneralKnowledge });

  logger.info(`Generating ${count} quiz questions`, {
    focusTopic: focusTopic || 'none',
    isGeneralKnowledge,
    hasContent: !!content,
  });

  // Generate using LLM abstraction
  const { text: responseText, tokensUsed } = await generateText(prompt, { tier });

  const questions = parseQuizResponse(responseText);

  logger.info(`Generated ${questions.length} quiz questions, ${tokensUsed} tokens used`);

  return { questions, tokensUsed };
}

/**
 * Build the prompt for quiz generation
 */
function buildQuizPrompt({ content, focusTopic, count, isGeneralKnowledge }) {
  if (isGeneralKnowledge) {
    const topic = focusTopic || 'general knowledge';
    return `You are a quiz creator that makes effective multiple-choice questions for learning.

Create exactly ${count} multiple-choice quiz questions about: "${topic}"

Guidelines:
- Each question should test understanding, not just memorization
- Questions should be clear and unambiguous
- The correct answer should be definitively correct
- Wrong answers (distractors) should be plausible but clearly incorrect
- Vary the difficulty from easy to challenging
- Cover different aspects of the topic

Respond with ONLY a valid JSON array in this exact format, no other text:
[
  {
    "question": "What is...?",
    "correctAnswer": "The correct answer",
    "wrongAnswers": ["Wrong answer 1", "Wrong answer 2", "Wrong answer 3"]
  }
]

Generate exactly ${count} questions:`;
  }

  const topicInstruction = focusTopic
    ? `Focus specifically on: "${focusTopic}". Only create questions related to this topic.`
    : 'Cover the most important concepts from the material.';

  return `You are a quiz creator that makes effective multiple-choice questions for learning.

Based on the following study material, create exactly ${count} multiple-choice quiz questions.
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
[
  {
    "question": "What is...?",
    "correctAnswer": "The correct answer",
    "wrongAnswers": ["Wrong answer 1", "Wrong answer 2", "Wrong answer 3"]
  }
]

Generate exactly ${count} questions:`;
}

/**
 * Parse the LLM response into quiz question objects
 */
function parseQuizResponse(responseText) {
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

  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    logger.error('Failed to parse quiz JSON response', { responseText, error: e.message });
    throw new Error('Failed to generate quiz. The AI response was not in the expected format. Please try again.');
  }

  if (!Array.isArray(parsed)) {
    logger.error('Quiz response is not an array', { parsed });
    throw new Error('Failed to generate quiz. The AI response was not in the expected format. Please try again.');
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
      logger.warn(`Invalid quiz question at index ${i}`, { q });
      continue;
    }

    questions.push({
      question: q.question.trim(),
      correctAnswer: q.correctAnswer.trim(),
      wrongAnswers: q.wrongAnswers.slice(0, 3).map((a) => a.trim()),
    });
  }

  if (questions.length === 0) {
    throw new Error('Failed to generate quiz. No valid questions were created. Please try again.');
  }

  return questions;
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
  gatherDocumentsContent, // Re-export from shared service
  generateQuiz,
  createQuizSet,
  getQuizSetById,
  getQuizSetsByClassroom,
  deleteQuizSet,
  recordQuizAttempt,
  getQuizAttempts,
  MAX_CONTEXT_CHARS,
};
