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
          <h1 className="text-3xl font-bold mb-2">Пользовательское соглашение</h1>
          <p className="text-sm text-muted-foreground mb-2">Редакция от 26.02.2026</p>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-500 mb-1">ℹ️ Важно</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Донат-магазин DevilRust работает на технической платформе{' '}
              <a href="https://gamestores.ru" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">GameStores</a>.
              Платформа предоставляет техническую витрину и инструменты отображения предложений. Платформа не является
              продавцом, не принимает оплату от имени Продавца и не отвечает за исполнение обязательств перед Покупателем.
              Продавцом товаров/услуг выступает Васенин Алексей Павлович, самозанятый (плательщик НПД), ИНН: 434587444042.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Полные документы платформы GameStores:{' '}
              <a href="https://devilrust.ru/agreement" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Пользовательское соглашение GameStores</a>
              {' '}·{' '}
              <a href="https://devilrust.ru/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Политика конфиденциальности GameStores</a>
            </p>
          </div>

          <div className="space-y-6 text-sm">

            <section>
              <h2 className="text-xl font-semibold mb-3">1. Термины и стороны</h2>
              <div className="text-muted-foreground space-y-2">
                <p><strong>Оператор платформы</strong> — лицо, администрирующее техническую платформу GameStores.</p>
                <p><strong>Продавец / Администрация</strong> — Васенин Алексей Павлович, самозанятый (плательщик НПД), ИНН: 434587444042, владелец игрового проекта DevilRust, размещающий предложения на Страницах магазина, принимающий оплату и исполняющий обязательства перед Покупателем.</p>
                <p><strong>Покупатель</strong> — лицо, оформляющее заказ и/или осуществляющее оплату в магазине.</p>
                <p><strong>Пользователь</strong> — любое лицо, посещающее сайт и/или использующее функциональность платформы.</p>
                <p><strong>Товары/услуги</strong> — цифровые товары, внутриигровые предметы, привилегии, подписки и иные блага, предлагаемые Продавцом.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Предмет соглашения</h2>
              <div className="text-muted-foreground space-y-2">
                <p>2.1. Настоящее Соглашение регулирует отношения между Администрацией и Пользователями сайта DevilRust.ru и связанных игровых серверов.</p>
                <p>2.2. Донат-магазин функционирует на технической платформе GameStores, которая предоставляет витрину, формирование заказа и иные технические функции. Отношения по приобретению Товаров/услуг возникают непосредственно между Покупателем и Продавцом (Администрацией).</p>
                <p>2.3. Используя сервисы DevilRust, Пользователь полностью принимает условия настоящего Соглашения, а также{' '}
                  <a href="https://devilrust.ru/agreement" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Пользовательского соглашения GameStores</a>.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Услуги и оплата</h2>
              <div className="text-muted-foreground space-y-2">
                <p>3.1. Администрация предоставляет платные и бесплатные услуги в рамках игрового сервера: доступ к игровым серверам Rust, внутриигровые предметы, премиум-статусы, донат-привилегии и другие цифровые товары.</p>
                <p>3.2. Все платежи по заказам принимаются непосредственно Продавцом и/или указанным им платёжным сервисом. Платформа GameStores не является получателем денежных средств.</p>
                <p>3.3. Все цены указаны в рублях РФ. После успешной оплаты услуги предоставляются в течение 24 часов. В случае технических проблем срок может быть увеличен.</p>
                <p>3.4. Вопросы по оплате (ошибочные платежи, комиссии, возвраты, чеки) решаются между Покупателем и Продавцом.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Возврат средств</h2>
              <div className="text-muted-foreground space-y-2">
                <p>4.1. Возврат средств за приобретённые цифровые товары и услуги возможен только в случае технической невозможности их предоставления по вине Администрации.</p>
                <p>4.2. Возврат не производится, если услуга была предоставлена в полном объёме.</p>
                <p>4.3. Все претензии по Товарам/услугам («не выдано», «выдано не то», «не работает», «не соответствует описанию») и требования о возврате предъявляются Продавцу по контактам, указанным ниже.</p>
                <p>4.4. Заявки на возврат рассматриваются в течение 14 рабочих дней с момента обращения.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Права и обязанности пользователей</h2>
              <div className="text-muted-foreground space-y-2">
                <p>5.1. Пользователь обязуется соблюдать правила поведения на игровых серверах.</p>
                <p>5.2. Запрещается использование читов, багов, эксплойтов и других нечестных методов игры.</p>
                <p>5.3. Администрация вправе заблокировать учётную запись Пользователя без возврата средств в случае нарушения правил.</p>
                <p>5.4. Пользователь несёт полную ответственность за сохранность своих учётных данных.</p>
                <p>5.5. Запрещается использовать Платформу и Страницы магазина для противоправных целей, мошенничества, фишинга, распространения вредоносного ПО и иных действий, нарушающих права третьих лиц.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Ответственность</h2>
              <div className="text-muted-foreground space-y-2">
                <p>6.1. Администрация не несёт ответственности за технические сбои, потерю игровых данных по независящим от неё причинам.</p>
                <p>6.2. Все услуги предоставляются «как есть». Администрация не гарантирует бесперебойную работу серверов 24/7.</p>
                <p>6.3. Платформа GameStores не несёт ответственности за действия/бездействие Продавца и любые последствия отношений Покупателя с Продавцом, а также за работу платёжных провайдеров и иных внешних сервисов.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Персональные данные</h2>
              <div className="text-muted-foreground space-y-2">
                <p>7.1. Администрация обязуется обрабатывать персональные данные Пользователей в соответствии с законодательством РФ (Федеральный закон № 152-ФЗ «О персональных данных»). Подробнее в{' '}
                  <a href="/privacy" className="text-primary hover:underline">Политике конфиденциальности DevilRust</a>.
                </p>
                <p>7.2. Обработка данных Пользователей также осуществляется в соответствии с{' '}
                  <a href="https://devilrust.ru/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Политикой конфиденциальности GameStores</a>.
                </p>
                <p>7.3. Если Пользователь авторизуется через Steam, платформа может использовать технический идентификатор аккаунта (SteamID) для работы функций магазина и передавать его Продавцу в рамках исполнения заказа.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Изменение условий</h2>
              <p className="text-muted-foreground">
                8.1. Администрация вправе изменять условия настоящего Соглашения в одностороннем порядке. Изменения вступают в силу с момента их публикации на сайте.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Контактная информация</h2>
              <div className="text-muted-foreground space-y-1">
                <p><strong>Продавец:</strong> Васенин Алексей Павлович</p>
                <p><strong>Статус:</strong> самозанятый (плательщик НПД)</p>
                <p><strong>ИНН:</strong> 434587444042</p>
                <p><strong>Email (вопросы выдачи, возвратов, оплаты):</strong>{' '}
                  <a href="mailto:devilrustproject@yandex.ru" className="text-primary hover:underline">devilrustproject@yandex.ru</a>
                </p>
                <p><strong>Email платформы GameStores (вопросы работы витрины):</strong>{' '}
                  <a href="mailto:help@gamestores.ru" className="text-primary hover:underline">help@gamestores.ru</a>
                </p>
              </div>
            </section>

            <section className="border-t pt-4">
              <p className="text-muted-foreground text-xs">
                Дата последнего обновления: 26 февраля 2026 года
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                Полные документы платформы GameStores доступны по адресу:{' '}
                <a href="https://devilrust.ru/agreement" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">devilrust.ru/agreement</a>
              </p>
            </section>

          </div>
        </Card>
      </div>
    </div>
  );
};

export default UserAgreement;