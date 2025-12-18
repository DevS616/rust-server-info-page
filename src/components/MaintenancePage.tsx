import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';

const MaintenancePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="flex justify-center mb-8">
          <div className="relative">
            <Icon 
              name="Settings" 
              className="h-32 w-32 text-primary animate-spin-slow" 
              style={{ animationDuration: '3s' }}
            />
            <div className="absolute inset-0 bg-primary/20 blur-3xl animate-pulse"></div>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight">
            Сайт временно закрыт на технические работы
          </h1>
          
          <p className="text-xl text-muted-foreground">
            Мы проводим плановое обслуживание для улучшения сервиса
          </p>
        </div>

        <div className="bg-card border border-primary/20 rounded-lg p-8 space-y-6">
          <div className="flex items-center justify-center gap-3">
            <Icon name="Clock" className="h-6 w-6 text-primary" />
            <p className="text-lg">Ожидаемое время завершения: скоро</p>
          </div>

          <div className="border-t pt-6">
            <p className="text-muted-foreground mb-4">
              Подпишитесь на наш Telegram, чтобы узнать больше о завершении работ
            </p>
            
            <Button 
              asChild 
              size="lg" 
              className="bg-[#0088cc] hover:bg-[#0088cc]/90"
            >
              <a 
                href="https://t.me/devilrust" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <Icon name="Send" className="h-5 w-5" />
                Перейти в Telegram
              </a>
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Icon name="Shield" className="h-4 w-4" />
          <span>Все данные в безопасности</span>
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage;
