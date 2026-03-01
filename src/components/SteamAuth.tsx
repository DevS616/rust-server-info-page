import { useState, useEffect, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Icon from '@/components/ui/icon';
import { isTokenExpired, decodeToken } from '@/utils/authToken';

interface SteamUser {
  steamId: string;
  username: string;
  userId: number;
  avatar?: string;
}

const SteamAuth = () => {
  const [user, setUser] = useState<SteamUser | null>(null);

  useEffect(() => {
    const updateUser = () => {
      const storedUser = localStorage.getItem('steam_user');
      const token = localStorage.getItem('support_token');
      
      if (token && isTokenExpired(token)) {
        localStorage.removeItem('steam_user');
        localStorage.removeItem('support_token');
        setUser(null);
        return;
      }
      
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          
          if (token) {
            const tokenData = decodeToken(token);
            if (tokenData && tokenData.avatar !== userData.avatar) {
              const updatedUser = {
                ...userData,
                avatar: tokenData.avatar,
                username: tokenData.username
              };
              localStorage.setItem('steam_user', JSON.stringify(updatedUser));
              setUser(updatedUser);
              return;
            }
          }
          
          setUser(userData);
        } catch { /* ignore */ }
      } else {
        setUser(null);
      }
    };

    updateUser();

    window.addEventListener('storage', updateUser);
    window.addEventListener('focus', updateUser);
    
    return () => {
      window.removeEventListener('storage', updateUser);
      window.removeEventListener('focus', updateUser);
    };
  }, []);

  const handleLogin = useCallback(() => {
    const currentUrl = encodeURIComponent(window.location.origin);
    window.location.href = `https://functions.poehali.dev/560196bb-a6d4-41dc-9b1c-0008c13bece3/?base_url=${currentUrl}`;
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('steam_user');
    localStorage.removeItem('support_token');
    localStorage.removeItem('bonus_after_auth');
    setUser(null);
    window.location.reload();
  }, []);

  if (!user) {
    return (
      <Button onClick={handleLogin} variant="outline" className="gap-2 w-full sm:w-auto">
        <Icon name="LogIn" className="h-4 w-4" />
        Войти через Steam
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-2 w-full sm:w-auto justify-start sm:justify-center">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar} alt={user.username} />
            <AvatarFallback>
              <Icon name="User" className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <span>{user.username}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
          <Icon name="LogOut" className="mr-2 h-4 w-4" />
          Выйти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default memo(SteamAuth);