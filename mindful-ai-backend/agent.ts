// SPDX-FileCopyrightText: 2024 LiveKit, Inc.
//
// SPDX-License-Identifier: Apache-2.0
import {
  type JobContext,
  WorkerOptions,
  cli,
  defineAgent,
  llm,
  multimodal,
} from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'crypto';
import { Pool } from 'pg';
import { OpenAI as OpenAIClient } from 'openai';

if (typeof globalThis.crypto === 'undefined') {
  // @ts-ignore
  globalThis.crypto = crypto;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../.env');
const openApiKey = process.env.OPENAI_API_KEY;
dotenv.config({ path: envPath });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5433/mindful_ai",
});

export default defineAgent({
  entry: async (ctx: JobContext) => {
    let userId: string | null = null;
    let session: any = null;

    await ctx.connect();
    console.log('waiting for participant');

    ctx.room.on('dataReceived', (payload, participant) => {
      console.log('Data packet received from participant:', participant?.identity);
      const decodedData = new TextDecoder().decode(payload);
      console.log('Decoded data:', decodedData);
      try {
        const data = JSON.parse(decodedData);
        console.log('Parsed data:', data);
        if (data.type === 'user_embeddings') {
          userId = data.userId;
          console.log('Received userId:', userId);
        } else {
          console.log('Received data packet with type:', data.type);
        }
      } catch (error) {
        console.error('Failed to parse data packet:', error);
      }
    });

    const participant = await ctx.waitForParticipant();
    console.log(`starting assistant example agent for ${participant.identity}`);

    // Extract userId from room name (only if not already set from data packets)
    const roomName = ctx.room.name;
    console.log('Room name:', roomName);

    if (!userId && roomName) {
      const roomNameParts = roomName.split('_');
      console.log('Room name parts:', roomNameParts);

      if (roomNameParts.length >= 5) {
        // Format: voice_assistant_room_user_2yQ4fSA5eG6mHquGGyqa7b91cKX_5716
        // We want to extract: user_2yQ4fSA5eG6mHquGGyqa7b91cKX
        // Skip: voice, assistant, room (first 3 parts)
        // Take: everything from index 3 to second-to-last
        const userIdParts = roomNameParts.slice(3, -1);
        userId = userIdParts.join('_');
        console.log('Extracted userId from room name:', userId);
      } else {
        console.log('Could not extract userId from room name - insufficient parts:', roomName);
      }
    } else if (userId) {
      console.log('Using userId from data packets:', userId);
    } else {
      console.log('No userId available from room name or data packets');
    }

    console.log('Agent ready to provide dynamic context based on user input');

    const contextInstructions = `You are a helpful therapist.`;

    const model = new openai.realtime.RealtimeModel({
      instructions: contextInstructions,
      model: "gpt-4o-realtime-preview-2024-10-01",
      apiKey: openApiKey
    });

    const agent = new multimodal.MultimodalAgent({ model });

    console.log('Starting agent session...');
    session = await agent
      .start(ctx.room, participant)
      .then((session) => session as openai.realtime.RealtimeSession);

    console.log('Agent session started, creating initial message...');

    // Debug session object
    console.log('Session object type:', typeof session);
    console.log('Session object keys:', Object.keys(session));
    console.log('Session conversation:', session.conversation);

    // Set up the correct event handlers for the RealtimeSession
    if (session) {
      console.log('Setting up RealtimeSession event handlers...');

      // Listen for input speech transcription completed events
      session.on('input_speech_transcription_completed', async (event: any) => {
        console.log('=== INPUT SPEECH TRANSCRIPTION COMPLETED ===', event);

        if (event.transcript && userId) {
          const userInput = event.transcript.trim();
          console.log('🎯 SPEECH TRANSCRIPTION: Processing user message for context injection');
          console.log('📝 User input:', userInput);
          console.log('👤 User ID:', userId);

          // Only process substantial messages
          if (userInput.length > 3 && !userInput.toLowerCase().includes('hello') && !userInput.toLowerCase().includes('hi')) {
            try {
              console.log('🔍 Creating embedding for user input...');
              const embeddingResponse = await new OpenAIClient({ apiKey: openApiKey }).embeddings.create({
                model: 'text-embedding-3-small',
                input: userInput,
              });
              const inputEmbedding = embeddingResponse.data[0].embedding;
              console.log('✅ Created embedding for input, length:', inputEmbedding.length);

              console.log('🔍 Querying database for similar session embeddings...');
              const { rows } = await pool.query(
                'SELECT session_transcript, session_summary FROM user_sessions WHERE user_id = $1 AND embedding IS NOT NULL ORDER BY embedding <-> $2 LIMIT 3',
                [userId, `[${inputEmbedding.join(',')}]`]
              );

              console.log('📊 Found relevant sessions:', rows.length);

              if (rows.length > 0) {
                // Process session transcripts
                const relevantContexts = rows.map((row, index) => {
                  let transcript = '';
                  let summary = '';

                  // Parse session transcript if available
                  if (row.session_transcript) {
                    try {
                      // First, try to parse as a JSON array
                      const transcriptArray = JSON.parse(row.session_transcript);
                      if (Array.isArray(transcriptArray)) {
                        transcript = transcriptArray.map((item: string) => {
                          try {
                            const parsed = JSON.parse(item);
                            return `${parsed.from}: ${parsed.text}`;
                          } catch (e: any) {
                            // If individual item parsing fails, just return the raw item
                            return item;
                          }
                        }).join('\n');
                      } else {
                        // If it's not an array, treat it as a single string
                        transcript = row.session_transcript;
                      }
                    } catch (e: any) {
                      console.log('Could not parse session transcript as JSON, using raw data:', e.message);
                      // If JSON parsing fails, just use the raw transcript data
                      transcript = row.session_transcript;
                    }
                  }

                  // Parse session summary if available
                  if (row.session_summary) {
                    try {
                      const summaryObj = JSON.parse(row.session_summary);
                      summary = Object.values(summaryObj).join(', ');
                    } catch (e) {
                      summary = row.session_summary;
                    }
                  }

                  return {
                    index: index + 1,
                    transcript,
                    summary
                  };
                });

                console.log('📋 Relevant contexts found:', relevantContexts.length);

                // Create simple context text with just the transcripts
                const contextText = `Based on your previous conversations, here is relevant context that might help me understand your current situation better:

${relevantContexts.map(ctx => {
                  let context = `Session ${ctx.index}:\n`;
                  if (ctx.summary) {
                    context += `Summary: ${ctx.summary}\n`;
                  }
                  if (ctx.transcript) {
                    context += `Previous conversation:\n${ctx.transcript}\n`;
                  }
                  return context;
                }).join('\n')}

Please use this context to provide more personalized and relevant responses.`;

                console.log("💉 SPEECH TRANSCRIPTION: INJECTING CONTEXT FOR LLM");
                console.log("📝 Context being injected:", contextText.substring(0, 200) + "...");

                // Inject context by creating a system message
                try {
                  await session.conversation.item.create(llm.ChatMessage.create({
                    role: llm.ChatRole.SYSTEM,
                    text: contextText
                  }));
                  console.log("✅ Speech transcription context injection completed successfully!");
                } catch (injectionError) {
                  console.error('❌ Error injecting context into conversation:', injectionError);
                }
              } else {
                console.log('❌ No relevant sessions found for user:', userId);
              }
            } catch (error) {
              console.error('❌ Error in speech transcription meaningful context injection:', error);
            }
          } else {
            console.log('❌ User input does not meet criteria for context injection');
          }
        }
      });

      // Listen for other session events for debugging
      session.on('input_speech_started', (event: any) => {
        console.log('=== INPUT SPEECH STARTED ===', event);
      });

      session.on('input_speech_committed', (event: any) => {
        console.log('=== INPUT SPEECH COMMITTED ===', event);
      });

      session.on('response_content_added', (event: any) => {
        console.log('=== RESPONSE CONTENT ADDED ===', event);
      });

      session.on('response_done', (event: any) => {
        console.log('=== RESPONSE DONE ===', event);
      });
    }
  },
});

cli.runApp(new WorkerOptions({ agent: fileURLToPath(import.meta.url) }));
