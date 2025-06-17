import { AccessToken, AccessTokenOptions, VideoGrant } from "livekit-server-sdk";
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { Pool } from "pg";
dotenv.config();

// NOTE: you are expected to define the following environment variables in `.env.local`:
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // or use user, password, host, port, database
});

export type ConnectionDetails = {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
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

app.get('/api/connection-details', async (req, res) => {
  try {
    if (LIVEKIT_URL === undefined) {
      throw new Error("LIVEKIT_URL is not defined");
    }
    if (API_KEY === undefined) {
      throw new Error("LIVEKIT_API_KEY is not defined");
    }
    if (API_SECRET === undefined) {
      throw new Error("LIVEKIT_API_SECRET is not defined");
    }

    // Generate participant token
    const participantIdentity = `voice_assistant_user_${Math.floor(Math.random() * 10_000)}`;
    const roomName = `voice_assistant_room_${Math.floor(Math.random() * 10_000)}`;
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
    };
    const headers = new Headers({
      "Cache-Control": "no-store",
      'Access-Control-Allow-Origin': '*',
    });
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(data);
  } catch (error) {
    if (error instanceof Error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }
});

app.post('/api/user', async (req, res) => {
  let userId = req?.body?.userId; 
  const sessionData = await pool.query('SELECT * FROM USER_SESSIONS WHERE user_id = $1', [userId]);
  const userData = await pool.query('SELECT * FROM USERS WHERE id = $1', [userId]);

  res.status(200).json({ sessionData: sessionData.rows, userData: userData.rows });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
