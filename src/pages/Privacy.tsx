import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { useNavigate } from 'react-router-dom';

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-6 md:py-12 max-w-4xl px-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-4 md:mb-6"
        >
          <Icon name="ArrowLeft" className="mr-2 h-4 w-4" />
          На главную
        </Button>

        <Card className="p-4 md:p-8 space-y-6 md:space-y-8">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-4xl font-bold leading-tight">Политика конфиденциальности</h1>
            <p className="text-sm md:text-base text-muted-foreground">Обновлённая версия от 26.02.2026</p>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-500 mb-1">ℹ️ Важно</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Донат-магазин DevilRust работает на технической платформе{' '}
              <a href="https://gamestores.ru" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">GameStores</a>.
              Настоящая Политика является дополнением к{' '}
              <a href="https://devilrust.ru/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Политике конфиденциальности GameStores</a>
              {' '}и применяется ко всем посетителям сайта DevilRust и страниц магазина.
            </p>
          </div>

          <div className="space-y-6 md:space-y-8">

            <section className="space-y-2 md:space-y-3">
              <h2 className="text-xl md:text-2xl font-semibold">1. Общие положения</h2>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Настоящая Политика конфиденциальности описывает, какие данные могут обрабатываться при использовании сайта DevilRust.ru, игровых серверов и страниц донат-магазина на платформе GameStores.
              </p>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Администрация сайта (ИП Васенин Алексей Павлович, ИНН: 434587444042) соблюдает законодательство Российской Федерации в области защиты персональных данных, включая Федеральный закон № 152-ФЗ «О персональных данных».
              </p>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Использование Сайта означает согласие Пользователя с настоящей Политикой. Если Пользователь не согласен — он должен прекратить использование Сайта.
              </p>
            </section>

            <section className="space-y-2 md:space-y-3">
              <h2 className="text-xl md:text-2xl font-semibold">2. Термины</h2>
              <div className="text-sm md:text-base text-muted-foreground space-y-2">
                <p><strong>Администрация / Продавец</strong> — ИП Васенин Алексей Павлович, владелец проекта DevilRust.</p>
                <p><strong>Оператор платформы</strong> — лицо, администрирующее техническую платформу GameStores.</p>
                <p><strong>Пользователь</strong> — лицо, посещающее Сайт и/или использующее функциональность донат-магазина.</p>
                <p><strong>Сторонние сервисы</strong> — сервисы, не принадлежащие Администрации, используемые для работы платформы (аналитика, защита, хостинг).</p>
              </div>
            </section>

            <section className="space-y-2 md:space-y-3">
              <h2 className="text-xl md:text-2xl font-semibold">3. Сбор и использование данных Steam</h2>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                При авторизации через Steam мы получаем и обрабатываем следующую информацию:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4 text-sm md:text-base">
                <li>Steam ID (уникальный технический идентификатор аккаунта)</li>
                <li>Имя профиля Steam</li>
                <li>Аватар профиля Steam</li>
                <li>Публичную информацию профиля Steam</li>
              </ul>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Данная информация используется исключительно для:
              </p>
              <ul className="list-disc list-inside space-y-1 md:space-y-2 text-sm md:text-base text-muted-foreground ml-2 md:ml-4">
                <li>Идентификации пользователя на Сайте и в донат-магазине</li>
                <li>Предоставления доступа к функционалу Сайта</li>
                <li>Управления игровым балансом и бонусами</li>
                <li>Выдачи приобретённых Товаров/услуг на аккаунт</li>
                <li>Обработки обращений в службу поддержки</li>
              </ul>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Мы не получаем доступ к вашему паролю Steam, платёжной информации или другим конфиденциальным данным вашего аккаунта Steam.
              </p>
            </section>

            <section className="space-y-2 md:space-y-3">
              <h2 className="text-xl md:text-2xl font-semibold">4. Технические данные</h2>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                При посещении Сайта автоматически могут обрабатываться технические сведения, передаваемые браузером/устройством:
              </p>
              <ul className="list-disc list-inside space-y-1 md:space-y-2 text-sm md:text-base text-muted-foreground ml-2 md:ml-4">
                <li>IP-адрес и технические сетевые параметры</li>
                <li>Дата и время доступа</li>
                <li>Сведения о браузере, устройстве, операционной системе, языке</li>
                <li>Страницы, которые посещает пользователь</li>
                <li>Файлы cookie и идентификаторы сессий</li>
              </ul>
            </section>

            <section className="space-y-2 md:space-y-3">
              <h2 className="text-xl md:text-2xl font-semibold">5. Ежедневный бонус и виртуальная валюта</h2>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 md:p-4 space-y-2">
                <p className="text-sm md:text-base font-semibold text-amber-600 dark:text-amber-500">⚠️ ВАЖНО:</p>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  Ежедневный бонус является бесплатной игровой механикой. Награды в виде «рублей» (₽) — это <strong>виртуальная внутриигровая валюта</strong>, которая:
                </p>
                <ul className="list-disc list-inside space-y-1 md:space-y-2 text-sm md:text-base text-muted-foreground ml-2 md:ml-4">
                  <li><strong>НЕ является реальными деньгами</strong></li>
                  <li><strong>НЕ может быть переведена в реальные деньги</strong></li>
                  <li><strong>НЕ подлежит выводу или обмену на реальную валюту</strong></li>
                  <li>Может быть использована только для покупки внутриигровых предметов в магазине</li>
                  <li>Не имеет реальной денежной стоимости</li>
                </ul>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  Виртуальная валюта предоставляется бесплатно и не требует внесения реальных денежных средств. Использование ежедневного бонуса не является азартной игрой и не подпадает под действие законодательства о лотереях и азартных играх.
                </p>
              </div>
            </section>

            <section className="space-y-2 md:space-y-3">
              <h2 className="text-xl md:text-2xl font-semibold">6. Cookies и технологии отслеживания</h2>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Сайт и платформа GameStores используют cookies и локальное хранилище браузера для:
              </p>
              <ul className="list-disc list-inside space-y-1 md:space-y-2 text-sm md:text-base text-muted-foreground ml-2 md:ml-4">
                <li>Корректной работы сайта (сессия, авторизация, настройки)</li>
                <li>Безопасности (антифрод, антибот)</li>
                <li>Отслеживания получения ежедневных бонусов</li>
                <li>Аналитики посещаемости и улучшения качества сервиса</li>
              </ul>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Вы можете отключить cookies в настройках браузера, однако это может привести к ограничению функционала Сайта.
              </p>
            </section>

            <section className="space-y-2 md:space-y-3">
              <h2 className="text-xl md:text-2xl font-semibold">7. Платежи и данные об оплате</h2>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Донат-магазин является технической витриной на платформе GameStores. Оплата осуществляется напрямую Продавцу (Администрации) и/или его платёжным провайдерам.
              </p>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Платформа GameStores не обрабатывает платёжные реквизиты Пользователей (данные банковских карт). Правила обработки платёжных данных определяются Продавцом и/или выбранным им платёжным провайдером.
              </p>
            </section>

            <section className="space-y-2 md:space-y-3">
              <h2 className="text-xl md:text-2xl font-semibold">8. Защита персональных данных</h2>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Администрация принимает необходимые организационные и технические меры для защиты персональных данных пользователей от неправомерного доступа, уничтожения, изменения, блокирования и иных неправомерных действий:
              </p>
              <ul className="list-disc list-inside space-y-1 md:space-y-2 text-sm md:text-base text-muted-foreground ml-2 md:ml-4">
                <li>Данные передаются по защищённому протоколу HTTPS</li>
                <li>Доступ к базе данных имеют только авторизованные лица</li>
                <li>Регулярное обновление систем безопасности</li>
              </ul>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                При этом ни один способ передачи данных через Интернет и ни одна система хранения не могут гарантировать абсолютную безопасность.
              </p>
            </section>

            <section className="space-y-2 md:space-y-3">
              <h2 className="text-xl md:text-2xl font-semibold">9. Передача данных третьим лицам</h2>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Персональные данные пользователей могут быть переданы третьим лицам только:
              </p>
              <ul className="list-disc list-inside space-y-1 md:space-y-2 text-sm md:text-base text-muted-foreground ml-2 md:ml-4">
                <li>Техническим подрядчикам (хостинг, защита, мониторинг, аналитика) — в объёме, необходимом для работы</li>
                <li>Платформе GameStores — технические данные, необходимые для работы витрины (идентификатор заказа, статус, SteamID для выдачи)</li>
                <li>По требованию уполномоченных государственных органов в случаях, предусмотренных законодательством РФ</li>
              </ul>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Мы <strong>НЕ продаём и НЕ передаём</strong> персональные данные третьим лицам в коммерческих целях.
              </p>
            </section>

            <section className="space-y-2 md:space-y-3">
              <h2 className="text-xl md:text-2xl font-semibold">10. Права пользователей</h2>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Пользователи имеют право:
              </p>
              <ul className="list-disc list-inside space-y-1 md:space-y-2 text-sm md:text-base text-muted-foreground ml-2 md:ml-4">
                <li>Получать информацию о своих персональных данных, обрабатываемых Сайтом</li>
                <li>Требовать уточнения, блокирования или удаления своих персональных данных</li>
                <li>Отозвать согласие на обработку персональных данных</li>
                <li>Обжаловать действия или бездействие Администрации в уполномоченный орган по защите прав субъектов персональных данных</li>
              </ul>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Для реализации своих прав обращайтесь по контактам, указанным ниже.
              </p>
            </section>

            <section className="space-y-2 md:space-y-3">
              <h2 className="text-xl md:text-2xl font-semibold">11. Изменение Политики</h2>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Администрация вправе изменять настоящую Политику в одностороннем порядке. Актуальная редакция вступает в силу с момента публикации на Сайте.
              </p>
            </section>

            <section className="space-y-2 md:space-y-3">
              <h2 className="text-xl md:text-2xl font-semibold">12. Контакты</h2>
              <div className="text-sm md:text-base text-muted-foreground space-y-1">
                <p><strong>Продавец:</strong> ИП Васенин Алексей Павлович (ИНН: 434587444042)</p>
                <p><strong>Email (вопросы выдачи, возвратов, данных):</strong>{' '}
                  <a href="mailto:devilrustproject@yandex.ru" className="text-primary hover:underline">devilrustproject@yandex.ru</a>
                </p>
                <p><strong>Email платформы GameStores:</strong>{' '}
                  <a href="mailto:help@gamestores.ru" className="text-primary hover:underline">help@gamestores.ru</a>
                </p>
              </div>
            </section>

            <section className="border-t pt-4">
              <p className="text-muted-foreground text-xs">
                Дата последнего обновления: 26 февраля 2026 года
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                Полная Политика конфиденциальности платформы GameStores:{' '}
                <a href="https://devilrust.ru/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">devilrust.ru/privacy</a>
              </p>
            </section>

          </div>
        </Card>
      </div>
    </div>
  );
};

export default Privacy;
