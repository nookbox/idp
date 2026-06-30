import { Request, Response } from 'express';
import { v4 as uuidv4, validate } from 'uuid';

import { REQUEST_ID_TOKEN_HEADER } from '../../constants';

export const RequestIdMiddleware = (
  req: Request,
  res: Response,
  next: () => void,
) => {
  const requestIdToken = req.header(REQUEST_ID_TOKEN_HEADER) || '';

  if (!requestIdToken || !validate(requestIdToken)) {
    req.headers[REQUEST_ID_TOKEN_HEADER] = uuidv4();
  }

  const finalId = req.headers[REQUEST_ID_TOKEN_HEADER] as string;
  res.set(REQUEST_ID_TOKEN_HEADER, finalId);

  next();
};
