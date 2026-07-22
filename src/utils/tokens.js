import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import crypto from "crypto";

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = 7;

export const signAccessToken = (userid) => {
    const accessToken = jwt.sign({userid}, env.jwtSecret, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
    });
    return { accessToken };
}

export const verifyAccessToken = (token) => {
    const decodedToken = jwt.verify(token, env.jwtSecret);
    return decodedToken;
}

export const generateRefreshToken = () => {
    const refreshtoken = crypto.randomBytes(40).toString("hex");
    return refreshtoken;
}

export const hashRefreshToken = (refreshtoken) => {
    const hashedRefreshToken = crypto.createHash("sha256").update(refreshtoken).digest("hex");
    return hashedRefreshToken;
}

export const getRefreshTokenExpiry = () => {
    const expiry = new Date()
    expiry.setDate(expiry.getDate() + REFRESH_TOKEN_EXPIRY);
    return expiry;
}