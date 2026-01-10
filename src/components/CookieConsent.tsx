import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';

const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <>
      <Card className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 p-4 shadow-lg border-2">
        <div className="flex gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <Icon name="Cookie" className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 space-y-3">
            <div className="space-y-1">
              <h3 className="font-semibold text-sm">Мы используем cookies</h3>
              <p className="text-xs text-muted-foreground">
                Наш сайт использует cookie-файлы для авторизации через Steam и улучшения работы сервиса. 
                Продолжая использование сайта, вы соглашаетесь с обработкой персональных данных.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                onClick={handleAccept} 
                size="sm" 
                className="w-full sm:w-auto"
              >
                Принять
              </Button>
              <Button 
                onClick={() => setShowPolicy(true)} 
                variant="outline" 
                size="sm"
                className="w-full sm:w-auto"
              >
                Подробнее
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Dialog open={showPolicy} onOpenChange={setShowPolicy}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Политика использования cookies и обработки данных</DialogTitle>
            <DialogDescription>
              Информация о том, какие данные мы собираем и как их используем
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 text-sm">
            <section>
              <h3 className="font-semibold mb-2">1. Общие положения</h3>
              <p className="text-muted-foreground">
                Настоящая Политика определяет порядок обработки и защиты персональных данных пользователей 
                при использовании сайта и авторизации через Steam.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">2. Какие данные мы собираем</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Steam ID и публичная информация профиля Steam (ник, аватар)</li>
                <li>Технические данные: IP-адрес, браузер, тип устройства</li>
                <li>Данные о взаимодействии с сайтом (просмотренные страницы, время посещения)</li>
                <li>Cookie-файлы для поддержания сессии авторизации</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold mb-2">3. Цели обработки данных</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Авторизация и аутентификация пользователей</li>
                <li>Обеспечение работы игровых серверов</li>
                <li>Предоставление поддержки и обработка обращений</li>
                <li>Улучшение качества сервиса</li>
                <li>Предотвращение мошенничества и нарушений правил</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold mb-2">4. Cookie-файлы</h3>
              <p className="text-muted-foreground mb-2">
                Мы используем cookies для:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>Аутентификационные cookies</strong> — хранят информацию о вашей сессии</li>
                <li><strong>Функциональные cookies</strong> — запоминают ваши настройки</li>
                <li><strong>Аналитические cookies</strong> — помогают понять, как используется сайт</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold mb-2">5. Передача данных третьим лицам</h3>
              <p className="text-muted-foreground">
                Мы не передаем ваши персональные данные третьим лицам, за исключением случаев, 
                предусмотренных законодательством РФ.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">6. Безопасность данных</h3>
              <p className="text-muted-foreground">
                Мы применяем технические и организационные меры для защиты ваших данных от 
                несанкcionированного доступа, изменения, раскрытия или уничтожения.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">7. Изменения в политике</h3>
              <p className="text-muted-foreground">
                Мы можем обновлять данную Политику. Продолжая использовать сайт после внесения изменений, 
                вы соглашаетесь с новой версией Политики.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">8. Контакты</h3>
              <p className="text-muted-foreground">
                По вопросам обработки персональных данных обращайтесь через раздел "Поддержка" на сайте.
              </p>
            </section>

            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Дата последнего обновления: 10 января 2026 г.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={() => {
              setShowPolicy(false);
              handleAccept();
            }}>
              Понятно, принимаю
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CookieConsent;