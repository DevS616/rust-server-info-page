import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'https://functions.poehali.dev';

const SteamCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Обработка авторизации Steam...');

  useEffect(() => {
    const processCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      
      if (!urlParams.has('openid.mode')) {
        setStatus('Ошибка: неверные параметры авторизации');
        setTimeout(() => navigate('/support'), 2000);
        return;
      }

      try {
        const callbackUrl = `${API_BASE}/560196bb-a6d4-41dc-9b1c-0008c13bece3?${urlParams.toString()}`;
        
        window.location.href = callbackUrl;
      } catch (error) {
        console.error('Steam auth error:', error);
        setStatus('Ошибка при авторизации. Перенаправление...');
        setTimeout(() => navigate('/support'), 2000);
      }
    };

    processCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-lg text-muted-foreground">{status}</p>
      </div>
    </div>
  );
};

export default SteamCallback;
