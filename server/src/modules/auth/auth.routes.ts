import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { registerController } from './register/register.controller';

export const authRouter = Router();

authRouter.post('/register', asyncHandler(registerController.register));
