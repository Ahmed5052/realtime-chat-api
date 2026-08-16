import request from 'supertest';
import app from '../../src/app.js';
import { prisma } from '../../src/config/database.js';
import { createTestUser } from '../helpers/testAuth.js';

describe('Conversations', () => {
  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: '@integrationtest.com' } },
    });
    await prisma.$disconnect();
  });

  it('should create a 1-to-1 conversation between two users', async () => {
    const alice = await createTestUser();
    const bob = await createTestUser();

    const response = await request(app)
      .post('/conversations')
      .set('Authorization', `Bearer ${alice.accessToken}`)
      .send({ participantIds: [bob.user.id], isGroup: false });

    expect(response.status).toBe(201);
    expect(response.body.conversation.isGroup).toBe(false);
    expect(response.body.conversation.participants).toHaveLength(2);
  });

  it('should return the SAME conversation when creating a duplicate 1-to-1 pair', async () => {
    const alice = await createTestUser();
    const bob = await createTestUser();

    const first = await request(app)
      .post('/conversations')
      .set('Authorization', `Bearer ${alice.accessToken}`)
      .send({ participantIds: [bob.user.id], isGroup: false });

    const second = await request(app)
      .post('/conversations')
      .set('Authorization', `Bearer ${alice.accessToken}`)
      .send({ participantIds: [bob.user.id], isGroup: false });

    expect(first.body.conversation.id).toBe(second.body.conversation.id);
  });

  it('should create a group conversation with a name', async () => {
    const alice = await createTestUser();
    const bob = await createTestUser();
    const carol = await createTestUser();

    const response = await request(app)
      .post('/conversations')
      .set('Authorization', `Bearer ${alice.accessToken}`)
      .send({
        participantIds: [bob.user.id, carol.user.id],
        isGroup: true,
        name: 'Test Group',
      });

    expect(response.status).toBe(201);
    expect(response.body.conversation.name).toBe('Test Group');
    expect(response.body.conversation.participants).toHaveLength(3);
  });

  it('should reject a group conversation with no name', async () => {
    const alice = await createTestUser();
    const bob = await createTestUser();

    const response = await request(app)
      .post('/conversations')
      .set('Authorization', `Bearer ${alice.accessToken}`)
      .send({ participantIds: [bob.user.id], isGroup: true });

    expect(response.status).toBe(400);
  });

  it('should reject requests with no auth token', async () => {
    const response = await request(app).post('/conversations').send({
      participantIds: ['some-id'],
      isGroup: false,
    });

    expect(response.status).toBe(401);
  });

  it('should only return conversations the requesting user is part of', async () => {
    const alice = await createTestUser();
    const bob = await createTestUser();
    const stranger = await createTestUser();

    await request(app)
      .post('/conversations')
      .set('Authorization', `Bearer ${alice.accessToken}`)
      .send({ participantIds: [bob.user.id], isGroup: false });

    const response = await request(app)
      .get('/conversations')
      .set('Authorization', `Bearer ${stranger.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.conversations).toHaveLength(0);
  });
});