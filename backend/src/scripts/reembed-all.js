/**
 * Re-embed All Documents
 *
 * Migrates from text-embedding-004 to gemini-embedding-001.
 * Re-embeds all existing chunks using the new model and updates Pinecone.
 *
 * Does NOT re-extract or re-chunk — reuses existing chunk text from the DB.
 *
 * Usage: node src/scripts/reembed-all.js
 */

require('dotenv').config();

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Pinecone } = require('@pinecone-database/pinecone');
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

// Config
const EMBEDDING_MODEL = 'gemini-embedding-001';
const OUTPUT_DIMENSIONALITY = 768;
const EMBED_BATCH_SIZE = 5; // Concurrent embedding requests
const EMBED_DELAY_MS = 100; // Delay between batches
const PINECONE_BATCH_SIZE = 100; // Vectors per Pinecone upsert

// Initialize clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.index(process.env.PINECONE_INDEX_NAME);

async function generateEmbedding(text) {
  const result = await embeddingModel.embedContent({
    content: { parts: [{ text }] },
    outputDimensionality: OUTPUT_DIMENSIONALITY,
  });
  return result.embedding.values;
}

async function generateEmbeddings(texts) {
  const embeddings = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBED_BATCH_SIZE);
    const batchResults = await Promise.all(batch.map((t) => generateEmbedding(t)));
    embeddings.push(...batchResults);
    if (i + EMBED_BATCH_SIZE < texts.length) {
      await new Promise((r) => setTimeout(r, EMBED_DELAY_MS));
    }
  }
  return embeddings;
}

async function main() {
  console.log('=== Re-embed All Documents ===');
  console.log(`Model: ${EMBEDDING_MODEL} (${OUTPUT_DIMENSIONALITY} dimensions)`);
  console.log();

  // Step 1: Get all documents with chunks
  const documents = await prisma.document.findMany({
    where: { status: 'READY' },
    include: {
      chunks: { orderBy: { chunkIndex: 'asc' } },
      classroom: { select: { id: true } },
    },
  });

  const totalChunks = documents.reduce((sum, doc) => sum + doc.chunks.length, 0);
  console.log(`Found ${documents.length} documents with ${totalChunks} chunks`);

  if (totalChunks === 0) {
    console.log('No chunks to re-embed. Done.');
    return;
  }

  // Step 2: Clear all vectors from Pinecone
  console.log();
  console.log('Step 1/3: Clearing Pinecone index...');
  try {
    await index.deleteAll();
    console.log('  Pinecone index cleared.');
  } catch (err) {
    // deleteAll can 404 on empty serverless indexes — safe to ignore
    console.warn('  Could not clear index (may already be empty):', err.message);
    console.log('  Continuing anyway...');
  }

  // Step 3: Re-embed and upsert document by document
  console.log();
  console.log('Step 2/3: Re-embedding chunks and upserting to Pinecone...');
  let processedChunks = 0;
  let failedDocs = 0;

  for (const doc of documents) {
    if (doc.chunks.length === 0) continue;

    try {
      // Generate new embeddings for all chunks of this document
      const chunkTexts = doc.chunks.map((c) => c.content);
      const embeddings = await generateEmbeddings(chunkTexts);

      // Build new vectors
      const vectors = doc.chunks.map((chunk, i) => ({
        id: uuidv4(),
        values: embeddings[i],
        metadata: {
          documentId: doc.id,
          classroomId: doc.classroomId,
          userId: doc.userId,
          chunkIndex: chunk.chunkIndex,
          filename: doc.originalName,
          text: chunk.content.substring(0, 1000),
        },
      }));

      // Upsert to Pinecone in batches
      for (let i = 0; i < vectors.length; i += PINECONE_BATCH_SIZE) {
        const batch = vectors.slice(i, i + PINECONE_BATCH_SIZE);
        await index.upsert(batch);
      }

      // Update pineconeIds in database
      for (let i = 0; i < doc.chunks.length; i++) {
        await prisma.documentChunk.update({
          where: { id: doc.chunks[i].id },
          data: { pineconeId: vectors[i].id },
        });
      }

      processedChunks += doc.chunks.length;
      console.log(`  [${processedChunks}/${totalChunks}] ${doc.originalName} — ${doc.chunks.length} chunks`);
    } catch (err) {
      console.error(`  FAILED: ${doc.originalName} — ${err.message}`);
      failedDocs++;
    }
  }

  // Step 4: Summary
  console.log();
  console.log('Step 3/3: Summary');
  console.log(`  Documents processed: ${documents.length - failedDocs}/${documents.length}`);
  console.log(`  Chunks re-embedded: ${processedChunks}/${totalChunks}`);
  if (failedDocs > 0) {
    console.log(`  Failed documents: ${failedDocs}`);
  }
  console.log();
  console.log('Done.');
}

main()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
