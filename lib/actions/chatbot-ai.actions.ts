"use server";

import { callGeminiWithRotation } from "../gemini-client";
import { parseStringify } from "../utils";

/**
 * Parse user message and determine intent using Gemini AI
 */
export const parseUserIntent = async (
    userMessage: string,
    context: ChatbotContext
): Promise<{
    intent: ChatIntent;
    entities: {
        recipientNickname?: string;
        amount?: number;
        source?: string;
        destination?: string;
        detectedIntents?: string[]; // BUG FIX #7: Store list of intents when multiple detected
        multipleTransfers?: boolean;
    };
}> => {
    try {
        console.log('🤖 [AI Parse] User message:', userMessage);
        console.log('📋 [AI Parse] Available recipients:', context.savedRecipients.length);

        // Build context-aware prompt with recipient details
        const recipientList = context.savedRecipients
            .map((r, idx) => `${idx + 1}. "${r.nickname}" (Name: ${r.name}, Email: ${r.email}, Type: ${r.transferType})`)
            .join('\n');

        console.log('👥 [AI Parse] Recipient list for AI:\n', recipientList || 'None');

        const prompt = `You are a financial assistant for Finecore Wallet. Parse the user's request and respond ONLY with valid JSON.

USER'S SAVED RECIPIENTS:
${recipientList || 'None'}

USER'S MESSAGE: "${userMessage}"

EXAMPLES OF CORRECT PARSING:
Example 1 (Single intent):
  User: "i want to transfer 1 dollar to Linda Ngo"
  Recipients: 1. "Linda Ngo" (Name: Linda Ngo, Email: lindango@gmail.com, Type: wallet)
  Response: {"intents": ["transfer_money"], "entities": {"recipientNickname": "Linda Ngo", "amount": 1}}

Example 2 (Multiple intents):
  User: "check my balance and transfer 5 to John"
  Recipients: 1. "John" (Name: John Doe, Email: john@example.com, Type: bank)
  Response: {"intents": ["check_balance", "transfer_money"], "entities": {"recipientNickname": "John", "amount": 5}}

Example 3 (Multiple intents - list + history):
  User: "show my recipients and transaction history"
  Response: {"intents": ["list_recipients", "transaction_history"], "entities": {}}

Example 4 (Multiple transfers):
  User: "send 5 to lana and 10 to john"
  Recipients: 1. "lana ngo" (Name: Lana Ngo, ...),  2. "john" (Name: John Doe, ...)
  Response: {"intents": ["transfer_money", "transfer_money"], "entities": {"multipleTransfers": true}, "note": "User wants TWO separate transfers"}

NOW PARSE THIS MESSAGE:
Analyze the message and return JSON with:
{
  "intents": ["intent1", "intent2", ...],  // Array of ALL detected intents (even if just 1)
  "entities": {
    "recipientNickname": "exact nickname from saved recipients list above, or null if not found",
    "amount": numeric amount or null,
    "source": "wallet" | "bank" | null,
    "destination": "wallet" | "bank" | null,
    "multipleTransfers": true (if user wants multiple transfers in one message)
  }
}

CRITICAL RULES:
- DETECT ALL INTENTS in the message, not just the first one
- Return ALL intents as an array in "intents" field
- CAREFULLY match recipient names from the saved list above (case-insensitive)
- If you see "to [NAME]" in the message, extract [NAME] and find it in the saved recipients list
- recipientNickname MUST be the exact nickname string from the list above
- Extract numeric amounts: "1 dollar" → 1, "fifty dollars" → 50, "$100" → 100
- Intent types:
  * "send", "pay", "transfer" → "transfer_money"
  * "balance", "how much" → "check_balance"
  * "recipients", "who can I send to" → "list_recipients"
  * "history", "recent", "transactions" → "transaction_history"
  * Otherwise → "general_query"
- If message contains "and" between two actions (e.g., "check balance AND transfer"), include BOTH intents

Return ONLY the JSON object, no markdown, no explanation.`;

        const response = await callGeminiWithRotation({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        // Extract text from response  
        let responseText = '';
        if (response && typeof response === 'object') {
            if ('text' in response && typeof response.text === 'string') {
                responseText = response.text;
            } else if ('candidates' in response && Array.isArray(response.candidates)) {
                responseText = response.candidates[0]?.content?.parts?.[0]?.text || '';
            }
        }

        console.log('🔍 [AI Parse] Raw AI response:', responseText);

        // Clean response (remove markdown code blocks if present)
        const cleanedResponse = responseText
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        const parsed = JSON.parse(cleanedResponse);
        console.log('✅ [AI Parse] Parsed result:', JSON.stringify(parsed, null, 2));

        // HANDLE MULTIPLE INTENTS
        // Check if AI returned array of intents (new format) vs single intent (old format)
        let finalIntent: ChatIntent;
        let detectedIntents: string[] = [];

        if (parsed.intents && Array.isArray(parsed.intents)) {
            // New format: {intents: [...]}
            detectedIntents = parsed.intents;
            console.log(`🔍 [Multiple Intents] Detected ${detectedIntents.length} intent(s):`, detectedIntents);

            if (detectedIntents.length > 1) {
                // Multiple intents detected!
                console.log('⚠️  [Multiple Intents] User requested multiple actions in one message');
                finalIntent = 'multiple_intents' as ChatIntent;
                // Store the list of intents in entities so ChatbotWindow can access it
                parsed.entities.detectedIntents = detectedIntents;
            } else if (detectedIntents.length === 1) {
                // Only 1 intent
                finalIntent = detectedIntents[0] as ChatIntent;
            } else {
                // No intents? Fallback to general_query
                finalIntent = 'general_query';
            }
        } else if (parsed.intent) {
            // Old format: {intent: "..."}  (backward compatible)
            finalIntent = parsed.intent;
            detectedIntents = [parsed.intent];
        } else {
            // No intent field at all
            finalIntent = 'general_query';
        }

        console.log('🎯 [Final Intent]:', finalIntent);

        // REGEX FALLBACK: If AI didn't extract recipientNickname but intent is transfer_money
        if (detectedIntents.includes('transfer_money') && !parsed.entities?.recipientNickname) {
            console.log('⚠️  [AI Parse] AI missed recipient, trying regex fallback...');

            // Try to extract recipient name using regex patterns
            const patterns = [
                /to\s+([A-Za-z\s]+?)(?:\s+from|\s*$)/i,     // "to Linda Ngo" or "to Linda Ngo from"
                /send.*?to\s+([A-Za-z\s]+?)(?:\s|$)/i,       // "send to Linda Ngo"
                /pay\s+([A-Za-z\s]+?)(?:\s|$)/i,             // "pay Linda Ngo"
                /transfer.*?to\s+([A-Za-z\s]+?)(?:\s|$)/i,   // "transfer to Linda Ngo"
            ];

            for (const pattern of patterns) {
                const match = userMessage.match(pattern);
                if (match && match[1]) {
                    const extractedName = match[1].trim();
                    console.log('🎯 [Regex Fallback] Extracted name:', extractedName);

                    // Try to find this name in saved recipients (case-insensitive)
                    const foundRecipient = context.savedRecipients.find(r =>
                        r.nickname.toLowerCase() === extractedName.toLowerCase() ||
                        r.name.toLowerCase() === extractedName.toLowerCase()
                    );

                    if (foundRecipient) {
                        console.log('✅ [Regex Fallback] Matched recipient:', foundRecipient.nickname);
                        parsed.entities.recipientNickname = foundRecipient.nickname;
                        break;
                    } else {
                        console.log('❌ [Regex Fallback] No match in saved recipients for:', extractedName);
                    }
                }
            }
        }

        // Also try to extract amount if AI missed it
        if (parsed.intent === 'transfer_money' && !parsed.entities?.amount) {
            const amountPatterns = [
                /\$?(\d+(?:\.\d{2})?)\s*(?:dollar|usd|buck)?/i,
                /(?:transfer|send|pay)\s+(\d+)/i,
            ];

            for (const pattern of amountPatterns) {
                const match = userMessage.match(pattern);
                if (match && match[1]) {
                    parsed.entities.amount = parseFloat(match[1]);
                    console.log('🎯 [Regex Fallback] Extracted amount:', parsed.entities.amount);
                    break;
                }
            }
        }

        console.log('🎉 [AI Parse] Final result:', JSON.stringify({ intent: finalIntent, entities: parsed.entities }, null, 2));

        return parseStringify({
            intent: finalIntent,
            entities: parsed.entities || {},
        });
    } catch (error) {
        console.error('❌ [AI Parse] Error parsing user intent:', error);

        // Fallback: Simple keyword-based intent detection with regex entity extraction
        const lowerMessage = userMessage.toLowerCase();
        let fallbackIntent: ChatIntent = 'general_query';
        const fallbackEntities: any = {};

        if (lowerMessage.includes('balance') || lowerMessage.includes('money')) {
            fallbackIntent = 'check_balance';
        } else if (lowerMessage.includes('recipient') || lowerMessage.includes('who can')) {
            fallbackIntent = 'list_recipients';
        } else if (lowerMessage.includes('transaction') || lowerMessage.includes('history')) {
            fallbackIntent = 'transaction_history';
        } else if (lowerMessage.includes('send') || lowerMessage.includes('transfer') || lowerMessage.includes('pay')) {
            fallbackIntent = 'transfer_money';

            // Try regex extraction for fallback
            const patterns = [
                /to\s+([A-Za-z\s]+?)(?:\s+from|\s*$)/i,
                /send.*?to\s+([A-Za-z\s]+?)(?:\s|$)/i,
            ];

            for (const pattern of patterns) {
                const match = userMessage.match(pattern);
                if (match && match[1]) {
                    const extractedName = match[1].trim();
                    const foundRecipient = context.savedRecipients.find(r =>
                        r.nickname.toLowerCase() === extractedName.toLowerCase()
                    );
                    if (foundRecipient) {
                        fallbackEntities.recipientNickname = foundRecipient.nickname;
                        break;
                    }
                }
            }

            // Extract amount
            const amountMatch = userMessage.match(/\$?(\d+(?:\.\d{2})?)/);
            if (amountMatch) {
                fallbackEntities.amount = parseFloat(amountMatch[1]);
            }
        }

        console.log('🔄 [Fallback Parse] Result:', { intent: fallbackIntent, entities: fallbackEntities });

        return {
            intent: fallbackIntent,
            entities: fallbackEntities,
        };
    }
};

/**
 * Generate chatbot response using Gemini AI
 */
export const generateChatbotResponse = async (
    userMessage: string,
    context: ChatbotContext,
    conversationHistory: ChatMessage[]
): Promise<string> => {
    try {
        // Build conversation history
        const historyText = conversationHistory
            .slice(-5) // Last 5 messages only
            .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
            .join('\n');

        const prompt = `You are a professional financial assistant for Finecore Wallet, a digital banking app.

PERSONALITY:
- Professional, concise, helpful
- No casual slang or AI-like phrases ("How may I assist you today?")
- Speak like a real banking assistant
- Use emojis sparingly (max 1-2 per message)

USER CONTEXT:
- Wallet Balance: $${context.walletBalance.toFixed(2)}
- Saved Recipients: ${context.savedRecipients.length} contacts
- Bank Accounts: ${context.bankAccounts.length} linked accounts

CONVERSATION HISTORY:
${historyText || 'No previous messages'}

CURRENT USER MESSAGE: "${userMessage}"

RULES:
- DO NOT execute transfers automatically
- DO NOT make up recipient names
- DO NOT show fake data
- Only reference actual saved recipients: ${context.savedRecipients.map(r => r.nickname).join(', ')}
- Keep responses under 100 words
- If user asks to transfer money, guide them through the process step-by-step

Respond as the assistant:`;

        const response = await callGeminiWithRotation({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        // Extract text from response
        let responseText = '';
        if (response && typeof response === 'object') {
            if ('text' in response && typeof response.text === 'string') {
                responseText = response.text;
            } else if ('candidates' in response && Array.isArray(response.candidates)) {
                responseText = response.candidates[0]?.content?.parts?.[0]?.text || '';
            }
        }

        return responseText || "I'm having trouble processing your request. Please try again.";
    } catch (error) {
        console.error('Error generating chatbot response:', error);
        return "I'm having trouble processing your request. Please try again.";
    }
};
