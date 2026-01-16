/**
 * Summary Service
 *
 * Generates summaries from documents or general knowledge using LLM.
 */

const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const { gatherDocumentsContent, MAX_CONTEXT_CHARS } = require('./documentContent.service');
const { generateText } = require('./llm.service');

// Length configurations
const LENGTH_CONFIG = {
  short: { words: '150-250', description: 'brief overview' },
  medium: { words: '400-600', description: 'detailed summary' },
  long: { words: '800-1200', description: 'comprehensive summary' },
};

/**
 * Generate a summary using LLM
 * @param {object} params
 * @param {string} [params.content] - Document content to summarize
 * @param {string} [params.focusTopic] - Topic to focus on
 * @param {string} params.length - short, medium, or long
 * @param {boolean} params.isGeneralKnowledge - Whether this is a general knowledge request
 * @param {string} [params.tier='FREE'] - User tier for model selection
 * @returns {Promise<{summary: string, tokensUsed: number}>}
 */
async function generateSummary({ content, focusTopic, length, isGeneralKnowledge, tier = 'FREE' }) {
  const prompt = buildSummaryPrompt({ content, focusTopic, length, isGeneralKnowledge });

  logger.info(`Generating ${length} summary`, {
    focusTopic: focusTopic || 'none',
    isGeneralKnowledge,
    hasContent: !!content,
  });

  // Generate using LLM abstraction
  const { text, tokensUsed } = await generateText(prompt, { tier });
  const summary = text.trim();

  logger.info(`Generated summary (${summary.length} chars), ${tokensUsed} tokens used`);

  return { summary, tokensUsed };
}

/**
 * Build the prompt for summary generation
 */
function buildSummaryPrompt({ content, focusTopic, length, isGeneralKnowledge }) {
  const lengthInfo = LENGTH_CONFIG[length] || LENGTH_CONFIG.medium;

  if (isGeneralKnowledge) {
    const topic = focusTopic || 'the requested topic';
    return `You are an expert at creating clear, educational summaries.

Create a ${lengthInfo.description} (approximately ${lengthInfo.words} words) about: "${topic}"

Guidelines:
- Start with a clear introduction of the topic
- Cover the most important concepts and key points
- Use clear, accessible language
- Organize information logically
- End with key takeaways or conclusions

Write the summary in a flowing, readable format (not bullet points unless appropriate for the content).

Generate the summary:`;
  }

  const topicInstruction = focusTopic
    ? `Focus specifically on aspects related to: "${focusTopic}".`
    : 'Cover the most important concepts from all the material.';

  return `You are an expert at creating clear, educational summaries.

Based on the following study material, create a ${lengthInfo.description} (approximately ${lengthInfo.words} words).
${topicInstruction}

Guidelines:
- Capture the main ideas and key concepts
- Maintain accuracy to the source material
- Use clear, accessible language
- Organize information logically
- Include important details, examples, or definitions when relevant

Study Material:
${content}

Write the summary in a flowing, readable format. Generate the summary:`;
}

/**
 * Create a summary in the database
 * @param {object} params
 * @param {string} params.title
 * @param {string} [params.focusTopic]
 * @param {string} params.content - The generated summary text
 * @param {string} params.length
 * @param {string} params.classroomId
 * @param {string} params.userId
 * @returns {Promise<object>}
 */
async function createSummary({ title, focusTopic, content, length, classroomId, userId }) {
  return prisma.summary.create({
    data: {
      title,
      focusTopic,
      content,
      length,
      classroomId,
      userId,
    },
  });
}

/**
 * Get a summary by ID
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function getSummaryById(id) {
  return prisma.summary.findUnique({
    where: { id },
    include: {
      classroom: {
        select: { id: true, name: true },
      },
    },
  });
}

/**
 * Get all summaries for a classroom
 * @param {string} classroomId
 * @returns {Promise<Array>}
 */
async function getSummariesByClassroom(classroomId) {
  return prisma.summary.findMany({
    where: { classroomId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      focusTopic: true,
      length: true,
      createdAt: true,
    },
  });
}

/**
 * Delete a summary
 * @param {string} id
 * @returns {Promise<void>}
 */
async function deleteSummary(id) {
  await prisma.summary.delete({
    where: { id },
  });
}

module.exports = {
  gatherDocumentsContent, // Re-export from shared service
  generateSummary,
  createSummary,
  getSummaryById,
  getSummariesByClassroom,
  deleteSummary,
  LENGTH_CONFIG,
  MAX_CONTEXT_CHARS,
};
