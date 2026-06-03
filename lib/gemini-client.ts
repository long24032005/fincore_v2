"use server";

import { GoogleGenAI } from "@google/genai";

/**
 * Gemini API Client with automatic key rotation
 * Switches to backup keys when quota is exceeded
 */

// Load all API keys from environment
const API_KEYS = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5,
    process.env.GEMINI_API_KEY_6,
    process.env.GEMINI_API_KEY_7,
    process.env.GEMINI_API_KEY_8,
].filter(Boolean) as string[]; // Remove undefined keys

console.log(`🔑 [Gemini Client] Loaded ${API_KEYS.length} API keys`);

/**
 * Check if error is a quota/rate limit error
 */
function isQuotaError(error: any): boolean {
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorStatus = error?.status || error?.statusCode;

    // Check for quota-related or transient server errors
    return (
        errorMessage.includes('quota') ||
        errorMessage.includes('resource_exhausted') ||
        errorMessage.includes('rate limit') ||
        errorMessage.includes('high demand') ||
        errorMessage.includes('temporary') ||
        errorMessage.includes('unavailable') ||
        errorStatus === 429 || // Too Many Requests
        errorStatus === 403 || // Forbidden (quota exceeded)
        errorStatus === 503 || // Service Unavailable
        errorStatus === 500    // Internal Server Error
    );
}

/**
 * Call Gemini API with automatic fallback to backup keys
 */
export async function callGeminiWithRotation(options: {
    model: string;
    contents: string;
}): Promise<any> {
    if (API_KEYS.length === 0) {
        throw new Error('No Gemini API keys configured');
    }

    let lastError: any;

    // Try each API key in sequence
    for (let i = 0; i < API_KEYS.length; i++) {
        const currentKey = API_KEYS[i];
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                if (attempts > 0) {
                    console.log(`🔑 [Gemini] Retrying with API Key #${i + 1}/${API_KEYS.length} (Attempt ${attempts + 1}/${maxAttempts})...`);
                } else {
                    console.log(`🔑 [Gemini] Attempting with API Key #${i + 1}/${API_KEYS.length}`);
                }

                const ai = new GoogleGenAI({ apiKey: currentKey });
                const response = await ai.models.generateContent({
                    model: options.model,
                    contents: options.contents,
                });

                console.log(`✅ [Gemini] Success with API Key #${i + 1}`);
                return response;

            } catch (error: any) {
                const errorMessage = error?.message?.toLowerCase() || '';
                const errorStatus = error?.status || error?.statusCode;
                const isRetryable = 
                    errorMessage.includes('quota') || 
                    errorMessage.includes('rate limit') || 
                    errorMessage.includes('resource_exhausted') || 
                    errorMessage.includes('high demand') ||
                    errorMessage.includes('temporary') ||
                    errorMessage.includes('unavailable') ||
                    errorStatus === 429 || 
                    errorStatus === 503 ||
                    errorStatus === 500;

                lastError = error;

                // If it is a transient error and we have remaining attempts, sleep and retry
                if (isRetryable && attempts < maxAttempts - 1) {
                    attempts++;
                    const delay = attempts * 3000; // 3s, then 6s
                    console.warn(`⚠️ [Gemini] Key #${i + 1} rate limited or temporary error. Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }

                console.error(`❌ [Gemini] Key #${i + 1} failed:`, error.message);

                // Check if it's a quota / rate limit / permission error to switch keys
                if (isQuotaError(error)) {
                    console.warn(`⚠️  [Gemini] Key #${i + 1} marked as exhausted/invalid, switching to next key...`);
                    break; // Break the while loop to move to next key in the sequence
                }

                // For non-quota errors, don't try other keys
                console.error(`🚨 [Gemini] Non-quota error, not retrying:`, error.message);
                throw error;
            }
        }
    }

    console.error('🚨 [Gemini] All API keys exhausted!');
    throw new Error('All Gemini API keys have exceeded their quota or are invalid. Please try again later.');
}

/**
 * Get current API keys status (for debugging)
 */
export async function getApiKeysStatus() {
    return {
        totalKeys: API_KEYS.length,
        keysConfigured: API_KEYS.map((key, idx) => ({
            index: idx + 1,
            keyPreview: `${key.substring(0, 20)}...`,
        })),
    };
}
