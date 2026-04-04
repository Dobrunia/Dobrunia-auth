import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { requireActiveAccessToken } from '../../middleware/access-auth.middleware';
import { registerController } from './register/register.controller';
import { loginController } from './login/login.controller';
import { logoutController } from './logout/logout.controller';
import { refreshController } from './refresh/refresh.controller';
import { meController } from './me/me.controller';

export const authRouter = Router();

authRouter.post('/register', asyncHandler(registerController.register));
authRouter.post('/login', asyncHandler(loginController.login));
authRouter.post('/logout', asyncHandler(logoutController.logout));
authRouter.post('/refresh', asyncHandler(refreshController.refresh));

const meRouter = Router();
meRouter.use(asyncHandler(requireActiveAccessToken));
meRouter.get('/', asyncHandler(meController.getMe));
meRouter.patch('/', asyncHandler(meController.patchMe));
meRouter.delete('/', asyncHandler(meController.deleteMe));
authRouter.use('/me', meRouter);
