import { Router } from 'express';
import multer from 'multer';
import * as controller from '../controllers/requests.controller';
import { requireAuth } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

export const requestsRouter = Router();

requestsRouter.use(requireAuth);

requestsRouter.get('/', asyncHandler(controller.getPropios));
requestsRouter.post('/', upload.single('audio'), asyncHandler(controller.postPedido));
requestsRouter.patch('/:id', asyncHandler(controller.patchPedido));
