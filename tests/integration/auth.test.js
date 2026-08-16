import request from 'supertest';
import app from '../../src/app.js';
import { prisma } from '../../src/config/database.js';

describe('POST /auth/register', () => {
  afterEach(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: '@integrationtest.com' } },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should register a new user and return 201 with tokens', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({
        email: 'newuser@integrationtest.com',
        username: 'newuser_test',
        password: 'password123',
      });

    expect(response.status).toBe(201);
    expect(response.body.user).toHaveProperty('id');
    expect(response.body.user.email).toBe('newuser@integrationtest.com');
    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
    expect(response.body.user).not.toHaveProperty('passwordHash');
  });

  it('should reject duplicate email registration with 409', async () => {
    const userData = {
      email: 'duplicate@integrationtest.com',
      username: 'dup_user',
      password: 'password123',
    };

    await request(app).post('/auth/register').send(userData);
    const response = await request(app).post('/auth/register').send(userData);

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('User already exists');
  });

  it('should reject invalid email format with 400', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({
        email: 'not-an-email',
        username: 'someuser',
        password: 'password123',
      });

    expect(response.status).toBe(400);
  });

  it('should reject a short password with 400', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({
        email: 'shortpass@integrationtest.com',
        username: 'shortpass_user',
        password: 'short',
      });

    expect(response.status).toBe(400);
  });
});