import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

if (!process.env.GEMINI_API_KEY) {
	throw new Error(
		'GEMINI_API_KEY is not set in environment variables. Make sure to set it in your .env file.'
	);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Validates an image against a task using Gemini AI
 * @param {string} imagePath - Path to the uploaded image file
 * @param {Object} task - Task object with aiPrompt and minConfidence
 * @returns {Promise<{match: boolean, confidence: number, reasoning: string}>}
 */
export async function validateImageWithAI(imagePath, task) {
	try {
		const model = genAI.getGenerativeModel({
			model: 'gemini-2.0-flash-exp',
			generationConfig: {
				responseMimeType: 'application/json'
			}
		});

		// Read the image file
		const imageBuffer = fs.readFileSync(imagePath);
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

Output: Return JSON only with the required format.
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
			const aiResponse = JSON.parse(text);

			// Validate the response structure
			if (
				typeof aiResponse.match !== 'boolean' ||
				typeof aiResponse.confidence !== 'number' ||
				typeof aiResponse.reasoning !== 'string'
			) {
				throw new Error('Invalid AI response structure');
			}

			// Ensure confidence is within bounds
			aiResponse.confidence = Math.max(0, Math.min(1, aiResponse.confidence));

			return aiResponse;
		} catch (parseError) {
			console.error('Failed to parse AI response:', text);
			throw new Error('AI returned invalid JSON response');
		}
	} catch (error) {
		console.error('AI validation error:', error);

		// Return a safe fallback response
		return {
			match: false,
			confidence: 0,
			reasoning: `AI validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
		};
	}
}

/**
 * Determines if a submission is valid based on AI response and task requirements
 * @param {Object} aiResponse - Response from validateImageWithAI
 * @param {Object} task - Task object with minConfidence threshold
 * @returns {boolean}
 */
export function isSubmissionValid(aiResponse, task) {
	return aiResponse.match && aiResponse.confidence >= task.minConfidence;
}
