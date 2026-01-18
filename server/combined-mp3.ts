import NodeID3 from "node-id3";
import * as mm from "music-metadata";
import { getTopics } from "./content";
import { tts } from "./azure";
import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";

const CACHE_DIR = path.join(process.cwd(), ".cache", "podcast");
const TEMP_DIR = path.join(process.cwd(), ".cache", "temp");

interface TextSelection {
  topicId: string;
  textId: string;
}

interface ChapterInfo {
  title: string;
  startMs: number;
  endMs: number;
}

interface SegmentFiles {
  introFile: string;
  pauseAfterIntroFile: string;
  beepFile: string;
  pauseAfterBeepFile: string;
  contentFile: string;
  introDurationMs: number;
  pauseAfterIntroDurationMs: number;
  beepDurationMs: number;
  pauseAfterBeepDurationMs: number;
  contentDurationMs: number;
  chapterTitle: string;
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function getCachePath(topicId: string, textId: string): string {
  return path.join(CACHE_DIR, `${topicId}_${textId}.mp3`);
}

async function getCachedAudio(topicId: string, textId: string): Promise<Buffer | null> {
  const cachePath = getCachePath(topicId, textId);
  try {
    return await fs.readFile(cachePath);
  } catch {
    return null;
  }
}

async function cacheAudio(topicId: string, textId: string, audio: Buffer): Promise<void> {
  await ensureDir(CACHE_DIR);
  const cachePath = getCachePath(topicId, textId);
  await fs.writeFile(cachePath, audio);
}

async function getAudioForText(topicId: string, textId: string, textContent: string): Promise<Buffer> {
  const cached = await getCachedAudio(topicId, textId);
  if (cached) {
    return cached;
  }
  
  const audioBuffer = await tts(textContent);
  if (!audioBuffer) {
    throw new Error(`TTS failed for ${topicId}/${textId}`);
  }
  
  await cacheAudio(topicId, textId, audioBuffer);
  return audioBuffer;
}

async function getAudioDurationMs(filePath: string): Promise<number> {
  try {
    const metadata = await mm.parseFile(filePath);
    return Math.round((metadata.format.duration || 0) * 1000);
  } catch {
    return 3000;
  }
}

async function generateBeep(outputFile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-y",
      "-f", "lavfi",
      "-i", "sine=frequency=800:duration=0.6",
      "-af", "afade=t=in:st=0:d=0.05,afade=t=out:st=0.4:d=0.2",
      "-c:a", "libmp3lame",
      "-b:a", "128k",
      "-ar", "44100",
      "-ac", "2",
      outputFile
    ]);
    
    ffmpeg.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Beep generation failed with code ${code}`));
    });
    ffmpeg.on("error", reject);
  });
}

async function generateSilence(outputFile: string, durationSec: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-y",
      "-f", "lavfi",
      "-i", `anullsrc=r=44100:cl=stereo`,
      "-t", durationSec.toString(),
      "-c:a", "libmp3lame",
      "-b:a", "128k",
      outputFile
    ]);
    
    ffmpeg.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Silence generation failed with code ${code}`));
    });
    ffmpeg.on("error", reject);
  });
}

async function convertToMp3(inputFile: string, outputFile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-y",
      "-i", inputFile,
      "-c:a", "libmp3lame",
      "-b:a", "128k",
      "-ar", "44100",
      "-ac", "2",
      outputFile
    ]);
    
    ffmpeg.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Conversion failed with code ${code}`));
    });
    ffmpeg.on("error", reject);
  });
}

async function concatenateWithFfmpeg(inputFiles: string[], outputFile: string): Promise<void> {
  await ensureDir(path.dirname(outputFile));
  
  const listFile = path.join(TEMP_DIR, `concat_${Date.now()}_${Math.random().toString(36).slice(2)}.txt`);
  const listContent = inputFiles.map(f => `file '${f}'`).join("\n");
  await fs.writeFile(listFile, listContent);
  
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-y",
      "-f", "concat",
      "-safe", "0",
      "-i", listFile,
      "-c:a", "libmp3lame",
      "-b:a", "128k",
      "-ar", "44100",
      "-ac", "2",
      outputFile
    ]);
    
    let stderr = "";
    ffmpeg.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    
    ffmpeg.on("close", async (code) => {
      try {
        await fs.unlink(listFile);
      } catch {}
      
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg failed with code ${code}: ${stderr}`));
      }
    });
    
    ffmpeg.on("error", reject);
  });
}

