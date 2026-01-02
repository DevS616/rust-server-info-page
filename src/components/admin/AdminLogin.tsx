import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';

interface AdminLoginProps {
  loginForm: { email: string; password: string };
  setLoginForm: (form: { email: string; password: string }) => void;
  handleLogin: (e: React.FormEvent) => void;
  loading: boolean;
}

const AdminLogin = ({ loginForm, setLoginForm, handleLogin, loading }: AdminLoginProps) => {
  const { toast } = useToast();
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      toast({ title: 'Ошибка', description: 'Введите email', variant: 'destructive' });
      return;
    }

    setResetLoading(true);
    try {
      const res = await fetch('https://functions.poehali.dev/bf06608b-5623-4eae-8f89-c08bea6a0073/?action=reset_password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail })
      });

      if (res.ok) {
        toast({ 
          title: 'Пароль сброшен', 
          description: 'Теперь можете войти с любым паролем - он станет новым постоянным' 
        });
        setShowReset(false);
        setResetEmail('');
      } else {
        const error = await res.json();
        toast({ title: 'Ошибка', description: error.error || 'Не удалось сбросить пароль', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось сбросить пароль', variant: 'destructive' });
    } finally {
      setResetLoading(false);
    }
  };

  if (showReset) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-6">
            <Icon name="KeyRound" className="mx-auto mb-4 text-primary" size={48} />
            <h1 className="text-2xl font-bold">Восстановление пароля</h1>
            <p className="text-muted-foreground mt-2">Введите email для сброса пароля</p>
          </div>
          
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div>
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="admin@example.com"
              />
            </div>
            
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={resetLoading}>
                {resetLoading ? 'Сброс...' : 'Сбросить пароль'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowReset(false)}>
                Отмена
              </Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-6">
          <Icon name="Shield" className="mx-auto mb-4 text-primary" size={48} />
          <h1 className="text-2xl font-bold">Админ-панель</h1>
          <p className="text-muted-foreground mt-2">Войдите для доступа к системе</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={loginForm.email}
              onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
              placeholder="admin@example.com"
            />
          </div>
          
          <div>
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              placeholder="••••••••"
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Вход...' : 'Войти'}
          </Button>
          
          <Button 
            type="button" 
            variant="link" 
            className="w-full mt-2" 
            onClick={() => setShowReset(true)}
          >
            Забыли пароль?
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default AdminLogin;