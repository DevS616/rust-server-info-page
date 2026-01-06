import { useToast } from '@/hooks/use-toast';
import { Server } from './AdminDataLoader';

const API_BASE = 'https://functions.poehali.dev';

export const useServerManager = (token: string | null, onServersChanged: () => void) => {
  const { toast } = useToast();

  const handleCreateServer = async (serverForm: { name: string; is_active: boolean }): Promise<boolean> => {
    if (!serverForm.name.trim() || !token) return false;

    try {
      const res = await fetch(`${API_BASE}/cd63f370-b8ea-4adc-ace4-a274aa6f6e34/?action=create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token
        },
        body: JSON.stringify(serverForm)
      });

      if (res.ok) {
        toast({ title: 'Сервер создан', description: 'Новый сервер успешно добавлен' });
        onServersChanged();
        return true;
      } else {
        const error = await res.json();
        toast({ title: 'Ошибка', description: error.error || 'Не удалось создать сервер', variant: 'destructive' });
        return false;
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось создать сервер', variant: 'destructive' });
      return false;
    }
  };

  const handleUpdateServer = async (serverId: number, serverForm: { name: string; is_active: boolean }): Promise<boolean> => {
    if (!serverForm.name.trim() || !token) return false;

    try {
      const res = await fetch(`${API_BASE}/cd63f370-b8ea-4adc-ace4-a274aa6f6e34/?server_id=${serverId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token
        },
        body: JSON.stringify(serverForm)
      });

      if (res.ok) {
        toast({ title: 'Сервер обновлен', description: 'Изменения сохранены' });
        onServersChanged();
        return true;
      } else {
        const error = await res.json();
        toast({ title: 'Ошибка', description: error.error || 'Не удалось обновить сервер', variant: 'destructive' });
        return false;
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось обновить сервер', variant: 'destructive' });
      return false;
    }
  };

  const handleDeleteServer = async (serverId: number): Promise<boolean> => {
    if (!confirm('Вы уверены, что хотите удалить этот сервер?') || !token) return false;

    try {
      const res = await fetch(`${API_BASE}/cd63f370-b8ea-4adc-ace4-a274aa6f6e34/?server_id=${serverId}`, {
        method: 'DELETE',
        headers: { 'X-Auth-Token': token }
      });

      if (res.ok) {
        toast({ title: 'Сервер удален', description: 'Сервер успешно удален' });
        onServersChanged();
        return true;
      } else {
        toast({ title: 'Ошибка', description: 'Не удалось удалить сервер', variant: 'destructive' });
        return false;
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось удалить сервер', variant: 'destructive' });
      return false;
    }
  };

  return {
    handleCreateServer,
    handleUpdateServer,
    handleDeleteServer
  };
};