export async function generateCombinedMp3(selections: TextSelection[]): Promise<Buffer> {
  const topics = await getTopics();
  
  await ensureDir(TEMP_DIR);
  
  const allTempFiles: string[] = [];
  const segments: SegmentFiles[] = [];
  const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  
  try {
    const beepFile = path.join(TEMP_DIR, `beep_${uniqueId}.mp3`);
    await generateBeep(beepFile);
    allTempFiles.push(beepFile);
    const beepDurationMs = await getAudioDurationMs(beepFile);
    
    const pauseAfterIntroFile = path.join(TEMP_DIR, `pause_intro_${uniqueId}.mp3`);
    await generateSilence(pauseAfterIntroFile, 0.5);
    allTempFiles.push(pauseAfterIntroFile);
    const pauseAfterIntroDurationMs = await getAudioDurationMs(pauseAfterIntroFile);
    
    const pauseAfterBeepFile = path.join(TEMP_DIR, `pause_beep_${uniqueId}.mp3`);
    await generateSilence(pauseAfterBeepFile, 0.7);
    allTempFiles.push(pauseAfterBeepFile);
    const pauseAfterBeepDurationMs = await getAudioDurationMs(pauseAfterBeepFile);
    
    for (let i = 0; i < selections.length; i++) {
      const selection = selections[i];
      const topic = topics.find(t => t.id === selection.topicId);
      if (!topic) continue;
      
      const text = topic.texts.find(t => t.id === selection.textId);
      if (!text) continue;
      
      const segmentId = `${uniqueId}_${i}`;
      
      const introText = `New text: ${text.title}. Topic: ${topic.title}.`;
      const introBuffer = await tts(introText);
      if (!introBuffer) {
        throw new Error(`Failed to generate intro TTS for ${text.title}`);
      }
      
      const introRawFile = path.join(TEMP_DIR, `intro_raw_${segmentId}.mp3`);
      const introNormFile = path.join(TEMP_DIR, `intro_norm_${segmentId}.mp3`);
      await fs.writeFile(introRawFile, introBuffer);
      await convertToMp3(introRawFile, introNormFile);
      allTempFiles.push(introRawFile, introNormFile);
      const introDurationMs = await getAudioDurationMs(introNormFile);
      
      const pauseAfterIntroCopy = path.join(TEMP_DIR, `pause_intro_${segmentId}.mp3`);
      await fs.copyFile(pauseAfterIntroFile, pauseAfterIntroCopy);
      allTempFiles.push(pauseAfterIntroCopy);
      
      const beepCopyFile = path.join(TEMP_DIR, `beep_${segmentId}.mp3`);
      await fs.copyFile(beepFile, beepCopyFile);
      allTempFiles.push(beepCopyFile);
      
      const pauseAfterBeepCopy = path.join(TEMP_DIR, `pause_beep_${segmentId}.mp3`);
      await fs.copyFile(pauseAfterBeepFile, pauseAfterBeepCopy);
      allTempFiles.push(pauseAfterBeepCopy);
      
      const fullText = text.content.join(" ");
      const contentBuffer = await getAudioForText(selection.topicId, selection.textId, fullText);
      
      const contentRawFile = path.join(TEMP_DIR, `content_raw_${segmentId}.mp3`);
      const contentNormFile = path.join(TEMP_DIR, `content_norm_${segmentId}.mp3`);
      await fs.writeFile(contentRawFile, contentBuffer);
      await convertToMp3(contentRawFile, contentNormFile);
      allTempFiles.push(contentRawFile, contentNormFile);
      const contentDurationMs = await getAudioDurationMs(contentNormFile);
      
      segments.push({
        introFile: introNormFile,
        pauseAfterIntroFile: pauseAfterIntroCopy,
        beepFile: beepCopyFile,
        pauseAfterBeepFile: pauseAfterBeepCopy,
        contentFile: contentNormFile,
        introDurationMs,
        pauseAfterIntroDurationMs,
        beepDurationMs,
        pauseAfterBeepDurationMs,
        contentDurationMs,
        chapterTitle: `${topic.title} — ${text.title}`
      });
    }
    
    if (segments.length === 0) {
      throw new Error("No audio generated");
    }
    
    const filesToConcat: string[] = [];
    const chapters: ChapterInfo[] = [];
    let currentTimeMs = 0;
    
    for (const segment of segments) {
      const chapterStartMs = currentTimeMs;
      
      filesToConcat.push(segment.introFile);
      currentTimeMs += segment.introDurationMs;
      
      filesToConcat.push(segment.pauseAfterIntroFile);
      currentTimeMs += segment.pauseAfterIntroDurationMs;
      
      filesToConcat.push(segment.beepFile);
      currentTimeMs += segment.beepDurationMs;
      
      filesToConcat.push(segment.pauseAfterBeepFile);
      currentTimeMs += segment.pauseAfterBeepDurationMs;
      
      filesToConcat.push(segment.contentFile);
      currentTimeMs += segment.contentDurationMs;
      
      chapters.push({
        title: segment.chapterTitle,
        startMs: chapterStartMs,
        endMs: currentTimeMs
      });
    }
    
    const outputFile = path.join(TEMP_DIR, `combined_${uniqueId}.mp3`);
    await concatenateWithFfmpeg(filesToConcat, outputFile);
    allTempFiles.push(outputFile);
    
    const chapTags = chapters.map((ch, idx) => ({
      elementID: `chap${idx + 1}`,
      startTimeMs: ch.startMs,
      endTimeMs: ch.endMs,
      tags: {
        title: ch.title
      }
    }));
    
    const toc = {
      elementID: "toc1",
      isOrdered: true,
      elements: chapters.map((_, idx) => `chap${idx + 1}`),
      tags: { title: "Chapters" }
    };
    
    const tags = {
      title: "LingoFlow - German Learning",
      artist: "LingoFlow",
      album: "German Learning Texts",
      chapter: chapTags,
      tableOfContents: [toc]
    };
    
    const taggedFile = path.join(TEMP_DIR, `tagged_${uniqueId}.mp3`);
    await fs.copyFile(outputFile, taggedFile);
    allTempFiles.push(taggedFile);
    
    NodeID3.write(tags, taggedFile);
    
    const finalBuffer = await fs.readFile(taggedFile);
    
    return finalBuffer;
  } finally {
    for (const file of allTempFiles) {
      try {
        await fs.unlink(file);
      } catch {}
    }
  }
}
