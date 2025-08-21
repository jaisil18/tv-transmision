import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenService } from '@/services/screen.service';

const screenService = new ScreenService();

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