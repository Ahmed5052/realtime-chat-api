import { registerController , loginController , refreshController} from "./auth.controller.js";
import { Router } from "express";
import { authRateLimiter } from "../../middleware/rateLimiter.js";

const router = Router();

router.post("/register",authRateLimiter,registerController);
router.post("/login",authRateLimiter,loginController);
router.post("/refresh",authRateLimiter,refreshController);

export default router;
