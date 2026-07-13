import { Router } from 'express';
import multer from 'multer';
import * as controller from '../controllers/contacts.controller';
import { requireAuth } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

export const contactsRouter = Router();

contactsRouter.use(requireAuth);

contactsRouter.get('/types', asyncHandler(controller.getTiposContacto));

contactsRouter.get('/', asyncHandler(controller.getContactos));
contactsRouter.post('/', asyncHandler(controller.postContacto));
contactsRouter.patch('/:id', asyncHandler(controller.patchContacto));
contactsRouter.patch('/:id/favorite', asyncHandler(controller.patchFavorito));
contactsRouter.delete('/:id', asyncHandler(controller.deleteContacto));
contactsRouter.post('/:id/photo', upload.single('foto'), asyncHandler(controller.postFoto));
