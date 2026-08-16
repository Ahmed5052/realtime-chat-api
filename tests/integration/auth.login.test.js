import request from 'supertest';
import app from '../../src/app.js';
import { prisma } from '../../src/config/database.js';

describe('POST /auth/login', () => {
  const testUser = {
    email: 'loginuser@integrationtest.com',
    username: 'loginuser_test',
    password: 'password123',
  };

  beforeAll(async () => {
    await request(app).post('/auth/register').send(testUser);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: '@integrationtest.com' } },
    });
    await prisma.$disconnect();
  });

  it('should log in with correct credentials and return 200 with tokens', async () => {
    const response = await request(app).post('/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(testUser.email);
    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
  });

  it('should reject wrong password with 401', async () => {
    const response = await request(app).post('/auth/login').send({
      email: testUser.email,
      password: 'wrongpassword',
    });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid Email or password');
  });

  it('should reject non-existent email with 401 and the SAME message as wrong password', async () => {
    const response = await request(app).post('/auth/login').send({
      email: 'doesnotexist@integrationtest.com',
      password: 'whatever123',
    });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid Email or password');
  });

  it('should reject missing password with 400', async () => {
    const response = await request(app).post('/auth/login').send({
      email: testUser.email,
    });

    expect(response.status).toBe(400);
  });
});