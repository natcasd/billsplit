import OpenAI from 'openai';
import { Bill, BillItem } from '@/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are a receipt analysis expert. Analyze the receipt image and extract the information in the following exact JSON structure:

{
  "items": [
    {
      "name": "string (item name)",
      "price": number (price per item),
      "quantity": number (quantity of items)
    }
  ],
  "subtotal": number (sum of all items before tax),
  "tax": number (tax amount, 0 if not present),
  "tip": number (tip amount, 0 if not present),
  "total": number (final total including tax and tip),
  "restaurantName": string (the name of the restaurant, or if not found, generate a plausible restaurant name),
  "isReceipt": boolean (true if the image is a valid picture of a receipt, false otherwise)
}

Rules:
- All monetary values must be numbers (not strings)
- Round all monetary values to 2 decimal places
- If an item has no explicit quantity, use 1
- If tax or tip is not present, use 0
- All prices must be positive numbers
- If unsure about a value, make your best estimate based on context
- The response must exactly match this structure
- Do not include any additional fields
- Do not include any explanatory text, only the JSON object`;

export async function analyzeReceipt(imageBase64: string, userPrompt?: string): Promise<Bill> {
  try {
    const userMessage: any[] = [
      { type: "text", text: "Analyze this receipt and return the data in the exact JSON structure specified." },
      ...(userPrompt ? [{ type: "text", text: userPrompt }] : []),
      {
        type: "image_url",
        image_url: {
          url: imageBase64,
          detail: "high"
        }
      }
    ];
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // or "gpt-4-vision-preview" if preferred
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: userMessage
        }
      ],
      max_tokens: 1000,
      response_format: { type: "json_object" }
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error("No response content");

    const parsed = JSON.parse(content);

    // Validation
    if (!Array.isArray(parsed.items)) throw new Error("Items must be an array");
    if (["subtotal", "tax", "tip", "total"].some(key => typeof parsed[key] !== "number")) {
      throw new Error("Numeric fields are missing or incorrectly typed");
    }
    if (typeof parsed.restaurantName !== "string") throw new Error("Missing restaurantName");
    if (typeof parsed.isReceipt !== "boolean") throw new Error("Missing isReceipt");

    const items: BillItem[] = parsed.items.map((item: any) => {
      if (!item.name || typeof item.price !== "number" || typeof item.quantity !== "number") {
        throw new Error("Invalid item format");
      }

      return {
        id: crypto.randomUUID(),
        name: item.name,
        price: parseFloat(item.price.toFixed(2)),
        quantity: Math.max(1, Math.round(item.quantity))
      };
    });

    return {
      items,
      subtotal: parseFloat(parsed.subtotal.toFixed(2)),
      tax: parseFloat(parsed.tax.toFixed(2)),
      tip: parseFloat(parsed.tip.toFixed(2)),
      total: parseFloat(parsed.total.toFixed(2)),
      taxDistribution: 'equal',
      tipDistribution: 'equal',
      restaurantName: parsed.restaurantName,
      isReceipt: parsed.isReceipt
    };
  } catch (err: any) {
    console.error("Error analyzing receipt:", err.message);
    throw new Error("Failed to analyze receipt");
  }
}
