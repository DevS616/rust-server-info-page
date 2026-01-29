import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

const UserAgreement = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container py-12">
        <Button variant="ghost" className="mb-6" asChild>
          <a href="/">
            <Icon name="ArrowLeft" className="mr-2 h-4 w-4" />
            Вернуться на главную
          </a>
        </Button>

        <Card className="p-8 max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Пользовательское соглашение</h1>
          
          <div className="space-y-6 text-sm">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Общие положения</h2>
              <p className="text-muted-foreground">
                Настоящее Пользовательское соглашение (далее — «Соглашение») регулирует отношения между 
                индивидуальным предпринимателем Васениным Алексеем Павловичем (ИНН: 434587444042) 
                (далее — «Администрация») и пользователями сайта DevilRust.ru и связанных игровых серверов 
                (далее — «Пользователи»).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Предмет соглашения</h2>
              <p className="text-muted-foreground mb-2">
                2.1. Администрация предоставляет Пользователям доступ к игровым серверам Rust, 
                интернет-магазину внутриигровых предметов и услуг, а также сопутствующим сервисам.
              </p>
              <p className="text-muted-foreground">
                2.2. Используя сервисы DevilRust, Пользователь полностью принимает условия настоящего Соглашения.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Услуги и оплата</h2>
              <p className="text-muted-foreground mb-2">
                3.1. Администрация предоставляет платные и бесплатные услуги в рамках игрового сервера.
              </p>
              <p className="text-muted-foreground mb-2">
                3.2. Платные услуги включают в себя внутриигровые предметы, премиум-статусы, донат-привилегии 
                и другие цифровые товары.
              </p>
              <p className="text-muted-foreground mb-2">
                3.3. Оплата производится через интегрированные платежные системы. Все цены указаны в рублях РФ.
              </p>
              <p className="text-muted-foreground">
                3.4. После оплаты услуги предоставляются в течение 24 часов. В случае технических проблем 
                срок может быть увеличен.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Возврат средств</h2>
              <p className="text-muted-foreground mb-2">
                4.1. Возврат средств за приобретенные цифровые товары и услуги возможен только в случае 
                технической невозможности их предоставления по вине Администрации.
              </p>
              <p className="text-muted-foreground mb-2">
                4.2. Возврат не производится, если услуга была предоставлена в полном объеме.
              </p>
              <p className="text-muted-foreground">
                4.3. Заявки на возврат рассматриваются в течение 14 рабочих дней с момента обращения.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Права и обязанности пользователей</h2>
              <p className="text-muted-foreground mb-2">
                5.1. Пользователь обязуется соблюдать правила поведения на игровых серверах.
              </p>
              <p className="text-muted-foreground mb-2">
                5.2. Запрещается использование читов, багов, эксплойтов и других нечестных методов игры.
              </p>
              <p className="text-muted-foreground mb-2">
                5.3. Администрация вправе заблокировать учетную запись Пользователя без возврата средств 
                в случае нарушения правил.
              </p>
              <p className="text-muted-foreground">
                5.4. Пользователь несет полную ответственность за сохранность своих учетных данных.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Ответственность</h2>
              <p className="text-muted-foreground mb-2">
                6.1. Администрация не несет ответственности за технические сбои, потерю игровых данных 
                по независящим от нее причинам.
              </p>
              <p className="text-muted-foreground">
                6.2. Все услуги предоставляются «как есть». Администрация не гарантирует бесперебойную 
                работу серверов 24/7.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Персональные данные</h2>
              <p className="text-muted-foreground">
                7.1. Администрация обязуется обрабатывать персональные данные Пользователей в соответствии 
                с законодательством РФ. Подробнее в{' '}
                <a href="/privacy" className="text-primary hover:underline">
                  Политике конфиденциальности
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Изменение условий</h2>
              <p className="text-muted-foreground">
                8.1. Администрация вправе изменять условия настоящего Соглашения в одностороннем порядке. 
                Изменения вступают в силу с момента их публикации на сайте.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Контактная информация</h2>
              <div className="text-muted-foreground space-y-1">
                <p><strong>ИП:</strong> Васенин Алексей Павлович</p>
                <p><strong>ИНН:</strong> 434587444042</p>
                <p><strong>Email:</strong> <a href="mailto:devilrust@yandex.ru" className="text-primary hover:underline">devilrust@yandex.ru</a></p>
              </div>
            </section>

            <section>
              <p className="text-muted-foreground text-xs">
                Дата последнего обновления: 29 января 2026 года
              </p>
            </section>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default UserAgreement;
