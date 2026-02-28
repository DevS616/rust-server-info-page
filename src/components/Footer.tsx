import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useState } from 'react';
import RulesModal from '@/components/RulesModal';

const Footer = () => {
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  
  return (
    <footer className="border-t border-primary/20 py-12 bg-card/50 backdrop-blur-sm relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary/5" />
      <div className="container relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <a href="/" className="flex items-center space-x-2 mb-4 group">
              <img 
                src="https://s3.regru.cloud/img.devilrust/devilrust_logo.png" 
                alt="DevilRust" 
                className="h-6 w-auto group-hover:drop-shadow-[0_0_8px_rgba(255,68,0,0.8)] transition-all"
              />
              <span className="text-xl font-bold tracking-wide" style={{fontFamily: 'Nunito, sans-serif', fontStyle: 'italic'}}>DevilRust</span>
            </a>
            <p className="text-sm text-muted-foreground">Лучшие Rust серверы в СНГ. Присоединяйтесь к лучшему проекту уже сегодня!</p>
          </div>

          <div>
            <h3 className="font-semibold mb-4 uppercase tracking-wider text-sm">Быстрые ссылки</h3>
            <div className="space-y-2 text-sm">
              <a href="/banlist" className="block text-muted-foreground hover:text-primary transition-colors hover:translate-x-1 transform">
                Банлист
              </a>

              <button onClick={() => setIsRulesOpen(true)} className="block text-muted-foreground hover:text-primary transition-colors hover:translate-x-1 transform text-left">
                Правила
              </button>

              <a href="https://wiki.devilrust.ru/" target="_blank" rel="noopener noreferrer" className="block text-muted-foreground hover:text-primary transition-colors hover:translate-x-1 transform">
                Wiki
              </a>

              <a href="https://wiki.devilrust.ru/guides" target="_blank" rel="noopener noreferrer" className="block text-muted-foreground hover:text-primary transition-colors hover:translate-x-1 transform">
                Гайды
              </a>

              <a href="https://devrus.gamestores.app/" target="_blank" rel="noopener noreferrer" className="block text-muted-foreground hover:text-primary transition-colors hover:translate-x-1 transform">
                Магазин
              </a>

              <a href="/support" className="block text-muted-foreground hover:text-primary transition-colors hover:translate-x-1 transform">
                Поддержка
              </a>

              <a href="/complaints" className="block text-destructive hover:text-destructive/80 transition-colors hover:translate-x-1 transform font-medium">
                Подать жалобу
              </a>

              <a href="/privacy" className="block text-muted-foreground hover:text-primary transition-colors hover:translate-x-1 transform">
                Политика конфиденциальности
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4 uppercase tracking-wider text-sm">Социальные сети</h3>
            <div className="flex gap-3">
              <Button variant="outline" size="icon" className="border-primary/30 hover:border-primary hover:bg-primary/10 transition-all font-bold" asChild>
                <a href="https://vk.com/devilrustvk" target="_blank" rel="noopener noreferrer">
                  ВК
                </a>
              </Button>
              <Button variant="outline" size="icon" className="border-primary/30 hover:border-primary hover:bg-primary/10 transition-all" asChild>
                <a href="https://t.me/devilrust" target="_blank" rel="noopener noreferrer">
                  <Icon name="Send" className="h-5 w-5" />
                </a>
              </Button>
              <Button variant="outline" size="icon" className="border-primary/30 hover:border-primary hover:bg-primary/10 transition-all" asChild>
                <a href="https://devrus.gamestores.app/" target="_blank" rel="noopener noreferrer">
                  <Icon name="Globe" className="h-5 w-5" />
                </a>
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-primary/20 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground/80">
            <div>
              <h4 className="font-semibold text-sm mb-2 text-foreground">Реквизиты</h4>
              <div className="space-y-1">
                <p>Исполнитель: Васенин Алексей Павлович</p>
                <p>Статус: Самозанятый (НПД)</p>
                <p>ИНН: 434587444042</p>
                <p>Email: <a href="mailto:devilrust@yandex.ru" className="text-primary hover:underline">devilrust@yandex.ru</a></p>
                <p className="pt-2 text-muted-foreground/60">Продажа цифровых товаров осуществляется через <a href="https://devrus.gamestores.app/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Донат магазин</a></p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 text-foreground">Юридическая информация</h4>
              <div className="space-y-1">
                <a href="/agreement" className="block hover:text-primary transition-colors">
                  Пользовательское соглашение
                </a>
                <a href="/privacy" className="block hover:text-primary transition-colors">
                  Политика конфиденциальности
                </a>
              </div>
            </div>
          </div>
          
          <div className="text-center text-sm text-muted-foreground">© 2018 DevilRust. Все права защищены.</div>
          <div className="text-center text-xs text-muted-foreground/80 max-w-3xl mx-auto leading-relaxed">
            DevilRust — независимый проект игровых серверов, действующий с 2018 года. Данный сайт не принадлежит и не связан с Valve Corporation или Facepunch Studios. Rust® является зарегистрированным товарным знаком Facepunch Studios. Steam® и логотип Steam являются зарегистрированными товарными знаками Valve Corporation. Все торговые марки являются собственностью их владельцев.
          </div>
        </div>
      </div>
      
      <RulesModal open={isRulesOpen} onOpenChange={setIsRulesOpen} />
    </footer>
  );
};

export default Footer;