import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const API_BASE = 'https://functions.poehali.dev';

interface AdminAuthProps {
  onLoginSuccess: (token: string, admin: any) => void;
}

export const useAdminAuth = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });

  const handleLogin = async (e: React.FormEvent, onSuccess: (token: string, admin: any) => void) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch(`${API_BASE}/bf06608b-5623-4eae-8f89-c08bea6a0073/?action=login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('admin_token', data.token);
        onSuccess(data.token, data.admin);
        toast({ title: 'Успешно', description: 'Вы вошли в систему' });
      } else {
        const error = await res.json();
        toast({ title: 'Ошибка', description: error.error || 'Неверные данные', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось войти', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = (onLogoutComplete: () => void) => {
    localStorage.removeItem('admin_token');
    onLogoutComplete();
  };

  return {
    loading,
    loginForm,
    setLoginForm,
    handleLogin,
    handleLogout
  };
};
