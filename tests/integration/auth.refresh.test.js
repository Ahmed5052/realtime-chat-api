import request from 'supertest';
import app from '../../src/app.js';
import { prisma } from '../../src/config/database.js';

describe('POST /auth/refresh', () => {
  const testUser = {
    email: 'refreshuser@integrationtest.com',
    username: 'refreshuser_test',
    password: 'password123',
  };

  let refreshToken;

  beforeAll(async () => {
    const res = await request(app).post('/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    }).then(async (loginRes) => {
      if (loginRes.status === 200) return loginRes;
      await request(app).post('/auth/register').send(testUser);
      return request(app).post('/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });
    });

    refreshToken = res.body.refreshToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: '@integrationtest.com' } },
    });
    await prisma.$disconnect();
  });

  it('should exchange a valid refresh token for a new token pair', async () => {
    const response = await request(app).post('/auth/refresh').send({ refreshToken });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
    expect(response.body.refreshToken).not.toBe(refreshToken);
  });

  it('should reject reuse of an already-used refresh token', async () => {
    const loginRes = await request(app).post('/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });
    const originalToken = loginRes.body.refreshToken;

    await request(app).post('/auth/refresh').send({ refreshToken: originalToken });

    const response = await request(app).post('/auth/refresh').send({ refreshToken: originalToken });

    expect(response.status).toBe(401);
    expect(response.body.error).toMatch(/reuse detected/i);
  });

  it('should reject a completely invalid refresh token', async () => {
    const response = await request(app).post('/auth/refresh').send({
      refreshToken: 'totally-fake-token-value',
    });

    expect(response.status).toBe(401);
  });
});