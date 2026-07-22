import { register , login , refreshAccessToken } from "./auth.service.js";
import { registerSchema , loginSchema , refreshSchema } from "./auth.validation.js";

export const registerController = async (req, res , next) => {
    try{
        const data = registerSchema.parse(req.body);
        const user = await register(data);
        res.status(201).json(user);
    }catch(error){
        next(error);
    }
}

export const loginController = async (req, res , next) => {
    try{
        const {email, password} = loginSchema.parse(req.body);
        const user = await login({email, password});
        res.status(200).json(user);
    }catch(error){
        next(error);
    }
}

export const refreshController = async (req, res, next) => {
    try{
        const {refreshToken} = refreshSchema.parse(req.body);
        if(!refreshToken){
            throw new Error("Refresh token is required");
        }
        const result = await refreshAccessToken(refreshToken);
        res.status(200).json(result);
    }catch(error){
        next(error);
    }
}