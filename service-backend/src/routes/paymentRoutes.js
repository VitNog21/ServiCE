import express from 'express';
import { PaymentController } from '../controllers/PaymentController.js';

const router = express.Router();

// Route for the frontend to request checkout creation (receives orderId in the body)
router.post('/create-checkout', PaymentController.createCheckout);

// Route for testing: simulate approval
router.post('/test-approve', PaymentController.testApprove);

// Route to cancel order and reactivate the listing
router.post('/cancel-order', PaymentController.cancelOrder);

// Route for testing: force real MP simulation
router.post('/simulate-external', PaymentController.simulateExternal);

// Route for Mercado Pago to send notifications (Webhook)
router.post('/webhook', PaymentController.webhook);

export default router;
