/**
 * S3 Service
 *
 * Handles file uploads and downloads from AWS S3.
 */

const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { env } = require('../config/env');
const { v4: uuidv4 } = require('uuid');

const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Upload a file to S3
 * @param {Buffer} fileBuffer - The file content
 * @param {string} originalName - Original filename
 * @param {string} mimeType - File MIME type
 * @param {string} classroomId - Classroom ID for organizing files
 * @returns {Promise<{key: string, filename: string}>}
 */
async function uploadFile(fileBuffer, originalName, mimeType, classroomId) {
  // Generate unique filename
  const extension = originalName.split('.').pop();
  const filename = `${uuidv4()}.${extension}`;
  const key = `documents/${classroomId}/${filename}`;

  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
  });

  await s3Client.send(command);

  return { key, filename };
}

/**
 * Get a file from S3
 * @param {string} key - S3 object key
 * @returns {Promise<Buffer>}
 */
async function getFile(key) {
  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET_NAME,
    Key: key,
  });

  const response = await s3Client.send(command);

  // Convert stream to buffer
  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Delete a file from S3
 * @param {string} key - S3 object key
 */
async function deleteFile(key) {
  const command = new DeleteObjectCommand({
    Bucket: env.S3_BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Get a presigned URL for downloading a file
 * @param {string} key - S3 object key
 * @param {number} expiresIn - URL expiration in seconds (default 1 hour)
 * @returns {Promise<string>}
 */
async function getPresignedUrl(key, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

module.exports = {
  uploadFile,
  getFile,
  deleteFile,
  getPresignedUrl,
};
