/**
 * RAG Configuration
 *
 * Controls retrieval-augmented generation behavior for chat queries.
 */

module.exports = {
  // Chunks below this similarity score are considered irrelevant
  similarityThreshold: 0.4,

  // Number of supplementary results to retrieve from Pinecone
  topK: 5,

  // Maximum characters for supplementary RAG context
  maxRagContextChars: 15000,

  // Maximum conversation history messages to include in prompt
  maxConversationHistory: 20,
};
