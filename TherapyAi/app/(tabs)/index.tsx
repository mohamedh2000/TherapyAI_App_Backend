import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { Room } from 'livekit-client';

export default function HomeScreen() {
  const [roomName, setRoomName] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [status, setStatus] = useState('Not connected');
  const [room, setRoom] = useState<Room | null>(null);

  const connectToRoom = async () => {
    setStatus('Connecting...');
    const livekitRoom = new Room();
    setRoom(livekitRoom);

    // TODO: Replace with your actual LiveKit server URL and token
    const wsUrl = 'wss://stt-llm-tts-3cnt5csx.livekit.cloud'; // e.g., wss://your-livekit-cloud-url
    const token = await fetch('http://localhost:3000/getToken').then(res => res.text());

    try {
      await livekitRoom.connect(wsUrl, token );
      setStatus('Connected!');
    } catch (err: any) {
      setStatus('Connection failed: ' + err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>LiveKit Quick Connect</Text>
      <TextInput
        style={styles.input}
        placeholder="Room Name"
        value={roomName}
        onChangeText={setRoomName}
      />
      <TextInput
        style={styles.input}
        placeholder="Participant Name"
        value={participantName}
        onChangeText={setParticipantName}
      />
      <Button title="Connect" onPress={connectToRoom} />
      <Text style={styles.status}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  title: { fontSize: 24, marginBottom: 24 },
  input: { width: '100%', borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 12, borderRadius: 4 },
  status: { marginTop: 20, fontSize: 16 }
});