import request from 'supertest';
import app from '../../src/app.js';
import { prisma } from '../../src/config/database.js';
import { createTestUser } from '../helpers/testAuth.js';

describe('Messages', () => {
  let alice, bob, stranger, conversationId;

  beforeAll(async () => {
    alice = await createTestUser();
    bob = await createTestUser();
    stranger = await createTestUser();

    const convRes = await request(app)
      .post('/conversations')
      .set('Authorization', `Bearer ${alice.accessToken}`)
      .send({ participantIds: [bob.user.id], isGroup: false });

    conversationId = convRes.body.conversation.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: '@integrationtest.com' } },
    });
    await prisma.$disconnect();
  });

  it('should send a message as a participant', async () => {
    const response = await request(app)
      .post(`/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${alice.accessToken}`)
      .send({ content: 'Hello Bob!' });

    expect(response.status).toBe(201);
    expect(response.body.message.content).toBe('Hello Bob!');
    expect(response.body.message.senderId).toBe(alice.user.id);
  });

  it('should reject sending a message as a non-participant', async () => {
    const response = await request(app)
      .post(`/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${stranger.accessToken}`)
      .send({ content: 'I should not be able to send this' });

    expect(response.status).toBe(403);
  });

  it('should reject empty message content', async () => {
    const response = await request(app)
      .post(`/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${alice.accessToken}`)
      .send({ content: '' });

    expect(response.status).toBe(400);
  });

  it('should fetch messages for a participant', async () => {
    const response = await request(app)
      .get(`/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${bob.accessToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.messages)).toBe(true);
    expect(response.body.messages.length).toBeGreaterThan(0);
  });

  it('should reject fetching messages as a non-participant', async () => {
    const response = await request(app)
      .get(`/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${stranger.accessToken}`);

    expect(response.status).toBe(403);
  });

  describe('edit and delete', () => {
    let messageId;

    beforeAll(async () => {
      const res = await request(app)
        .post(`/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${alice.accessToken}`)
        .send({ content: 'Original content' });

      messageId = res.body.message.id;
    });

    it('should allow the sender to edit their own message', async () => {
    const response = await request(app)
        .patch(`/conversations/messages/${messageId}`) 
        .set('Authorization', `Bearer ${alice.accessToken}`)
        .send({ content: 'Edited content' });

    expect(response.status).toBe(200);
    expect(response.body.message.content).toBe('Edited content');
    expect(response.body.message.edited).toBe(true);
    });

    it('should reject editing by a non-sender', async () => {
    const response = await request(app)
        .patch(`/conversations/messages/${messageId}`) 
        .set('Authorization', `Bearer ${bob.accessToken}`)
        .send({ content: "Trying to edit someone else's message" });

    expect(response.status).toBe(403);
    });

    it('should reject deleting by a non-sender', async () => {
    const response = await request(app)
        .delete(`/conversations/messages/${messageId}`) 
        .set('Authorization', `Bearer ${bob.accessToken}`);

    expect(response.status).toBe(403);
    });

    it('should allow the sender to delete their own message', async () => {
    const response = await request(app)
        .delete(`/conversations/messages/${messageId}`) 
        .set('Authorization', `Bearer ${alice.accessToken}`);

    expect(response.status).toBe(204);
    });

    it('should return 404 when deleting an already-deleted message', async () => {
    const response = await request(app)
        .delete(`/conversations/messages/${messageId}`)   
        .set('Authorization', `Bearer ${alice.accessToken}`);

    expect(response.status).toBe(404);
    });
  });
});