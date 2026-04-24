import { NextResponse } from "next/server";
import {
  getModelConfig,
  OPENROUTER_FREE_FALLBACK_MODELS,
  OPENROUTER_VISION_FALLBACK_MODELS,
} from "@/lib/ai-models";

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';

function decodeHtmlEntities(text = "") {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSearchResultLink(rawLink = "") {
  try {
    const decoded = decodeHtmlEntities(rawLink);
    const withProtocol = decoded.startsWith("//") ? `https:${decoded}` : decoded;
    const url = new URL(withProtocol);
    const uddg = url.searchParams.get("uddg");
    if (uddg) {
      return decodeURIComponent(uddg);
    }
    return withProtocol;
  } catch {
    return decodeHtmlEntities(rawLink);
  }
}

async function fetchWebContext(query) {
  const trimmed = (query || "").trim();
  if (!trimmed) return "";

  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(trimmed)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!res.ok) return "";
    const html = await res.text();
    const resultRegex =
      /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;

    const items = [];
    let match;
    while ((match = resultRegex.exec(html)) !== null && items.length < 5) {
      const link = normalizeSearchResultLink(match[1] || "");
      const title = decodeHtmlEntities((match[2] || "").replace(/<[^>]+>/g, ""));
      const snippet = decodeHtmlEntities((match[3] || "").replace(/<[^>]+>/g, ""));
      if (title && snippet) {
        items.push({ title, snippet, link });
      }
    }

    if (items.length === 0) return "";

    const lines = items
      .map(
        (item, i) =>
          `${i + 1}. ${item.title}\nSnippet: ${item.snippet}\nSource: ${item.link}`
      )
      .join("\n\n");

    return `\n\nLive web search context:\n${lines}\n`;
  } catch (error) {
    console.error("Web context fetch failed:", error);
    return "";
  }
}

/**
 * Converts an internal message (with optional Gemini-style `parts` array and
 * raw `imageUrl` data-URL) into an OpenAI-compatible message object.
 *
 * Text-only  → { role, content: "string" }
 * With image → { role, content: [ {type:"text",...}, {type:"image_url",...} ] }
 */
function buildOpenRouterMessage(msg) {
  const role = msg.role === "model" ? "assistant" : msg.role;
  const text = msg.parts?.[0]?.text ?? "";

  // Check if the original message had an image attached (carried via parts or
  // the raw imageUrl property — both paths are possible depending on when in
  // the pipeline this is called).
  const imageUrl = msg.imageUrl || msg.parts?.find((p) => p.image_url)?.image_url?.url || null;

  // Also check for inline_data (Gemini format inside parts)
  const inlineData = msg.parts?.find((p) => p.inline_data);

  if (!imageUrl && !inlineData) {
    // Text-only — keep content as a plain string for maximum compatibility.
    return { role, content: text || " " };
  }

  const contentParts = [];

  if (text) {
    contentParts.push({ type: "text", text });
  }

  if (imageUrl) {
    // imageUrl is a data: URI or an https:// URL — both work for OpenRouter.
    contentParts.push({ type: "image_url", image_url: { url: imageUrl } });
  } else if (inlineData) {
    // Convert Gemini inline_data back to a data: URI for OpenRouter.
    const dataUri = `data:${inlineData.mime_type};base64,${inlineData.data}`;
    contentParts.push({ type: "image_url", image_url: { url: dataUri } });
  }

  return { role, content: contentParts };
}

