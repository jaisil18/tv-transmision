import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenService } from '@/services/screen.service';
import { wsManager } from '@/utils/websocket-server';

interface CreateScreenRequest {
  name: string;
  location?: string;
  description?: string;
}

const screenService = new ScreenService(wsManager);

export function useScreens() {
  return useQuery({
    queryKey: ['screens'],
    queryFn: () => screenService.getScreens(),
    staleTime: 30000, // 30 segundos
    refetchOnWindowFocus: false
  });
}

export function useCreateScreen() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateScreenRequest) => screenService.createScreen(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screens'] });
    }
  });
}