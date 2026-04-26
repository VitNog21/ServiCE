import express from 'express';
import { OrderController } from '../controllers/OrderController.js';

const router = express.Router();

router.post(
	'/',
	/*
		#swagger.tags = ['Orders']
		#swagger.summary = 'Criar um novo pedido'
		#swagger.description = 'Cria um pedido com status inicial pendente.'
		#swagger.requestBody = {
			required: true,
			content: {
				"application/json": {
					schema: {
						type: "object",
						required: ["anuncio_id", "comprador_id", "vendedor_id", "valor_total"],
						properties: {
							anuncio_id: { type: "integer", example: 12 },
							comprador_id: { type: "string", example: "uuid-do-comprador" },
							vendedor_id: { type: "string", example: "uuid-do-vendedor" },
							valor_total: { type: "number", example: 149.9 }
						}
					}
				}
			}
		}
		#swagger.responses[201] = {
			description: 'Pedido criado com sucesso.'
		}
		#swagger.responses[400] = {
			description: 'Erro ao criar pedido.'
		}
	*/
	OrderController.createOrder
);
router.get('/user/:userId', OrderController.getUserOrders);
router.patch('/confirm/:orderId', OrderController.confirmPayment);

export default router;
