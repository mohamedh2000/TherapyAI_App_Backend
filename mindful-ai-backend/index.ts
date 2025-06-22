import { AccessToken, AccessTokenOptions, VideoGrant } from "livekit-server-sdk";
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { Pool } from "pg";
import OpenAI from "openai";
dotenv.config();

// NOTE: you are expected to define the following environment variables in `.env.local`:
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const client = new OpenAI({apiKey: OPENAI_API_KEY});
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5433/mindful_ai", // Updated to use Docker PostgreSQL
});

export type ConnectionDetails = {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
  embeddings: any[];
};

function createParticipantToken(userInfo: AccessTokenOptions, roomName: string) {
  const at = new AccessToken(API_KEY, API_SECRET, {
    ...userInfo,
    ttl: "15m",
  });
  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  };
  at.addGrant(grant);
  return at.toJwt();
}

app.post('/api/connection-details', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
    }

    if (LIVEKIT_URL === undefined) {
      throw new Error("LIVEKIT_URL is not defined");
    }
    if (API_KEY === undefined) {
      throw new Error("LIVEKIT_API_KEY is not defined");
    }
    if (API_SECRET === undefined) {
      throw new Error("LIVEKIT_API_SECRET is not defined");
    }

    // Fetch embeddings
    const embeddingsResult = await pool.query(
      'SELECT embedding FROM user_sessions WHERE user_id = $1',
      [userId]
    );
    const embeddings = embeddingsResult.rows.map(row => row.embedding);

    // Generate participant token
    const participantIdentity = `voice_assistant_user_${Math.floor(Math.random() * 10_000)}`;
    const roomName = `voice_assistant_room_${userId}_${Math.floor(Math.random() * 10_000)}`;
    const participantToken = await createParticipantToken(
      { identity: participantIdentity },
      roomName
    );

    // Return connection details
    const data: ConnectionDetails = {
      serverUrl: LIVEKIT_URL,
      roomName,
      participantToken: participantToken,
      participantName: participantIdentity,
      embeddings: embeddings,
    };
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(data);
  } catch (error) {
    if (error instanceof Error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }
});

app.post('/api/save-transcript', async (req, res) => {
  const { transcript, userId, sessionDuration } = req.body;
  // Save transcript to database, file, or process as needed
  // Example: just log it
  console.log('Received transcript:', transcript);
  console.log('Received userId:', userId);
  console.log('Received sessionDuration:', sessionDuration);

  const prompt = `here is a transcript of a session between a person and their therapist: ${JSON.stringify(transcript)}.` +
    `Can you please analyze the transcript and give me a sentiment of positive, netural or challenging.` +
    `Also give me a list of two subjects spoken about mainly in the transcript. Have the answers formatted in a json object.`;
    
  const sessionAnalysis = await client.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }]
  });
  
  const content = sessionAnalysis.choices[0].message.content;
  if (!content) {
    throw new Error("No response content received from OpenAI");
  }
  
  let sessionAnalysisJson;
  try {
    sessionAnalysisJson = JSON.parse(content);
  } catch (error) {
    console.error('Failed to parse OpenAI response as JSON:', content);
    // Fallback to default values
    sessionAnalysisJson = {
      sentiment: 'neutral',
      main_subjects: ['general discussion']
    };
  }

  const sentiment = (sessionAnalysisJson.sentiment || 'neutral').toLowerCase();
  const subjects = sessionAnalysisJson.main_subjects || ['general discussion'];

  const embedding = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: prompt
  });

  // Convert embedding to proper vector format for pgvector
  const embeddingArray = embedding.data[0].embedding;
  console.log('Embedding type:', typeof embeddingArray);
  console.log('Embedding length:', embeddingArray.length);
  
  // Format embedding as pgvector expects: '[1,2,3,...]'
  const embeddingString = `[${embeddingArray.join(',')}]`;

  try {
    const result = await pool.query(
      'INSERT INTO user_sessions (user_id, session_date, total_time_minutes, session_rating, session_summary, session_transcript, embedding) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', 
      [userId, new Date(), sessionDuration, sentiment, subjects, transcript, embeddingString]
    );

    if (result?.rowCount && result.rowCount > 0) {
      console.log('Successfully inserted session:', result.rows[0]);
      res.status(200).json({ success: true, session: result.rows[0] });
    } else {
      console.error('INSERT failed, no rows were returned.');
      res.status(500).json({ success: false, message: 'Failed to save session.' });
    }
  } catch (error) {
    console.error('Error inserting session into database:', error);
    res.status(500).json({ success: false, message: 'Database insert error.' });
  }
});

app.post('/api/user', async (req, res) => {
  let userId = req?.body?.userId;
  
  // Check if user exists, if not create them
  try {
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      // User doesn't exist, create them
      await pool.query(
        'INSERT INTO users (id, full_name, email) VALUES ($1, $2, $3)',
        [userId, 'User', `${userId}@example.com`]
      );
      console.log('Created new user:', userId);
    }
  } catch (error) {
    console.error('Error checking/creating user:', error);
  }

  const sessionData = await pool.query('SELECT * FROM USER_SESSIONS WHERE user_id = $1', [userId]);
  const userData = await pool.query('SELECT * FROM USERS WHERE id = $1', [userId]);

  res.status(200).json({ sessionData: sessionData.rows, userData: userData.rows });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
