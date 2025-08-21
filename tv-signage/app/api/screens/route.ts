import { NextRequest } from 'next/server';
import { withErrorHandler } from '@/lib/error-handler';
import { ScreenService } from '@/services/screen.service';
import { requireAuth } from '@/lib/auth';
import { wsManager } from '@/utils/websocket-server';

const screenService = new ScreenService(wsManager);

export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireAuth(request);
  return await screenService.getScreens();
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  await requireAuth(request);
  const data = await request.json();
  return await screenService.createScreen(data);
});
