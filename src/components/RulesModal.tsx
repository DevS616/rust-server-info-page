import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import Icon from '@/components/ui/icon';
import { useState, useEffect } from 'react';

interface RulesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RulesModal = ({ open, onOpenChange }: RulesModalProps) => {
  const [hasAccepted, setHasAccepted] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem('rules_accepted');
    if (accepted === 'true') {
      setHasAccepted(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('rules_accepted', 'true');
    setHasAccepted(true);
    onOpenChange(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    // Разрешаем закрытие только если правила уже приняты
    if (!isOpen && !hasAccepted) {
      return;
    }
    
    if (!isOpen) {
      setHasAgreed(false);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col border-primary/30" onInteractOutside={(e) => {
        // Блокируем закрытие по клику вне окна, если правила не приняты
        if (!hasAccepted) {
          e.preventDefault();
        }
      }} onEscapeKeyDown={(e) => {
        // Блокируем закрытие по ESC, если правила не приняты
        if (!hasAccepted) {
          e.preventDefault();
        }
      }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Icon name="Shield" className="h-6 w-6 text-primary" />
            Правила проекта DevilRust
          </DialogTitle>
          <DialogDescription>
            Ознакомьтесь с правилами перед началом игры на наших серверах
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 text-sm">
            
            {/* 1. Основные правила */}
            <section>
              <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                <Icon name="AlertCircle" className="h-5 w-5" />
                1. Основные правила проекта
              </h3>
              <div className="space-y-3 pl-4">
                <div className="border-l-2 border-primary/50 pl-4 py-2">
                  <p className="font-semibold text-foreground mb-1">1.1 Запрет стороннего ПО</p>
                  <p className="text-muted-foreground">Играя на нашем сервере - строго запрещено использовать/хранить/распространять стороннее программное обеспечение или любые другие средства (например читы, автокликеры, CrossHair, макросы и пр.), позволяющие получить преимущество над другими игроками. Наличие покупки/подписки приравнивается к хранению. <span className="text-destructive font-medium">(Бан от 7 дней)</span></p>
                </div>
                
                <div className="border-l-2 border-primary/50 pl-4 py-2">
                  <p className="font-semibold text-foreground mb-1">1.2 Сокрытие информации</p>
                  <p className="text-muted-foreground">Запрещено скрывать информацию о нарушениях правил другими игроками или Администрацией, скрывать информацию о багах/недоработках сервера и использовать ее в личных целях, так же распространять среди игроков <span className="text-destructive font-medium">(Бан от 30 дней)</span></p>
                </div>
                
                <div className="border-l-2 border-primary/50 pl-4 py-2">
                  <p className="font-semibold text-foreground mb-1">1.3 Ненормативная лексика</p>
                  <p className="text-muted-foreground">Запрещены любые не нормативные высказывание в любую сторону игрока, игроков или Администрации проекта <span className="text-destructive font-medium">(Бан чата от 3ч или бан от 3д)</span></p>
                </div>
                
                <div className="border-l-2 border-primary/50 pl-4 py-2">
                  <p className="font-semibold text-foreground mb-1">1.4 Политика и дискриминация</p>
                  <p className="text-muted-foreground">Запрещено разводить международные или политические скандал, дискриминацию, конфликты на политической почве, руинить проект в любом проявлении, враждебность к любым религиозным группам и людям с ограниченными возможностями. <span className="text-destructive font-medium">(Бан от 14 дней)</span></p>
                </div>
                
                <div className="border-l-2 border-primary/50 pl-4 py-2">
                  <p className="font-semibold text-foreground mb-1">1.5 Выдача себя за администрацию</p>
                  <p className="text-muted-foreground">Запрещено выдавать себя за Администрацию проекта или использовать никнеймы Администрации (в т.ч Модераторов и Хелперов), а также копировать профили, ставить оскорбительные или провокационные никнеймы/статусы/аватары и выдавать себя за другую личность. <span className="text-destructive font-medium">(Бан от 14 дней)</span></p>
                </div>
                
                <div className="border-l-2 border-primary/50 pl-4 py-2">
                  <p className="font-semibold text-foreground mb-1">1.6 Провокационный контент</p>
                  <p className="text-muted-foreground">Запрещаются размещать таблички/картины и пр. предметы с провокационными, оскорбительными посланиями, несущие негатив или межнациональные конфликты, а так же ОСК игроков или Администрации <span className="text-destructive font-medium">(Бан от 7 дней)</span></p>
                </div>
                
                <div className="border-l-2 border-primary/50 pl-4 py-2">
                  <p className="font-semibold text-foreground mb-1">1.7 Реклама сторонних проектов</p>
                  <p className="text-muted-foreground">Запрещена реклама сторонних проектов, в любом ее проявлении (Приписка к нику, реклама в игровом/голосовом чате, через записки, голосовой чат или в мессенджерах и пр.) <span className="text-destructive font-medium">(Предупреждение или бан от 1 дня)</span></p>
                </div>
                
                <div className="border-l-2 border-primary/50 pl-4 py-2">
                  <p className="font-semibold text-foreground mb-1">1.8 Твинк аккаунты</p>
                  <p className="text-muted-foreground">Запрещено использование твинк аккаунтов ( создавать второй аккаунт ради собственной выгоды, обхода блокировок, использования промо-кодов и пр.) <span className="text-destructive font-medium">(Бан основного аккаунта от 30 дней и бан твинк аккаунта навсегда)</span></p>
                </div>
                
                <div className="border-l-2 border-primary/50 pl-4 py-2">
                  <p className="font-semibold text-foreground mb-1">1.9 Продажа за реальные деньги</p>
                  <p className="text-muted-foreground">Запрещена продажа/передача товаров или аккаунтов за реальные деньги. <span className="text-destructive font-medium">(Бан навсегда на всех серверах, за исключением покупки товаров или передачу баланса другому игроку через Донат магазин)</span></p>
                </div>
              </div>
            </section>

            {/* 2. Правила общения в чате */}
            <section>
              <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                <Icon name="MessageSquare" className="h-5 w-5" />
                2. Правила общения в чате игры и мессенджерах
              </h3>
              <div className="space-y-3 pl-4">
                <div className="border-l-2 border-primary/50 pl-4 py-2">
                  <p className="font-semibold text-foreground mb-1">2.1 Беспокойство администраторов</p>
                  <p className="text-muted-foreground">Запрещено отвлекать администраторов, просить их выдать вам вещи/телепортировать или вмешиваться в игровой процесс <span className="text-destructive font-medium">(Бан чата от 5 минут)</span></p>
                </div>
                
                <div className="border-l-2 border-primary/50 pl-4 py-2">
                  <p className="font-semibold text-foreground mb-1">2.2 Оскорбления и мат</p>
                  <p className="text-muted-foreground">Запрещается оскорблять, ругаться, использовать нецензурную лексику. <span className="text-destructive font-medium">(Бан чата от 1 часа)</span></p>
                </div>
                
                <div className="border-l-2 border-primary/50 pl-4 py-2">
                  <p className="font-semibold text-foreground mb-1">2.3 Спам и флуд</p>
                  <p className="text-muted-foreground">Не допускается спам, флуд и реклама сторонних ресурсов. <span className="text-destructive font-medium">(Бан чата от 1 дня)</span></p>
                </div>
                
                <div className="border-l-2 border-primary/50 pl-4 py-2">
                  <p className="font-semibold text-foreground mb-1">2.4 Мат в мессенджерах</p>
                  <p className="text-muted-foreground">Запрещен мат в любом его проявлении (Кроме флуд-каналов в Telegram и Discord) <span className="text-destructive font-medium">(Бан чата от 1 часа)</span></p>
                </div>
                
                <div className="border-l-2 border-primary/50 pl-4 py-2">
                  <p className="font-semibold text-foreground mb-1">2.5 Обсуждение действий администрации</p>
                  <p className="text-muted-foreground">Запрещены обсуждения и осуждение действий администраторов и модераторов сервера в общем чате или мессенджерах <span className="text-destructive font-medium">(Бан от 3 дней)</span></p>
                </div>
                
                <div className="border-l-2 border-primary/50 pl-4 py-2">
                  <p className="font-semibold text-foreground mb-1">2.6 Нарушение тем в мессенджерах</p>
                  <p className="text-muted-foreground">Запрещается нарушать темы в мессенджерах (Жалобы писать в канал для жалоб, предложения в канал для предложений и т.д.) <span className="text-destructive font-medium">(Бан чата от 1 часа)</span></p>
                </div>
                
                <div className="border-l-2 border-primary/50 pl-4 py-2">
                  <p className="font-semibold text-foreground mb-1">2.7 Повторное обсуждение администрации</p>
                  <p className="text-muted-foreground">Запрещены обсуждения и осуждение действий администраторов и модераторов сервера в общем чате или мессенджерах <span className="text-destructive font-medium">(Бан от 3 дней)</span></p>
                </div>
              </div>
            </section>

            {/* 3. Правила PVP событий */}
            <section>
              <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                <Icon name="Swords" className="h-5 w-5" />
                3. Правила во время PVP событий
              </h3>
              <div className="space-y-3 pl-4">
                <div className="border-l-2 border-primary/50 pl-4 py-2">
                  <p className="font-semibold text-foreground mb-1">3.1 Соблюдение основных правил</p>
                  <p className="text-muted-foreground">Строго запрещено нарушение п1.1-1.9, <span className="text-destructive font-medium">(Бан от 30 дней)</span></p>
                </div>
                
                <div className="border-l-2 border-primary/50 pl-4 py-2">
                  <p className="font-semibold text-foreground mb-1">3.2 Нарушение расписания</p>
                  <p className="text-muted-foreground">Запрещено начинать PVP при сбоях в расписании, или начинать рейд когда PVP событие началось не по расписанию (узнать расписание можно командой /wipe в игре)</p>
                </div>
              </div>
            </section>

            {/* 4. Правила PVE режима */}
            <section>
              <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                <Icon name="Home" className="h-5 w-5" />
                4. Правила PvE режима
              </h3>
              <div className="space-y-3 pl-4">
                <div className="border-l-2 border-primary/50 pl-4 py-2">
                  <p className="font-semibold text-foreground mb-1">4.1 Нарушение PVE режима</p>
                  <p className="text-muted-foreground">Строго запрещается нарушение PVE режима (вне PVP событий), кража ресурсов, воровство, проникновение в чужую зону строительства, мульти TC, помеха строительству других игроков или помеха игры для других игроков в целом <span className="text-destructive font-medium">(Бан от 3 дней)</span></p>
                </div>
                
                <div className="border-l-2 border-primary/50 pl-4 py-2">
                  <p className="font-semibold text-foreground mb-1">4.2 Лаги от построек</p>
                  <p className="text-muted-foreground">Постройки одного игрока не должны вызывать лаги у других. <span className="text-destructive font-medium">(Бан от 30 дней с удалением всех построек)</span></p>
                </div>
                
                <div className="border-l-2 border-primary/50 pl-4 py-2">
                  <p className="font-semibold text-foreground mb-1">4.3 Лимит фундаментов</p>
                  <p className="text-muted-foreground">Запрещается нарушать общий лимит фундаментов на команду — не более 250 фундаментов <span className="text-destructive font-medium">(удаление постройки без предупреждения)</span></p>
                </div>
                
                <div className="border-l-2 border-primary/50 pl-4 py-2">
                  <p className="font-semibold text-foreground mb-1">4.4 Обход лимитов</p>
                  <p className="text-muted-foreground">Запрещено нарушение/обход лимитов <span className="text-destructive font-medium">(удаление постройки без предупреждения)</span></p>
                </div>
              </div>
            </section>

            {/* 5. Правила для Администраторов */}
            <section>
              <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                <Icon name="UserCog" className="h-5 w-5" />
                5. Правила для Администраторов и Модераторов
              </h3>
              <div className="space-y-3 pl-4">
                <div className="border-l-2 border-primary/50 pl-4 py-2">
                  <p className="font-semibold text-foreground mb-1">5.1 Нейтралитет</p>
                  <p className="text-muted-foreground">Администраторы и модераторы обязаны соблюдать нейтралитет, вежливость и справедливость</p>
                </div>
                
                <div className="border-l-2 border-primary/50 pl-4 py-2">
                  <p className="font-semibold text-foreground mb-1">5.2 Прозрачность действий</p>
                  <p className="text-muted-foreground">Все действия должны быть прозрачными и обоснованными</p>
                </div>
                
                <div className="border-l-2 border-primary/50 pl-4 py-2">
                  <p className="font-semibold text-foreground mb-1">5.3 Злоупотребление полномочиями</p>
                  <p className="text-muted-foreground">Запрещается использовать свои полномочия в личных целях или для личной выгоды (пользоваться выдачей ресурсов в личных целях или пользоваться бессмертием для прохождения ивентов и т.д)</p>
                </div>
              </div>
            </section>

            {/* 6. Общие положения */}
            <section>
              <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                <Icon name="FileText" className="h-5 w-5" />
                6. Общие положения
              </h3>
              <div className="space-y-3 pl-4">
                <div className="border-l-2 border-primary/50 pl-4 py-2">
                  <p className="font-semibold text-foreground mb-1">6.1 Право на жалобу</p>
                  <p className="text-muted-foreground">Игрок имеет право подавать жалобы на действия других игроков, модераторов или администраторов</p>
                </div>
                
                <div className="border-l-2 border-primary/50 pl-4 py-2">
                  <p className="font-semibold text-foreground mb-1">6.2 Согласие с правилами</p>
                  <p className="text-muted-foreground">Пользователи автоматически соглашаются с данными правилами, заходя на сервер либо воспользовавшись нашим сайтом, не знание правил не освобождает вас от ответственности.</p>
                </div>
                
                <div className="border-l-2 border-primary/50 pl-4 py-2">
                  <p className="font-semibold text-foreground mb-1">6.3 Отказ от ответственности</p>
                  <p className="text-muted-foreground">Собственники, администрация, представители проекта не несут никакой ответственности за ущерб морального либо материального характера, который может нанести прямо либо опосредованно предлагаемый игровой сервер, а также за любые неточности, ошибки, дефекты и сбои работы сайта или игровых серверов, вне зависимости от причин их возникновения.</p>
                </div>
                
                <div className="border-l-2 border-primary/50 pl-4 py-2">
                  <p className="font-semibold text-foreground mb-1">6.4 Право на блокировку</p>
                  <p className="text-muted-foreground">Администрация оставляет за собой право заблокировать доступ к серверу любому игроку в любой момент без указания причин</p>
                </div>
                
                <div className="border-l-2 border-primary/50 pl-4 py-2">
                  <p className="font-semibold text-foreground mb-1">6.5 Область действия правил</p>
                  <p className="text-muted-foreground">Данные правила распространяются на всех пользователей, зашедших на наши сервера или авторизовавшихся в нашем Донат магазине.</p>
                </div>
                
                <div className="border-l-2 border-primary/50 pl-4 py-2">
                  <p className="font-semibold text-foreground mb-1">6.6 Последствия нарушений</p>
                  <p className="text-muted-foreground">Нарушение правил ведёт к предупреждению, временной блокировке или бану в зависимости от тяжести нарушения.</p>
                </div>
                
                <div className="border-l-2 border-primary/50 pl-4 py-2">
                  <p className="font-semibold text-foreground mb-1">6.7 Окончательность решений</p>
                  <p className="text-muted-foreground">Все решения администрации являются окончательными и обязательными к исполнению.</p>
                </div>
                
                <div className="border-l-2 border-primary/50 pl-4 py-2">
                  <p className="font-semibold text-foreground mb-1">6.8 Обратная связь</p>
                  <p className="text-muted-foreground">Обратная связь и жалобы принимаются через официальные каналы поддержки.</p>
                </div>
              </div>
            </section>

            {/* 7. Покупка в донат-магазине */}
            <section>
              <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                <Icon name="ShoppingCart" className="h-5 w-5" />
                7. Покупка в донат-магазине
              </h3>
              <div className="space-y-3 pl-4">
                <div className="border-l-2 border-primary/50 pl-4 py-2">
                  <p className="font-semibold text-foreground mb-1">7.1 Обязательность ознакомления</p>
                  <p className="text-muted-foreground">Данный раздел пользовательского соглашения является документом, обязательным к ознакомлению каждому игроку, обратившегося к пожертвованиям, если пользователь не согласен с каким-либо положением данного соглашения, либо осознаёт негативные для себя последствия его принятия, ему рекомендуется отказаться от пожертвований</p>
                </div>
                
                <div className="border-l-2 border-primary/50 pl-4 py-2">
                  <p className="font-semibold text-foreground mb-1">7.2 Автоматическое принятие</p>
                  <p className="text-muted-foreground">Пользовательское соглашение автоматически считается принятым, если игрок начал процедуру автоматизированного пополнения счёта</p>
                </div>
                
                <div className="border-l-2 border-primary/50 pl-4 py-2">
                  <p className="font-semibold text-foreground mb-1">7.3 Добровольность пожертвований</p>
                  <p className="text-muted-foreground">Любые пожертвования считаются добровольными и не подлежат возвращению либо возмещению</p>
                </div>
                
                <div className="border-l-2 border-primary/50 pl-4 py-2">
                  <p className="font-semibold text-foreground mb-1">7.4 Невозвратность валюты</p>
                  <p className="text-muted-foreground">Приобретённая игровая валюта не подлежит возврату и обмену, т.к является цифровой валютой нашего проекта</p>
                </div>
                
                <div className="border-l-2 border-primary/50 pl-4 py-2">
                  <p className="font-semibold text-foreground mb-1">7.5 Технические сбои</p>
                  <p className="text-muted-foreground">Администрация не несёт ответственности за возможные технические сбои или потерю приобретённых ресурсов</p>
                </div>
                
                <div className="border-l-2 border-primary/50 pl-4 py-2">
                  <p className="font-semibold text-foreground mb-1">7.6 Право на отзыв привилегий</p>
                  <p className="text-muted-foreground">Администрация оставляет за собой снять все привилегии с игрока за нарушение данных правил</p>
                </div>
              </div>
            </section>

          </div>
        </ScrollArea>

        <div className="border-t border-primary/20 pt-3 mt-0 flex-shrink-0 px-1">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30 mb-3">
            <Icon name="AlertTriangle" className="h-5 w-5 text-destructive flex-shrink-0" />
            <span className="text-sm text-muted-foreground">
              Заметили нарушение правил другим игроком или администратором?{' '}
              <a href="/complaints" className="text-destructive font-semibold hover:underline" onClick={() => onOpenChange(false)}>
                Подайте жалобу
              </a>
            </span>
          </div>
        </div>

        <DialogFooter className="border-t border-primary/20 pt-4 mt-0 flex-shrink-0">
          {!hasAccepted ? (
            <div className="w-full space-y-3">
              <div className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50 border border-primary/20">
                <Checkbox 
                  id="agree-rules" 
                  checked={hasAgreed}
                  onCheckedChange={(checked) => setHasAgreed(checked as boolean)}
                  className="mt-1"
                />
                <label
                  htmlFor="agree-rules"
                  className="text-sm leading-relaxed cursor-pointer select-none"
                >
                  Я прочитал и полностью согласен с правилами проекта DevilRust. Я понимаю, что несоблюдение правил приведет к блокировке моего аккаунта.
                </label>
              </div>
              <Button 
                onClick={handleAccept}
                disabled={!hasAgreed}
                className="w-full"
              >
                <Icon name="Check" className="mr-2 h-5 w-5" />
                Принять правила
              </Button>
            </div>
          ) : (
            <div className="w-full text-center py-2">
              <div className="inline-flex items-center gap-2 text-sm text-primary">
                <Icon name="CheckCircle" className="h-5 w-5" />
                <span>Вы уже приняли правила проекта</span>
              </div>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RulesModal;