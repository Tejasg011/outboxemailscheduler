import { Router } from 'express';
import passport from '../config/passport.js';
import { googleLogin, googleCallback, me, logout, devLogin } from '../controllers/auth.controller.js';

const router = Router();
router.get('/google', googleLogin);
router.get('/google/callback', googleCallback);
router.get('/me', me);
router.post('/logout', logout);
router.post('/dev-login', devLogin);
export default router;
