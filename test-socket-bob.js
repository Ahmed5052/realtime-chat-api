// test-socket-bob.js
import { io } from 'socket.io-client';

const ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmMGQ2NjU4OC05Y2VlLTQ5NmEtYTcxZS1kODgwNTg1N2NkMzMiLCJpYXQiOjE3ODc1Njg4MTcsImV4cCI6MTc4NzU2OTcxN30.5BpNTfwic-ubD3Om3nsXlyytGG16TfpgMYgnAWQK3Xw';

const socket = io('http://localhost:3001', {
  auth: { token: ACCESS_TOKEN },
});

socket.on('connect', () => {
  console.log('✅ [Bob] connected to Instance B (3001)');
});

socket.on('message:receive', (message) => {
  console.log('📩 [Bob, via Instance B] received:', message.content);
});

socket.on('connect_error', (err) => {
  console.log('❌ [Bob] Connection failed:', err.message);
});

socket.on('presence:online', (data) => {
  console.log('🟢 [Bob, via Instance B] sees:', data.userId, 'came online');
});