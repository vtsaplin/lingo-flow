import { Topic, Text } from '@shared/schema';
import { objectStorageClient } from './replit_integrations/object_storage';

// Content is stored in the bucket's public/content folder
const CONTENT_PREFIX = 'content/';

function getBucketName(): string {
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if (!bucketId) {
    throw new Error('DEFAULT_OBJECT_STORAGE_BUCKET_ID not set');
  }
  return bucketId;
}

export async function getTopics(): Promise<Topic[]> {
  try {
    const bucket = objectStorageClient.bucket(getBucketName());
    
    // List all files in the content folder
    const [files] = await bucket.getFiles({ prefix: CONTENT_PREFIX });
    
    // Filter for .md files and sort
    const markdownFiles = files
      .filter(f => f.name.endsWith('.md'))
      .sort((a, b) => a.name.localeCompare(b.name));
    
    const topics: Topic[] = [];

    for (const file of markdownFiles) {
      const [content] = await file.download();
      const filename = file.name.replace(CONTENT_PREFIX, '');
      const topic = parseTopic(filename, content.toString('utf-8'));
      if (topic) {
        topics.push(topic);
      }
    }

    return topics;
  } catch (error) {
    console.error('Error loading topics from storage:', error);
    return [];
  }
}

export async function getTopic(id: string): Promise<Topic | undefined> {
  const topics = await getTopics();
  return topics.find(t => t.id === id);
}

function parseTopic(filename: string, content: string): Topic | null {
  const lines = content.split('\n');
  const id = filename.replace(/\.md$/, '');
  
  let title = '';
  let description = '';
  const texts: Text[] = [];
  
  let currentText: Text | null = null;
  let isDescription = true;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('# ')) {
      title = line.substring(2).trim();
      isDescription = true;
    } else if (line.startsWith('## ')) {
      isDescription = false;
      if (currentText) {
        texts.push(currentText);
      }
      const textTitle = line.substring(3).trim();
      const textId = textTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      currentText = {
        id: textId,
        title: textTitle,
        content: []
      };
    } else if (line === '---') {
      // separator, ignore
    } else if (line.length > 0) {
      if (isDescription) {
        description += (description ? '\n' : '') + line;
      } else if (currentText) {
        currentText.content.push(line);
      }
    }
  }

  if (currentText) {
    texts.push(currentText);
  }

  if (!title) return null;

  return {
    id,
    title,
    description: description || undefined,
    texts
  };
}
