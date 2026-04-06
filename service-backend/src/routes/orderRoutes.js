import express from 'express';
import { OrderController } from '../controllers/OrderController.js';

const router = express.Router();

router.post('/', OrderController.createOrder);
router.get('/user/:userId', OrderController.getUserOrders);
router.patch('/confirm/:orderId', OrderController.confirmPayment);

export default router;
