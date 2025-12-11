// ABOUTME: Performs AI validation of images using Gemini given a buffer or path.
// ABOUTME: Returns match/confidence/reasoning, falling back safely on errors.

import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error(
    'GEMINI_API_KEY is not set in environment variables. Make sure to set it in your .env file.'
  );
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export interface AiValidationResult {
  match: boolean;
  confidence: number;
  reasoning: string;
}

interface TaskLike {
  aiPrompt: string;
  minConfidence: number;
}

/**
 * Validates an image against a task using Gemini AI.
 * @param imageSource File path or in-memory buffer
 * @param task Task object with aiPrompt and minConfidence
 */
export async function validateImageWithAI(
  imageSource: string | Buffer,
  task: TaskLike
): Promise<AiValidationResult> {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

    const imageBuffer =
      typeof imageSource === 'string' ? fs.readFileSync(imageSource) : imageSource;
    const imageBase64 = imageBuffer.toString('base64');

    const prompt = `
Role: You are a strict scavenger hunt judge.
Task: Verify if the image contains: ${task.aiPrompt}

Instructions:
- Analyze the image carefully for the requested item
- Be strict but fair in your assessment
- Consider lighting, clarity, and prominence of the item
- Return confidence as a decimal between 0.0 and 1.0
- Provide brief, helpful reasoning

Output: Return JSON only with this exact format:
{
  "match": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}
		`.trim();

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBase64,
          mimeType: 'image/jpeg'
        }
      }
    ]);

    const response = result.response;
    const text = response.text();

    try {
      const aiResponse = JSON.parse(text) as Partial<AiValidationResult>;

      if (
        typeof aiResponse.match !== 'boolean' ||
        typeof aiResponse.confidence !== 'number' ||
        typeof aiResponse.reasoning !== 'string'
      ) {
        throw new Error('Invalid AI response structure');
      }

      // Clamp confidence between 0 and 1
      aiResponse.confidence = Math.max(0, Math.min(1, aiResponse.confidence));

      return aiResponse as AiValidationResult;
    } catch (parseError) {
      console.error('Failed to parse AI response:', text);
      throw new Error('AI returned invalid JSON response');
    }
  } catch (error) {
    console.error('AI validation error:', error);

    return {
      match: false,
      confidence: 0,
      reasoning: `AI validation failed: ${error instanceof Error ? error.message : 'Unknown error'
        }`
    };
  }
}

/**
 * Determines if a submission is valid based on AI response and task requirements.
 */
export function isSubmissionValid(aiResponse: AiValidationResult, task: TaskLike): boolean {
  return aiResponse.match && aiResponse.confidence >= task.minConfidence;
}
