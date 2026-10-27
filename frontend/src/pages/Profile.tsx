import { useState, type FormEvent, type ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../components/Alert';
import { VerificationCard } from '../components/VerificationCard';
import { investorService, startupService } from '../services';
import { extractErrorMessage } from '../services/api';

function Campo({
  id,
  label,
  hint,
  children,
  className = '',
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </div>
  );
}

function comProtocolo(valor: string): string | undefined {
  const limpo = valor.trim();

  if (!limpo) {
    return undefined;
  }

  return /^https?:\/\//i.test(limpo) ? limpo : `https://${limpo}`;
}

export function Profile() {
  const { user, refreshUser } = useAuth();
  const ehStartup = user?.role === 'STARTUP';
  const startup = user?.startupProfile;
  const investidor = user?.investorProfile;

  const [form, setForm] = useState({
    name: user?.name ?? '',
    companyName: (ehStartup ? startup?.companyName : investidor?.companyName) ?? '',
    legalName: startup?.legalName ?? '',
    city: (ehStartup ? startup?.city : investidor?.city) ?? '',
    state: (ehStartup ? startup?.state : investidor?.state) ?? 'PE',
    sector: startup?.sector ?? '',
    stage: startup?.stage ?? 'Seed',
    description: startup?.description ?? '',
    needs: startup?.needs ?? '',
    website: (ehStartup ? startup?.website : investidor?.website) ?? '',
    foundedAt: startup?.foundedAt ? startup.foundedAt.slice(0, 10) : '',
    pitchUrl: startup?.pitchUrl ?? '',
    logoUrl: startup?.logoUrl ?? '',
    businessModel: startup?.businessModel ?? '',
    teamSize: startup?.teamSize ? String(startup.teamSize) : '',
    revenue: startup?.revenue ?? '',
    targetMarket: startup?.targetMarket ?? '',
    traction: startup?.traction ?? '',
    roundTarget: startup?.roundTarget ? String(startup.roundTarget) : '',
    useOfFunds: startup?.useOfFunds ?? '',
    competitors: startup?.competitors ?? '',
    accelerators: startup?.accelerators ?? '',
    awards: startup?.awards ?? '',
    instagram: (ehStartup ? startup?.instagram : investidor?.instagram) ?? '',
    linkedin: (ehStartup ? startup?.linkedin : investidor?.linkedin) ?? '',
    contactEmail: (ehStartup ? startup?.contactEmail : investidor?.contactEmail) ?? '',
    phone: (ehStartup ? startup?.phone : investidor?.phone) ?? '',
    sectorInterest: investidor?.sectorInterest ?? '',
    stageInterest: investidor?.stageInterest ?? '',
    ticketMin: investidor ? String(investidor.ticketMin) : '50000',
    ticketMax: investidor ? String(investidor.ticketMax) : '300000',
    bio: investidor?.bio ?? '',
    investorType: investidor?.investorType ?? '',
    investmentThesis: investidor?.investmentThesis ?? '',
    preferredGeography: investidor?.preferredGeography ?? '',
    portfolioUrl: investidor?.portfolioUrl ?? '',
    experience: investidor?.experience ?? '',
    dealsPerYear: investidor?.dealsPerYear ? String(investidor.dealsPerYear) : '',
    horizon: investidor?.horizon ?? '',
    leadsRound: investidor?.leadsRound ?? false,
    boardSeat: investidor?.boardSeat ?? false,
    valueAdd: investidor?.valueAdd ?? '',
  });

  const [mensagem, setMensagem] = useState<{ tipo: 'erro' | 'sucesso'; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  function atualizar(campo: Exclude<keyof typeof form, 'leadsRound' | 'boardSeat'>, valor: string) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  function alternar(campo: 'leadsRound' | 'boardSeat') {
    setForm((atual) => ({ ...atual, [campo]: !atual[campo] }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMensagem(null);
    setSalvando(true);

    try {
      if (ehStartup && startup) {
        await startupService.update(startup.id, {
          name: form.name,
          companyName: form.companyName,
          legalName: form.legalName || undefined,
          city: form.city,
          state: form.state,
          sector: form.sector,
          stage: form.stage,
          description: form.description,
          needs: form.needs || undefined,
          website: comProtocolo(form.website),
          foundedAt: form.foundedAt || undefined,
          pitchUrl: comProtocolo(form.pitchUrl),
          logoUrl: comProtocolo(form.logoUrl),
          businessModel: form.businessModel || undefined,
          teamSize: form.teamSize ? Number(form.teamSize) : undefined,
          revenue: form.revenue || undefined,
          targetMarket: form.targetMarket || undefined,
          traction: form.traction || undefined,
          roundTarget: form.roundTarget ? Number(form.roundTarget) : undefined,
          useOfFunds: form.useOfFunds || undefined,
          competitors: form.competitors || undefined,
          accelerators: form.accelerators || undefined,
          awards: form.awards || undefined,
          instagram: form.instagram || undefined,
          linkedin: comProtocolo(form.linkedin),
          contactEmail: form.contactEmail || undefined,
          phone: form.phone || undefined,
        });
      } else if (!ehStartup && investidor) {
        await investorService.update(investidor.id, {
          name: form.name,
          companyName: form.companyName || undefined,
          city: form.city,
          state: form.state,
          sectorInterest: form.sectorInterest,
          stageInterest: form.stageInterest,
          ticketMin: Number(form.ticketMin),
          ticketMax: Number(form.ticketMax),
          bio: form.bio || undefined,
          investorType: form.investorType || undefined,
          website: comProtocolo(form.website),
          linkedin: comProtocolo(form.linkedin),
          investmentThesis: form.investmentThesis || undefined,
          preferredGeography: form.preferredGeography || undefined,
          portfolioUrl: comProtocolo(form.portfolioUrl),
          contactEmail: form.contactEmail || undefined,
          phone: form.phone || undefined,
          experience: form.experience || undefined,
          instagram: form.instagram || undefined,
          dealsPerYear: form.dealsPerYear ? Number(form.dealsPerYear) : undefined,
          horizon: form.horizon || undefined,
          leadsRound: form.leadsRound,
          boardSeat: form.boardSeat,
          valueAdd: form.valueAdd || undefined,
        });
      }

      await refreshUser();
      setMensagem({ tipo: 'sucesso', texto: 'Perfil atualizado com sucesso.' });
    } catch (e) {
      setMensagem({ tipo: 'erro', texto: extractErrorMessage(e) });
    } finally {
      setSalvando(false);
    }
  }

  if (!user || (ehStartup ? !startup : !investidor)) {
    return <Alert mensagem="Seu perfil não foi encontrado. Refaça o cadastro para criar o perfil." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Identidade</p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-slate-900 dark:text-areia-100">Meu perfil</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Tudo o que aparece no seu perfil público pode ser editado aqui. Quanto mais completo, melhor a qualidade das
          conexões.
        </p>
      </div>

      <VerificationCard />

      <form onSubmit={handleSubmit} className="card max-w-4xl space-y-7">
        {mensagem && <Alert tipo={mensagem.tipo} mensagem={mensagem.texto} />}

        <section className="space-y-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-areia-100">Identidade</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Nome da conta e nome público do {ehStartup ? 'negócio' : 'investidor'}.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id="p-name" label="Seu nome">
              <input
                id="p-name"
                className="input"
                value={form.name}
                onChange={(e) => atualizar('name', e.target.value)}
                required
              />
            </Campo>
            <Campo id="p-company" label={ehStartup ? 'Nome da startup' : 'Empresa ou family office'}>
              <input
                id="p-company"
                className="input"
                value={form.companyName}
                onChange={(e) => atualizar('companyName', e.target.value)}
              />
            </Campo>
            {ehStartup ? (
              <Campo
                id="p-legal"
                label="Razão social"
                hint="Nome jurídico da empresa. Aparece no perfil público apenas se preenchido."
              >
                <input
                  id="p-legal"
                  className="input"
                  value={form.legalName}
                  onChange={(e) => atualizar('legalName', e.target.value)}
                />
              </Campo>
            ) : null}
          </div>
        </section>

        <section className="space-y-4 border-t border-slate-100 pt-6 dark:border-noite-700">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-areia-100">
              {ehStartup ? 'Operação' : 'Perfil de investimento'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {ehStartup
                ? 'Setor, estágio e localização usados no cálculo de compatibilidade.'
                : 'Tese, tickets e geografia usados para encontrar startups aderentes.'}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id="p-city" label="Cidade">
              <input
                id="p-city"
                className="input"
                value={form.city}
                onChange={(e) => atualizar('city', e.target.value)}
              />
            </Campo>
            <Campo id="p-state" label="UF">
              <input
                id="p-state"
                className="input"
                maxLength={2}
                value={form.state}
                onChange={(e) => atualizar('state', e.target.value.toUpperCase())}
                required
              />
            </Campo>
          </div>

          {ehStartup ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo id="p-sector" label="Setor">
                  <input
                    id="p-sector"
                    className="input"
                    value={form.sector}
                    onChange={(e) => atualizar('sector', e.target.value)}
                    required
                  />
                </Campo>
                <Campo id="p-stage" label="Estágio">
                  <select
                    id="p-stage"
                    className="input"
                    value={form.stage}
                    onChange={(e) => atualizar('stage', e.target.value)}
                  >
                    <option>Ideação</option>
                    <option>Pre-seed</option>
                    <option>Seed</option>
                    <option>Série A</option>
                    <option>Série B</option>
                  </select>
                </Campo>
              </div>

              <Campo id="p-desc" label="Sobre a startup">
                <textarea
                  id="p-desc"
                  className="input min-h-[110px]"
                  value={form.description}
                  onChange={(e) => atualizar('description', e.target.value)}
                  required
                />
              </Campo>

              <Campo id="p-needs" label="O que a startup procura">
                <textarea
                  id="p-needs"
                  className="input min-h-[80px]"
                  placeholder="Rodada seed, parceria comercial, mentorado..."
                  value={form.needs}
                  onChange={(e) => atualizar('needs', e.target.value)}
                />
              </Campo>

              <div className="grid gap-4 sm:grid-cols-2">
                <Campo id="p-business" label="Modelo de negócio" hint="Ex.: SaaS B2B, marketplace, assinatura.">
                  <input
                    id="p-business"
                    className="input"
                    value={form.businessModel}
                    onChange={(e) => atualizar('businessModel', e.target.value)}
                  />
                </Campo>
                <Campo id="p-revenue" label="Receita ou tração" hint="Faixa de faturamento ou principal métrica.">
                  <input
                    id="p-revenue"
                    className="input"
                    value={form.revenue}
                    onChange={(e) => atualizar('revenue', e.target.value)}
                  />
                </Campo>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Campo id="p-team" label="Tamanho do time">
                  <input
                    id="p-team"
                    type="number"
                    min={1}
                    className="input"
                    value={form.teamSize}
                    onChange={(e) => atualizar('teamSize', e.target.value)}
                  />
                </Campo>
                <Campo id="p-founded" label="Data de fundação">
                  <input
                    id="p-founded"
                    type="date"
                    className="input"
                    value={form.foundedAt}
                    onChange={(e) => atualizar('foundedAt', e.target.value)}
                  />
                </Campo>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Campo id="p-target" label="Mercado-alvo" hint="Quem compra e onde a startup atua.">
                  <input
                    id="p-target"
                    className="input"
                    placeholder="Ex.: operadores portuários do Nordeste"
                    value={form.targetMarket}
                    onChange={(e) => atualizar('targetMarket', e.target.value)}
                  />
                </Campo>
                <Campo id="p-round" label="Meta da rodada (R$)">
                  <input
                    id="p-round"
                    type="number"
                    min={0}
                    className="input"
                    placeholder="Ex.: 1500000"
                    value={form.roundTarget}
                    onChange={(e) => atualizar('roundTarget', e.target.value)}
                  />
                </Campo>
              </div>

              <Campo id="p-traction" label="Tração e resultados" hint="Métricas, clientes, crescimento, marcos.">
                <textarea
                  id="p-traction"
                  className="input min-h-[90px]"
                  value={form.traction}
                  onChange={(e) => atualizar('traction', e.target.value)}
                />
              </Campo>

              <Campo id="p-usefunds" label="Uso dos recursos">
                <textarea
                  id="p-usefunds"
                  className="input min-h-[90px]"
                  placeholder="Produto, contratações, expansão comercial..."
                  value={form.useOfFunds}
                  onChange={(e) => atualizar('useOfFunds', e.target.value)}
                />
              </Campo>

              <div className="grid gap-4 sm:grid-cols-2">
                <Campo id="p-competitors" label="Concorrentes">
                  <textarea
                    id="p-competitors"
                    className="input min-h-[80px]"
                    value={form.competitors}
                    onChange={(e) => atualizar('competitors', e.target.value)}
                  />
                </Campo>
                <Campo id="p-accelerators" label="Aceleradoras e programas">
                  <textarea
                    id="p-accelerators"
                    className="input min-h-[80px]"
                    placeholder="Ex.: Porto Digital, Startup PE..."
                    value={form.accelerators}
                    onChange={(e) => atualizar('accelerators', e.target.value)}
                  />
                </Campo>
              </div>

              <Campo id="p-awards" label="Prêmios e reconhecimentos">
                <textarea
                  id="p-awards"
                  className="input min-h-[80px]"
                  value={form.awards}
                  onChange={(e) => atualizar('awards', e.target.value)}
                />
              </Campo>
            </>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo id="p-interest" label="Setores de interesse">
                  <input
                    id="p-interest"
                    className="input"
                    value={form.sectorInterest}
                    onChange={(e) => atualizar('sectorInterest', e.target.value)}
                    required
                  />
                </Campo>
                <Campo id="p-stages" label="Estágios de interesse">
                  <input
                    id="p-stages"
                    className="input"
                    value={form.stageInterest}
                    onChange={(e) => atualizar('stageInterest', e.target.value)}
                    required
                  />
                </Campo>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Campo
                  id="p-investor-type"
                  label="Tipo de investidor"
                  hint="Anjo, fundo, family office, corporate venture."
                >
                  <input
                    id="p-investor-type"
                    className="input"
                    value={form.investorType}
                    onChange={(e) => atualizar('investorType', e.target.value)}
                  />
                </Campo>
                <Campo id="p-geography" label="Geografia preferida">
                  <input
                    id="p-geography"
                    className="input"
                    placeholder="Nordeste, Brasil, LATAM..."
                    value={form.preferredGeography}
                    onChange={(e) => atualizar('preferredGeography', e.target.value)}
                  />
                </Campo>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Campo id="p-tmin" label="Ticket mínimo (R$)">
                  <input
                    id="p-tmin"
                    type="number"
                    className="input"
                    value={form.ticketMin}
                    onChange={(e) => atualizar('ticketMin', e.target.value)}
                    required
                  />
                </Campo>
                <Campo id="p-tmax" label="Ticket máximo (R$)">
                  <input
                    id="p-tmax"
                    type="number"
                    className="input"
                    value={form.ticketMax}
                    onChange={(e) => atualizar('ticketMax', e.target.value)}
                    required
                  />
                </Campo>
              </div>

              <Campo id="p-bio" label="Sobre você">
                <textarea
                  id="p-bio"
                  className="input min-h-[90px]"
                  value={form.bio}
                  onChange={(e) => atualizar('bio', e.target.value)}
                />
              </Campo>

              <Campo id="p-thesis" label="Tese de investimento">
                <textarea
                  id="p-thesis"
                  className="input min-h-[90px]"
                  value={form.investmentThesis}
                  onChange={(e) => atualizar('investmentThesis', e.target.value)}
                />
              </Campo>

              <Campo id="p-experience" label="Experiência">
                <textarea
                  id="p-experience"
                  className="input min-h-[90px]"
                  placeholder="Investimentos anteriores, áreas de atuação, conselhos..."
                  value={form.experience}
                  onChange={(e) => atualizar('experience', e.target.value)}
                />
              </Campo>

              <div className="grid gap-4 sm:grid-cols-2">
                <Campo id="p-deals" label="Investimentos por ano" hint="Quantos cheques você costuma assinar.">
                  <input
                    id="p-deals"
                    type="number"
                    min={0}
                    className="input"
                    value={form.dealsPerYear}
                    onChange={(e) => atualizar('dealsPerYear', e.target.value)}
                  />
                </Campo>
                <Campo id="p-horizon" label="Horizonte de investimento" hint="Ex.: 5 a 7 anos, longo prazo.">
                  <input
                    id="p-horizon"
                    className="input"
                    value={form.horizon}
                    onChange={(e) => atualizar('horizon', e.target.value)}
                  />
                </Campo>
              </div>

              <Campo
                id="p-valueadd"
                label="Como você agrega valor"
                hint="Rede, vendas, produto, governança, contratações."
              >
                <textarea
                  id="p-valueadd"
                  className="input min-h-[90px]"
                  value={form.valueAdd}
                  onChange={(e) => atualizar('valueAdd', e.target.value)}
                />
              </Campo>

              <fieldset className="grid gap-3 sm:grid-cols-2">
                <legend className="label">Forma de atuação</legend>
                <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm dark:border-noite-700">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-laco-600 focus:ring-laco-500"
                    checked={form.leadsRound}
                    onChange={() => alternar('leadsRound')}
                  />
                  <span>
                    <span className="block font-medium text-slate-800 dark:text-areia-100">Lidera rodadas</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Costuma montar e liderar a rodada, não só participar.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm dark:border-noite-700">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-laco-600 focus:ring-laco-500"
                    checked={form.boardSeat}
                    onChange={() => alternar('boardSeat')}
                  />
                  <span>
                    <span className="block font-medium text-slate-800 dark:text-areia-100">Assume conselho</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Aceita cadeira no conselho ou atuação mais próxima.
                    </span>
                  </span>
                </label>
              </fieldset>
            </>
          )}
        </section>

        <section className="space-y-4 border-t border-slate-100 pt-6 dark:border-noite-700">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-areia-100">
              Presença e contato
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Esses dados aparecem no seu perfil público. Você pode deixar em branco.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id="p-website" label={ehStartup ? 'Site da startup' : 'Site pessoal ou da empresa'}>
              <input
                id="p-website"
                className="input"
                inputMode="url"
                placeholder="https://"
                value={form.website}
                onChange={(e) => atualizar('website', e.target.value)}
              />
            </Campo>
            <Campo id="p-linkedin" label="LinkedIn">
              <input
                id="p-linkedin"
                className="input"
                inputMode="url"
                placeholder="https://linkedin.com/in/..."
                value={form.linkedin}
                onChange={(e) => atualizar('linkedin', e.target.value)}
              />
            </Campo>
            <Campo id="p-instagram" label="Instagram" hint="Perfil ou @ da marca.">
              <input
                id="p-instagram"
                className="input"
                placeholder="@suastartup"
                value={form.instagram}
                onChange={(e) => atualizar('instagram', e.target.value)}
              />
            </Campo>
          </div>

          {ehStartup ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo id="p-pitch" label="Link do pitch">
                <input
                  id="p-pitch"
                  className="input"
                  inputMode="url"
                  placeholder="https://"
                  value={form.pitchUrl}
                  onChange={(e) => atualizar('pitchUrl', e.target.value)}
                />
              </Campo>
              <Campo id="p-logo" label="Logo (URL da imagem)">
                <input
                  id="p-logo"
                  className="input"
                  inputMode="url"
                  placeholder="https://"
                  value={form.logoUrl}
                  onChange={(e) => atualizar('logoUrl', e.target.value)}
                />
              </Campo>
            </div>
          ) : (
            <Campo id="p-portfolio" label="Portfólio">
              <input
                id="p-portfolio"
                className="input"
                inputMode="url"
                placeholder="https://"
                value={form.portfolioUrl}
                onChange={(e) => atualizar('portfolioUrl', e.target.value)}
              />
            </Campo>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id="p-contact-email" label="E-mail de contato">
              <input
                id="p-contact-email"
                type="email"
                className="input"
                value={form.contactEmail}
                onChange={(e) => atualizar('contactEmail', e.target.value)}
              />
            </Campo>
            <Campo id="p-phone" label="Telefone ou WhatsApp">
              <input
                id="p-phone"
                type="tel"
                className="input"
                value={form.phone}
                onChange={(e) => atualizar('phone', e.target.value)}
              />
            </Campo>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5 dark:border-noite-700">
          <button type="submit" className="btn-primary" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar alterações'}
          </button>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Alterações de perfil não mexem nos seus consentimentos de privacidade.
          </p>
        </div>
      </form>
    </div>
  );
}
