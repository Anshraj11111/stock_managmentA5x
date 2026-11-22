import express from 'express';
import { signup, login, googleAuth, refreshToken } from "../controllers/authcontroller.js";

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/refresh', refreshToken); // ✅ Silent re-auth using refresh token

export default router;
