import express from 'express';
import AuthController from '../controllers/AuthController.js';

const router = express.Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/reset-password-direct', AuthController.resetPasswordDirect);

export default router;