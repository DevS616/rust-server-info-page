import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

const API_BASE = 'https://functions.poehali.dev';

interface TelegramSectionProps {
  token: string;
}

const TelegramSection = ({ token }: TelegramSectionProps) => {
  const { toast } = useToast();
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState<string | null>(null);
  const [showTelegramInfo, setShowTelegramInfo] = useState(false);

  const checkTelegramLink = async () => {
    try {
      const res = await fetch(`${API_BASE}/92e13203-5190-4bb5-b08b-d287ef896899/`, {
        headers: { 'X-Auth-Token': token }
      });
      
      if (res.ok) {
        const data = await res.json();
        setTelegramLinked(data.linked);
        setTelegramUsername(data.telegram_username);
      }
    } catch (error) {
      console.error('Failed to check telegram link:', error);
    }
  };

  const handleTelegramLink = async () => {
    try {
      const res = await fetch(`${API_BASE}/92e13203-5190-4bb5-b08b-d287ef896899/?action=link`, {
        method: 'POST',
        headers: { 'X-Auth-Token': token }
      });
      
      if (res.ok) {
        const data = await res.json();
        window.open(data.link_url, '_blank');
        setShowTelegramInfo(true);
        
        const checkInterval = setInterval(async () => {
          const checkRes = await fetch(`${API_BASE}/92e13203-5190-4bb5-b08b-d287ef896899/`, {
            headers: { 'X-Auth-Token': token }
          });
          if (checkRes.ok) {
            const checkData = await checkRes.json();
            if (checkData.linked) {
              setTelegramLinked(true);
              setTelegramUsername(checkData.telegram_username);
              setShowTelegramInfo(false);
              clearInterval(checkInterval);
              toast({ 
                title: 'Успешно!', 
                description: 'Telegram успешно привязан. Вы будете получать уведомления от поддержки.' 
              });
            }
          }
        }, 3000);
        
        setTimeout(() => {
          clearInterval(checkInterval);
          setShowTelegramInfo(false);
        }, 60000);
      } else {
        toast({ title: 'Ошибка', description: 'Не удалось создать ссылку', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось создать ссылку', variant: 'destructive' });
    }
  };

  const handleTelegramUnlink = async () => {
    if (!confirm('Вы уверены, что хотите отвязать Telegram?')) return;
    
    try {
      const res = await fetch(`${API_BASE}/92e13203-5190-4bb5-b08b-d287ef896899/`, {
        method: 'DELETE',
        headers: { 'X-Auth-Token': token }
      });
      
      if (res.ok) {
        setTelegramLinked(false);
        setTelegramUsername(null);
        toast({ title: 'Успешно', description: 'Telegram отвязан' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось отвязать Telegram', variant: 'destructive' });
    }
  };

  useEffect(() => {
    checkTelegramLink();
  }, []);

  return (
    <Card className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 mb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
            <Icon name="Send" className="text-blue-400" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Уведомления в Telegram</h3>
            {telegramLinked ? (
              <div>
                <p className="text-sm text-green-400 flex items-center gap-2">
                  <Icon name="CheckCircle2" size={16} />
                  Подключено {telegramUsername && `(@${telegramUsername})`}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Вы будете получать уведомления от поддержки
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Получайте уведомления об ответах</p>
            )}
          </div>
        </div>
        
        {telegramLinked ? (
          <Button
            onClick={handleTelegramUnlink}
            variant="outline"
            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
          >
            <Icon name="Unlink" size={16} className="mr-2" />
            Отключить
          </Button>
        ) : (
          <Button
            onClick={handleTelegramLink}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            <Icon name="Send" size={16} className="mr-2" />
            Подключить
          </Button>
        )}
      </div>
      
      {showTelegramInfo && !telegramLinked && (
        <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-sm text-blue-300">
            <Icon name="Info" size={16} className="inline mr-2" />
            Нажмите "Start" в Telegram боте, чтобы завершить привязку
          </p>
        </div>
      )}
    </Card>
  );
};

export default TelegramSection;