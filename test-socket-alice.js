// test-socket-alice.js
import { io } from 'socket.io-client';

const ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyZjJhNjUzYi1iMzdjLTRiOTktOWJjZS0wZTdmZDY2Y2NkYTciLCJpYXQiOjE3ODc1Njg3NjAsImV4cCI6MTc4NzU2OTY2MH0.u-YUezaDPuljnrspttqpprRTICQlFFySze8Zn10UHjo';
const CONVERSATION_ID = '24f44438-fa2a-485e-a8cc-a68e3321f8d2';

const socket = io('http://localhost:3000', {
  auth: { token: ACCESS_TOKEN },
});

socket.on('connect', () => {
  console.log('✅ [Alice] connected to Instance A (3000)');

  setTimeout(() => {
    socket.emit(
      'message:send',
      { conversationId: CONVERSATION_ID, content: 'Cross-instance test!' },
      (response) => {
        console.log('Alice send ack:', response);
      }
    );
  }, 1000);
});

socket.on('connect_error', (err) => {
  console.log('❌ [Alice] Connection failed:', err.message);
});