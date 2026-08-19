import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';

interface AdminLoginProps {
  loginForm: { email: string; password: string };
  setLoginForm: (form: { email: string; password: string }) => void;
  handleLogin: (e: React.FormEvent) => void;
  loading: boolean;
}

const AdminLogin = ({ loginForm, setLoginForm, handleLogin, loading }: AdminLoginProps) => {
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
          

        </form>
      </Card>
    </div>
  );
};

export default AdminLogin;