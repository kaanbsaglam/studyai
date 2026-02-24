/**
 * Summary Service
 *
 * Generates summaries from documents or general knowledge using LLM.
 */

const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const { gatherDocumentsContentStructured } = require('./documentContent.service');
const { generateWithFallback } = require('./llm.service');
const llmConfig = require('../config/llm.config');
const { generateWithGenerator } = require('./pipeline.service');

// Length configurations
const LENGTH_CONFIG = {
  short: { words: '150-250', description: 'brief overview' },
  medium: { words: '400-600', description: 'detailed summary' },
  long: { words: '800-1200', description: 'comprehensive summary' },
};

/**
 * Generate a summary using LLM
 * @param {object} params
 * @param {string} [params.content] - Document content to summarize (legacy, use documents instead)
 * @param {Array<{id: string, name: string, content: string}>} [params.documents] - Structured documents
 * @param {string} [params.focusTopic] - Topic to focus on
 * @param {string} params.length - short, medium, or long
 * @param {boolean} params.isGeneralKnowledge - Whether this is a general knowledge request
 * @param {string} [params.tier='FREE'] - User tier for model selection
 * @returns {Promise<{summary: string, tokensUsed: number, warnings?: string[]}>}
 */
async function generateSummary({ content, documents, focusTopic, length, isGeneralKnowledge, tier = 'FREE' }) {
  logger.info(`Generating ${length} summary`, {
    focusTopic: focusTopic || 'none',
    isGeneralKnowledge,
    hasContent: !!content,
    hasDocuments: !!documents,
  });

  // General knowledge mode - use direct LLM call (no content to chunk)
  if (isGeneralKnowledge) {
    const prompt = buildSummaryPrompt({ content: null, focusTopic, length, isGeneralKnowledge: true });
    const models = llmConfig.tiers[tier]?.studyAid || llmConfig.tiers.FREE.studyAid;
    const { text, tokensUsed, weightedTokens } = await generateWithFallback(prompt, models);
    const summary = text.trim();
    logger.info(`Generated summary (${summary.length} chars), ${tokensUsed} tokens used`);
    return { summary, tokensUsed, weightedTokens };
  }

  // Document-based mode - use pipeline for adaptive processing
  const contentInput = documents || content;
  const { result: summary, tokensUsed, weightedTokens, warnings } = await generateWithGenerator(
    'summary',
    contentInput,
    { length, focusTopic },
    { tier }
  );

  logger.info(`Generated summary (${summary.length} chars), ${tokensUsed} tokens used`);
  return { summary, tokensUsed, weightedTokens, warnings };
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

/**
 * Update a summary
 * @param {string} id
 * @param {object} data
 * @returns {Promise<object>} Updated summary
 */
async function updateSummary(id, data) {
  const updateData = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.focusTopic !== undefined) updateData.focusTopic = data.focusTopic;
  if (data.content !== undefined) updateData.content = data.content;
  if (data.length !== undefined) updateData.length = data.length;

  return prisma.summary.update({
    where: { id },
    data: updateData,
    include: {
      classroom: { select: { id: true, name: true } },
    },
  });
}

module.exports = {
  gatherDocumentsContentStructured,
  generateSummary,
  createSummary,
  getSummaryById,
  getSummariesByClassroom,
  deleteSummary,
  updateSummary,
  LENGTH_CONFIG,
};
