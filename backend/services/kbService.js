import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import KnowledgeBase from '../models/KnowledgeBase.js';
import aiService from './aiService.js';

// Helper for Cosine Similarity
const cosineSimilarity = (vecA, vecB) => {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

// Chunker helper
const chunkText = (text, maxLength = 800) => {
  const paragraphs = text.split(/\n+/);
  const chunks = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    if ((currentChunk + '\n' + para).length > maxLength) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = para;
    } else {
      currentChunk = currentChunk ? currentChunk + '\n' + para : para;
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  return chunks;
};

class KBService {
  async parseDocument(fileBuffer, fileType) {
    let rawText = '';
    
    if (fileType === 'application/pdf' || fileType === 'pdf') {
      try {
        const parsed = await pdf(fileBuffer);
        rawText = parsed.text;
      } catch (err) {
        console.error('PDF parsing failed:', err);
        throw new Error('Could not parse PDF document: ' + err.message);
      }
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileType === 'docx') {
      try {
        const parsed = await mammoth.extractRawText({ buffer: fileBuffer });
        rawText = parsed.value;
      } catch (err) {
        console.error('DOCX parsing failed:', err);
        throw new Error('Could not parse DOCX document: ' + err.message);
      }
    } else {
      // Plain text fallback
      rawText = fileBuffer.toString('utf-8');
    }

    return rawText;
  }

  async addDocument(clinicId, fileName, fileBuffer, mimeType) {
    const rawText = await this.parseDocument(fileBuffer, mimeType);
    if (!rawText.trim()) {
      throw new Error('Document contains no parseable text.');
    }

    const chunks = chunkText(rawText);
    console.log(`Parsed ${fileName} into ${chunks.length} chunks for clinic ${clinicId}`);

    for (const chunk of chunks) {
      // Generate embedding for each chunk
      const embedding = await aiService.generateEmbedding(chunk);
      
      // Save chunk database record
      await KnowledgeBase.create({
        clinicId,
        fileName,
        content: chunk,
        embedding
      });
    }

    return chunks.length;
  }

  async queryKnowledgeBase(clinicId, queryText, limit = 3) {
    try {
      // Fetch all docs for this clinic
      const docs = await KnowledgeBase.find({ clinicId });
      if (!docs.length) return '';

      // Generate embedding for the search query
      const queryEmbedding = await aiService.generateEmbedding(queryText);

      // Map to similarity scores
      const scoredDocs = docs.map(doc => {
        const score = cosineSimilarity(queryEmbedding, doc.embedding);
        return { content: doc.content, score };
      });

      // Sort descending and filter top results
      scoredDocs.sort((a, b) => b.score - a.score);
      const topDocs = scoredDocs
        .filter(doc => doc.score > 0.3) // minimum threshold match
        .slice(0, limit);

      if (!topDocs.length) return '';

      return topDocs.map(d => d.content).join('\n---\n');
    } catch (error) {
      console.error('KB RAG query failed:', error);
      return '';
    }
  }

  async deleteDocument(clinicId, fileName) {
    return await KnowledgeBase.deleteMany({ clinicId, fileName });
  }
}

export default new KBService();
