import request from 'supertest';
import app from '../../src/app.js';

let counter = 0;

export async function createTestUser(overrides = {}) {
  counter += 1;
  const userData = {
    email: `testuser${counter}_${Date.now()}@integrationtest.com`,
    username: `testuser${counter}_${Date.now()}`,
    password: 'password123',
    ...overrides,
  };

  const res = await request(app).post('/auth/register').send(userData);

  return {
    user: res.body.user,
    accessToken: res.body.accessToken,
    refreshToken: res.body.refreshToken,
  };
}