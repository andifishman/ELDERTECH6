import type { Request, Response } from 'express';
import { HttpError } from '../middlewares/errorHandler';
import * as contactsService from '../services/contacts/ContactsService';
import { actualizarContactoSchema, crearContactoSchema, toggleFavoritoSchema } from '../validators/contacts.validators';
import { requireParam, requireResidenteId } from '../utils/validators';
import { StatusCodes } from 'http-status-codes';

export async function getContactos(req: Request, res: Response): Promise<void> {
  res.json(await contactsService.getContactos(requireResidenteId(req)));
}

export async function getTiposContacto(_req: Request, res: Response): Promise<void> {
  res.json(await contactsService.getTiposContacto());
}

export async function postContacto(req: Request, res: Response): Promise<void> {
  const payload = crearContactoSchema.parse(req.body);
  try {
    const contacto = await contactsService.agregarContacto(requireResidenteId(req), payload);
    res.status(StatusCodes.CREATED).json(contacto);
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(StatusCodes.INTERNAL_SERVER_ERROR, err instanceof Error ? err.message : 'Error al guardar contacto');
  }
}

export async function patchContacto(req: Request, res: Response): Promise<void> {
  const updates = actualizarContactoSchema.parse(req.body);
  await contactsService.actualizarContacto(requireResidenteId(req), requireParam(req, 'id'), updates);
  res.status(StatusCodes.NO_CONTENT).end();
}

export async function patchFavorito(req: Request, res: Response): Promise<void> {
  const { favorito } = toggleFavoritoSchema.parse(req.body);
  await contactsService.toggleFavorito(requireResidenteId(req), requireParam(req, 'id'), favorito);
  res.status(StatusCodes.NO_CONTENT).end();
}

export async function deleteContacto(req: Request, res: Response): Promise<void> {
  await contactsService.eliminarContacto(requireResidenteId(req), requireParam(req, 'id'));
  res.status(StatusCodes.NO_CONTENT).end();
}

export async function postFoto(req: Request, res: Response): Promise<void> {
  const file = req.file;
  if (!file) throw new HttpError(StatusCodes.BAD_REQUEST, 'Falta el archivo de la foto.');

  const url = await contactsService.subirFoto(requireResidenteId(req), requireParam(req, 'id'), file.buffer, file.mimetype);
  res.json({ url });
}
