import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getModelConfig } from "@/lib/ai-models";

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Simple RAG: Search knowledge base and add context
async function getRAGContext(userMessage) {
  try {
    // Simple text-based search (for production, use vector embeddings)
    const allKnowledge = await prisma.knowledge.findMany();
    const queryLower = userMessage.toLowerCase();
    const results = allKnowledge
      .filter(
        (k) =>
          k.title.toLowerCase().includes(queryLower) ||
          k.content.toLowerCase().includes(queryLower)
      )
      .slice(0, 5);
    
    if (results && results.length > 0) {
      const context = results
        .map((r) => `Title: ${r.title}\nContent: ${r.content}`)
        .join("\n\n");
      return `\n\nRelevant knowledge base context:\n${context}\n\nUse this context to provide accurate information.`;
    }
  } catch (error) {
    console.error("RAG search error:", error);
  }
  return "";
}

export async function POST(req) {
  try {
    const { messages, chatId, modelId = "gemini", useRAG = false } = await req.json();
    const modelConfig = getModelConfig(modelId);

    // Save user message to database
    if (chatId) {
      const lastUserMessage = messages[messages.length - 1];
      if (lastUserMessage.role === "user") {
        await prisma.message.create({
          data: {
            role: "user",
            content: lastUserMessage.content,
            chatId: chatId,
          },
        });
      }
    }

    // Get RAG context if enabled
    const lastUserMessage = messages[messages.length - 1];
    let ragContext = "";
    if (useRAG && lastUserMessage.role === "user") {
      ragContext = await getRAGContext(lastUserMessage.content);
    }

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

          // Prepare messages with RAG context
          const enhancedMessages = messages.map((msg, index) => {
            let content = msg.content || "";
            
            // If image is provided but no text, add a prompt to extract text
            if (msg.imageUrl && !content.trim()) {
              content = "Please extract and describe all text visible in this image. If there is any text, transcribe it exactly as it appears.";
            }
            
            // Add RAG context to the last user message
            if (index === messages.length - 1 && msg.role === "user" && ragContext) {
              content = content + ragContext;
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
            };
          });

          if (modelConfig.provider === "gemini") {
            if (!process.env.GEMINI_API_KEY) {
              throw new Error("GEMINI_API_KEY is not set in environment variables");
            }

            // Use v1beta API with the configured model
            // Extract model name (remove 'models/' prefix if present)
            const modelName = modelConfig.model.replace(/^models\//, '');
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?key=${process.env.GEMINI_API_KEY}`;
            
            const res = await fetch(apiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: enhancedMessages,
              }),
            });

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
                errorMessage += "\n2. Make sure 'gemini-pro' model is available in your region";
                errorMessage += "\n3. Try using a different API key or check your quota";
              } else if (res.status === 401 || res.status === 403) {
                errorMessage += "\n\nYour API key may be invalid or expired. Please check your .env file.";
              }
              
              throw new Error(errorMessage);
            }

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
          } else {
            throw new Error(`Unsupported provider: ${modelConfig.provider}`);
          }

          // Save assistant response to database
          if (chatId && fullResponse) {
            await prisma.message.create({
              data: {
                role: "assistant",
                content: fullResponse,
                chatId: chatId,
              },
            });
          }

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

