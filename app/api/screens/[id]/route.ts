import { NextRequest } from 'next/server';
import { withErrorHandler } from '@/lib/error-handler';
import { ScreenService } from '@/services/screen.service';
import { requireAuth } from '@/lib/auth';
import { wsManager } from '@/utils/websocket-server';

const screenService = new ScreenService(wsManager);

export const GET = withErrorHandler(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  await requireAuth(request);
  const { id } = await params;
  return await screenService.getScreenById(id);
});

export const PUT = withErrorHandler(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  await requireAuth(request);
  const { id } = await params;
  const data = await request.json();
  return await screenService.updateScreen(id, data);
});

export const DELETE = withErrorHandler(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  await requireAuth(request);
  const { id } = await params;
  await screenService.deleteScreen(id);
  return { success: true };
});
