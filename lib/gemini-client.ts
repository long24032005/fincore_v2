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

    // Check for quota-related errors
    return (
        errorMessage.includes('quota') ||
        errorMessage.includes('resource_exhausted') ||
        errorMessage.includes('rate limit') ||
        errorStatus === 429 || // Too Many Requests
        errorStatus === 403 // Forbidden (quota exceeded)
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

        try {
            console.log(`🔑 [Gemini] Attempting with API Key #${i + 1}/${API_KEYS.length}`);

            const ai = new GoogleGenAI({ apiKey: currentKey });
            const response = await ai.models.generateContent({
                model: options.model,
                contents: options.contents,
            });

            console.log(`✅ [Gemini] Success with API Key #${i + 1}`);
            return response;

        } catch (error: any) {
            console.error(`❌ [Gemini] Key #${i + 1} failed:`, error.message);
            lastError = error;

            // Check if it's a quota error
            if (isQuotaError(error)) {
                console.warn(`⚠️  [Gemini] Key #${i + 1} quota exceeded, trying next key...`);

                // Continue to next key if available
                if (i < API_KEYS.length - 1) {
                    continue;
                } else {
                    console.error('🚨 [Gemini] All API keys exhausted!');
                    throw new Error('All Gemini API keys have exceeded their quota. Please try again later.');
                }
            }

            // For non-quota errors, don't try other keys
            console.error(`🚨 [Gemini] Non-quota error, not retrying:`, error.message);
            throw error;
        }
    }

    // Should not reach here, but just in case
    throw lastError || new Error('Failed to call Gemini API');
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
