import { Router } from 'express';
import multer from 'multer';
import * as controller from '../controllers/profile.controller';
import { requireAdmin, requireAuth } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

export const profileRouter = Router();

// Perfil propio del admin/staff que está autenticado en el backoffice.
profileRouter.use(requireAuth, requireAdmin);

profileRouter.patch('/', asyncHandler(controller.patchPerfil));
profileRouter.post('/avatar', upload.single('archivo'), asyncHandler(controller.postAvatar));