export async function POST(req) {
  try {
    const {
      messages,
      modelId = "openrouter-gpt-oss-120b",
      ragContext = "",
      useWeb = true,
    } = await req.json();
    const modelConfig = getModelConfig(modelId);

    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = "";
          let hasReceivedData = false;

          // Helper function to parse data URL and extract base64 + mime type
          function parseDataUrl(dataUrl) {
            if (!dataUrl || !dataUrl.startsWith("data:")) {
              return null;
            }
            const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              return {
                mimeType: match[1],
                base64Data: match[2],
              };
            }
            return null;
          }

          const lastUserMessage = [...messages]
            .reverse()
            .find((msg) => msg.role === "user" && (msg.content || "").trim());
          const webContext = useWeb
            ? await fetchWebContext(lastUserMessage?.content || "")
            : "";

          // Prepare messages with RAG/web context
          const enhancedMessages = messages.map((msg, index) => {
            let content = msg.content || "";
            
            // If image is provided but no text, add a prompt to extract text
            if (msg.imageUrl && !content.trim()) {
              content = "Please extract and describe all text visible in this image. If there is any text, transcribe it exactly as it appears.";
            }
            
            // Add RAG + web context to the last user message.
            if (index === messages.length - 1 && msg.role === "user") {
              if (ragContext) content += ragContext;
              if (webContext) {
                content += webContext;
                content +=
                  "\n\nWeb-grounding rules (strict):" +
                  "\n1) Use only facts present in the live web context above." +
                  "\n2) If a requested detail is missing or conflicting, explicitly say it is not verified from current sources." +
                  "\n3) Do not invent scorecards, player stats, schedules, or quotes." +
                  "\n4) End with a short 'Sources:' list using only the provided source URLs.";
              }
            }
            
            // Handle image data
            const parts = [{ text: content }];
            if (msg.imageUrl) {
              const imageData = parseDataUrl(msg.imageUrl);
              if (imageData) {
                parts.push({
                  inline_data: {
                    mime_type: imageData.mimeType,
                    data: imageData.base64Data,
                  },
                });
              }
            }
            
            return {
              role: msg.role === "user" ? "user" : "model",
              parts: parts,
              // Preserve the raw imageUrl so buildOpenRouterMessage can read it
              // without needing to re-decode inline_data back to a data URI.
              imageUrl: msg.imageUrl || null,
            };
          });

          if (modelConfig.provider === "gemini") {
            if (!process.env.GEMINI_API_KEY) {
              throw new Error("GEMINI_API_KEY is not set in environment variables");
            }

            // Use v1beta API with the configured model
            // Extract model name (remove 'models/' prefix if present)
            let modelName = modelConfig.model.replace(/^models\//, "");
            let fallbackUsed = false;
            const makeGeminiRequest = async (targetModelName) => {
              const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${targetModelName}:streamGenerateContent?key=${process.env.GEMINI_API_KEY}`;
              return fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  // Gemini only accepts role + parts — strip imageUrl and other extra fields.
                  contents: enhancedMessages.map(({ role, parts }) => ({ role, parts })),
                }),
              });
            };
            const geminiModelsToTry = [
              modelName,
              "gemini-2.5-flash",
              "gemini-2.0-flash",
            ].filter((m, i, arr) => arr.indexOf(m) === i);

            let res = await makeGeminiRequest(geminiModelsToTry[0]);
            for (let i = 1; !res.ok && i < geminiModelsToTry.length; i++) {
              // Retry on overload/quota/transient failures.
              if (res.status === 429 || res.status === 503 || res.status >= 500) {
                modelName = geminiModelsToTry[i];
                fallbackUsed = true;
                res = await makeGeminiRequest(modelName);
                continue;
              }
              break;
            }

            // When Gemini free tier is exhausted, fall back to OpenRouter (same key as standalone chat).
            let usedOpenRouterFromGemini = false;
            if (!res.ok && process.env.OPENROUTER_API_KEY) {
              const retryable =
                res.status === 429 || res.status === 503 || res.status >= 500;
              if (retryable) {
                const orModels = OPENROUTER_FREE_FALLBACK_MODELS;
                const makeOpenRouterRequest = async (targetModel) =>
                  fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                      "HTTP-Referer": "http://localhost:3000",
                      "X-Title": "Hermes AI",
                    },
                    body: JSON.stringify({
                      model: targetModel,
                      stream: true,
                      messages: enhancedMessages.map((msg) => buildOpenRouterMessage(msg)),
                    }),
                  });
                for (const m of orModels) {
                  const orRes = await makeOpenRouterRequest(m);
                  if (orRes.ok) {
                    res = orRes;
                    usedOpenRouterFromGemini = true;
                    break;
                  }
                }
              }
            }

            if (!res.ok) {
              const errorText = await res.text();
              let errorMessage = `Gemini API error: ${res.status}`;
              
              try {
                const errorData = JSON.parse(errorText);
                if (errorData.error) {
                  errorMessage += ` - ${errorData.error.message || errorData.error.code}`;
                } else {
                  errorMessage += ` - ${errorText}`;
                }
              } catch {
                errorMessage += ` - ${errorText}`;
              }
              
              // Provide helpful error message
              if (res.status === 404) {
                errorMessage += "\n\nPossible solutions:";
                errorMessage += "\n1. Check if your API key is valid at https://makersuite.google.com/app/apikey";
                errorMessage += "\n2. Make sure the selected model is available in your region";
                errorMessage += "\n3. Try using a different API key or check your quota";
              } else if (res.status === 401 || res.status === 403) {
                errorMessage += "\n\nYour API key may be invalid or expired. Please check your .env file.";
              } else if (res.status === 429) {
                errorMessage +=
                  "\n\nGemini free-tier quota may be exhausted. Add OPENROUTER_API_KEY for automatic fallback, or wait and retry.";
              }
              
              throw new Error(errorMessage);
            }

            // OpenRouter returns SSE text deltas; Gemini returns JSON array chunks.
            if (usedOpenRouterFromGemini) {
              const reader = res.body.getReader();
              const decoder = new TextDecoder();
              let buffer = "";

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                  if (!line.startsWith("data: ")) continue;
                  const payload = line.slice(6).trim();
                  if (!payload || payload === "[DONE]") continue;
                  try {
                    const data = JSON.parse(payload);
                    const text = data?.choices?.[0]?.delta?.content || "";
                    if (text) {
                      hasReceivedData = true;
                      fullResponse += text;
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                    }
                  } catch {
                    // ignore
                  }
                }
              }
            } else {
            // Gemini streaming returns an array of JSON objects: [{...},\r\n{...}]
            // We need to parse each complete object as it arrives
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let inArray = false; // Track if we're inside the array

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              if (value) {
                hasReceivedData = true;
                buffer += decoder.decode(value, { stream: true });
                
                // Process complete JSON objects from buffer
                // Objects are separated by ",\r\n" or ",\n"
                while (true) {
                  // Find the end of a complete JSON object
                  // Look for: } followed by ,\r\n or ,\n or ]
                  let objEnd = -1;
                  let separator = "";
                  
                  // Check for },\r\n
                  const match1 = buffer.match(/}(,\r\n)/);
                  if (match1) {
                    objEnd = match1.index + 1;
                    separator = match1[1];
                  } else {
                    // Check for },\n
                    const match2 = buffer.match(/}(,\n)/);
                    if (match2) {
                      objEnd = match2.index + 1;
                      separator = match2[1];
                    } else {
                      // Check for }] (end of array)
                      const match3 = buffer.match(/}(\])/);
                      if (match3) {
                        objEnd = match3.index + 1;
                        separator = match3[1];
                      }
                    }
                  }
                  
                  if (objEnd > 0) {
                    try {
                      // Extract JSON object
                      let jsonStr = buffer.substring(0, objEnd + 1);
                      
                      // Remove leading [ if this is the first object
                      if (!inArray && jsonStr.trim().startsWith("[")) {
                        jsonStr = jsonStr.trim().substring(1);
                        inArray = true;
                      }
                      
                      // Remove trailing comma if present
                      jsonStr = jsonStr.trim().replace(/,$/, "");
                      
                      if (jsonStr.trim()) {
                        const data = JSON.parse(jsonStr);
                        
                        // Check for errors
                        if (data.error) {
                          throw new Error(`Gemini API error: ${JSON.stringify(data.error)}`);
                        }
                        
                        // Extract text
                        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                        
                        if (text) {
                          fullResponse += text;
                          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                        }
                      }
                      
                      // Remove processed object and separator from buffer
                      buffer = buffer.substring(objEnd + 1 + separator.length);
                    } catch (e) {
                      // Object might not be complete yet, wait for more data
                      break;
                    }
                  } else {
                    // No complete object found yet
                    break;
                  }
                }
              }
            }

            // Process any remaining buffer
            if (buffer.trim()) {
              try {
                let jsonStr = buffer.trim();
                
                // Handle array format
                if (jsonStr.startsWith("[")) {
                  jsonStr = jsonStr.substring(1);
                }
                if (jsonStr.endsWith("]")) {
                  jsonStr = jsonStr.substring(0, jsonStr.length - 1);
                }
                jsonStr = jsonStr.trim().replace(/,$/, "");
                
                if (jsonStr) {
                  // Try to parse as single object or array
                  let data;
                  try {
                    data = JSON.parse(jsonStr);
                  } catch {
                    // Might be incomplete, try wrapping in array
                    data = JSON.parse("[" + jsonStr + "]");
                  }
                  
                  const items = Array.isArray(data) ? data : [data];
                  
                  for (const item of items) {
                    if (item?.error) {
                      throw new Error(`Gemini API error: ${JSON.stringify(item.error)}`);
                    }
                    
                    const text = item?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                    if (text) {
                      fullResponse += text;
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                    }
                  }
                }
              } catch (e) {
                // Final buffer might be incomplete, that's okay
                console.log("Final buffer parse (usually fine if empty):", e.message);
              }
            }
            }
          } else if (modelConfig.provider === "openrouter") {
            if (!process.env.OPENROUTER_API_KEY) {
              throw new Error("OPENROUTER_API_KEY is not set in environment variables");
            }

            // Detect whether any message in this turn carries an image
            const hasImage = messages.some((m) => !!m.imageUrl);

            // If the selected model doesn't support vision but user attached an image,
            // prepend free vision models to the fallback list so the first capable
            // model is tried instead.
            const openRouterModelsToTry = (
              hasImage && !modelConfig.supportsVision
                ? [...OPENROUTER_VISION_FALLBACK_MODELS, modelConfig.model]
                : [modelConfig.model, ...OPENROUTER_FREE_FALLBACK_MODELS]
            ).filter((m, i, arr) => arr.indexOf(m) === i);

            const makeOpenRouterRequest = async (targetModel) =>
              fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                  "HTTP-Referer": "http://localhost:3000",
                  "X-Title": "Hermes AI",
                },
                body: JSON.stringify({
                  model: targetModel,
                  stream: true,
                  messages: enhancedMessages.map((msg) => buildOpenRouterMessage(msg)),
                }),
              });

            let selectedOpenRouterModel = openRouterModelsToTry[0];
            let res = await makeOpenRouterRequest(selectedOpenRouterModel);
            let openRouterFallbackUsed = false;
            let lastOpenRouterErrorText = "";

            for (let i = 1; !res.ok && i < openRouterModelsToTry.length; i++) {
              // Retry with another free model for provider overload/rate-limit scenarios.
              if (res.status === 429 || res.status >= 500) {
                lastOpenRouterErrorText = await res.text();
                selectedOpenRouterModel = openRouterModelsToTry[i];
                openRouterFallbackUsed = true;
                res = await makeOpenRouterRequest(selectedOpenRouterModel);
                continue;
              }
              break;
            }

            if (!res.ok) {
              const errorText = (await res.text()) || lastOpenRouterErrorText;
              let errorMessage = `OpenRouter API error: ${res.status}`;
              try {
                const errorData = JSON.parse(errorText);
                errorMessage += ` - ${errorData?.error?.message || errorText}`;
              } catch {
                errorMessage += ` - ${errorText}`;
              }
              if (res.status === 429) {
                errorMessage += "\n\nAll configured free OpenRouter models are currently rate-limited or overloaded.";
              }
              throw new Error(errorMessage);
            }

            // Keep fallback transparent for reliability without showing a system banner.

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                const payload = line.slice(6).trim();
                if (!payload || payload === "[DONE]") continue;
                try {
                  const data = JSON.parse(payload);
                  const text = data?.choices?.[0]?.delta?.content || "";
                  if (text) {
                    hasReceivedData = true;
                    fullResponse += text;
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                  }
                } catch {
                  // Ignore malformed partial lines.
                }
              }
            }
          } else {
            throw new Error(`Unsupported provider: ${modelConfig.provider}`);
          }

          // Messages are now saved on the client side using IndexedDB

          // Only throw error if we truly got nothing (not even partial responses)
          if (fullResponse === "") {
            if (hasReceivedData) {
              throw new Error("Received response from AI but couldn't parse it. Check server logs for details.");
            } else {
              throw new Error("No response received from AI model. Please check your API keys and model availability.");
            }
          }

          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          const errorMessage = error.message || "An error occurred while generating the response";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Streaming error:", error);
    return NextResponse.json({ error: "Streaming failed" }, { status: 500 });
  }
}

