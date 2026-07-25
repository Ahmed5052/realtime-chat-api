import {prisma} from "../../config/database.js";
import { hashPassword , comparePassword } from "../../utils/hash.js";
import { signAccessToken, generateRefreshToken, hashRefreshToken, getRefreshTokenExpiry } from "../../utils/tokens.js";
import {AppError} from "../../utils/AppError.js";

export async function issueTokens (userId) {
    const accessToken = signAccessToken(userId);
    const refreshToken = generateRefreshToken();
    const hashedRefreshToken = await hashRefreshToken(refreshToken);
    const expiryDate = getRefreshTokenExpiry();

    await prisma.refreshToken.create({
        data: {
            userId: userId,
            tokenHash: hashedRefreshToken,
            expiresAt: expiryDate,
        },
    });

    return { accessToken, refreshToken };
};

export async function register (userData) {
    const { username, email, password } = userData;
    const existingUser = await prisma.user.findFirst({
        where: { OR: [{ email }, { username }] },
    });
    if (existingUser) {
        throw new AppError("User already exists", 409);
    }
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
        data: {
            email,
            username,
            passwordHash,
        },
    });

    const tokens = await issueTokens(user.id);
    return {user: {id: user.id, username: user.username , email: user.email} , ...tokens};
};

export async function login (userData) {
    const { email, password } = userData;
    const user = await prisma.user.findUnique({
        where: { email },
    });
    if (!user) {
        throw new AppError("Invalid Email or password", 401);
    }
    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
        throw new AppError("Invalid Email or password", 401);
    }

    const tokens = await issueTokens(user.id);
    return {user: {id: user.id, username: user.username , email: user.email} , ...tokens};
};

export async function refreshAccessToken (refreshToken) {
    const hashedRefreshToken = await hashRefreshToken(refreshToken);
    const storedToken = await prisma.refreshToken.findUnique({
        where: {tokenHash : hashedRefreshToken},
    })

    if(!storedToken) throw new AppError("Invalid refresh token", 401);

    if(storedToken.revoked){
        await prisma.refreshToken.updateMany({
            where: {userId: storedToken.userId},
            data: {revoked: true}
        })
        throw new AppError("Refresh token reuse detected — all sessions revoked", 401);
    }

    if(storedToken.expiresAt <= new Date()) throw new AppError("Refresh token expired", 401);
    
    await prisma.refreshToken.update({
        where: {id: storedToken.id},
        data: {revoked: true}
    })

    const tokens = await issueTokens(storedToken.userId);
    return tokens;
}