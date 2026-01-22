import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { useNavigate } from 'react-router-dom';

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-12 max-w-4xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <Icon name="ArrowLeft" className="mr-2 h-4 w-4" />
          На главную
        </Button>

        <Card className="p-8 space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold">Политика конфиденциальности</h1>
            <p className="text-muted-foreground">Последнее обновление: {new Date().toLocaleDateString('ru-RU')}</p>
          </div>

          <div className="space-y-6">
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">1. Общие положения</h2>
              <p className="text-muted-foreground leading-relaxed">
                Настоящая Политика конфиденциальности определяет порядок обработки и защиты персональных данных пользователей веб-сайта DevilRust (далее — "Сайт"). Использование Сайта означает безоговорочное согласие пользователя с настоящей Политикой и условиями обработки его персональных данных.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Администрация Сайта соблюдает законодательство Российской Федерации в области защиты персональных данных, включая Федеральный закон № 152-ФЗ "О персональных данных".
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">2. Сбор и использование данных Steam</h2>
              <p className="text-muted-foreground leading-relaxed">
                При авторизации через Steam мы получаем и обрабатываем следующую информацию:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Steam ID (уникальный идентификатор пользователя)</li>
                <li>Имя профиля Steam</li>
                <li>Аватар профиля Steam</li>
                <li>Публичную информацию профиля Steam</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed">
                Данная информация используется исключительно для:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Идентификации пользователя на Сайте</li>
                <li>Предоставления доступа к функционалу Сайта</li>
                <li>Управления игровым балансом и бонусами</li>
                <li>Обработки обращений в службу поддержки</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed">
                Мы не получаем доступ к вашему паролю Steam, платежной информации или другим конфиденциальным данным вашего аккаунта Steam.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">3. Ежедневный бонус и виртуальная валюта</h2>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 space-y-2">
                <p className="font-semibold text-amber-600 dark:text-amber-500">⚠️ ВАЖНО:</p>
                <p className="text-muted-foreground leading-relaxed">
                  Ежедневный бонус является бесплатной игровой механикой. Награды в виде "рублей" (₽) — это <strong>виртуальная внутриигровая валюта</strong>, которая:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li><strong>НЕ является реальными деньгами</strong></li>
                  <li><strong>НЕ может быть переведена в реальные деньги</strong></li>
                  <li><strong>НЕ подлежит выводу или обмену на реальную валюту</strong></li>
                  <li>Может быть использована только для покупки внутриигровых предметов в магазине донатов</li>
                  <li>Не имеет реальной денежной стоимости</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed">
                  Виртуальная валюта предоставляется бесплатно и не требует внесения реальных денежных средств. Использование ежедневного бонуса не является азартной игрой и не подпадает под действие законодательства о лотереях и азартных играх.
                </p>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">4. Cookies и технологии отслеживания</h2>
              <p className="text-muted-foreground leading-relaxed">
                Сайт использует cookies и локальное хранилище браузера для:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Сохранения информации о сессии пользователя</li>
                <li>Отслеживания получения ежедневных бонусов</li>
                <li>Улучшения пользовательского опыта</li>
                <li>Аналитики посещаемости Сайта</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed">
                Вы можете отключить использование cookies в настройках вашего браузера, однако это может привести к ограничению функционала Сайта.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">5. Защита персональных данных</h2>
              <p className="text-muted-foreground leading-relaxed">
                Администрация Сайта принимает необходимые организационные и технические меры для защиты персональных данных пользователей от неправомерного доступа, уничтожения, изменения, блокирования, копирования, распространения, а также от иных неправомерных действий.
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Данные передаются по защищенному протоколу HTTPS</li>
                <li>Доступ к базе данных имеют только авторизованные лица</li>
                <li>Регулярное обновление систем безопасности</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">6. Передача данных третьим лицам</h2>
              <p className="text-muted-foreground leading-relaxed">
                Персональные данные пользователей могут быть переданы третьим лицам только:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>С согласия пользователя</li>
                <li>По требованию уполномоченных государственных органов в случаях, предусмотренных законодательством РФ</li>
                <li>В случае передачи Сайта во владение другому лицу (с уведомлением пользователей)</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed">
                Мы <strong>НЕ продаем и НЕ передаем</strong> персональные данные третьим лицам в коммерческих целях.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">7. Права пользователей</h2>
              <p className="text-muted-foreground leading-relaxed">
                Пользователи имеют право:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Получать информацию о своих персональных данных, обрабатываемых Сайтом</li>
                <li>Требовать уточнения, блокирования или удаления своих персональных данных</li>
                <li>Отозвать согласие на обработку персональных данных</li>
                <li>Обжаловать действия или бездействие Администрации в уполномоченный орган по защите прав субъектов персональных данных</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed">
                Для реализации своих прав пользователь может обратиться в службу поддержки через раздел "Поддержка" на Сайте.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">8. Соответствие законодательству РФ</h2>
              <p className="text-muted-foreground leading-relaxed">
                Администрация Сайта гарантирует:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Сайт не нарушает законодательство Российской Федерации</li>
                <li>Не содержит материалов, запрещенных на территории РФ</li>
                <li>Не пропагандирует насилие, экстремизм или иную запрещенную деятельность</li>
                <li>Соблюдает требования законодательства о защите персональных данных</li>
                <li>Не предоставляет услуги азартных игр</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">9. Изменения Политики конфиденциальности</h2>
              <p className="text-muted-foreground leading-relaxed">
                Администрация Сайта оставляет за собой право вносить изменения в настоящую Политику конфиденциальности. Новая редакция Политики вступает в силу с момента ее размещения на Сайте. Продолжение использования Сайта после внесения изменений означает согласие пользователя с новой редакцией Политики.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">10. Контактная информация</h2>
              <p className="text-muted-foreground leading-relaxed">
                По вопросам, связанным с обработкой персональных данных и настоящей Политикой конфиденциальности, вы можете обратиться в службу поддержки через раздел <a href="/support" className="text-primary hover:underline">"Поддержка"</a> на нашем Сайте.
              </p>
            </section>

            <section className="space-y-3 pt-6 border-t">
              <p className="text-sm text-muted-foreground italic">
                Используя данный Сайт, вы подтверждаете, что прочитали и согласны с настоящей Политикой конфиденциальности.
              </p>
            </section>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Privacy;
