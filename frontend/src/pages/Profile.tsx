import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../components/Alert';
import { investorService, startupService } from '../services';
import { extractErrorMessage } from '../services/api';

export function Profile() {
  const { user } = useAuth();

  const ehStartup = user?.role === 'STARTUP';
  const perfil = ehStartup ? user?.startupProfile : user?.investorProfile;

  const [form, setForm] = useState({
    name: user?.name ?? '',
    companyName: perfil && 'companyName' in perfil ? (perfil.companyName ?? '') : '',
    city: perfil?.city ?? '',
    state: perfil?.state ?? 'PE',
    sector: ehStartup && perfil && 'sector' in perfil ? perfil.sector : '',
    stage: ehStartup && perfil && 'stage' in perfil ? perfil.stage : 'Seed',
    description:
      ehStartup && perfil && 'description' in perfil ? perfil.description : '',
    needs: ehStartup && perfil && 'needs' in perfil ? (perfil.needs ?? '') : '',
    sectorInterest:
      !ehStartup && perfil && 'sectorInterest' in perfil ? perfil.sectorInterest : '',
    stageInterest:
      !ehStartup && perfil && 'stageInterest' in perfil ? perfil.stageInterest : '',
    ticketMin:
      !ehStartup && perfil && 'ticketMin' in perfil ? String(perfil.ticketMin) : '50000',
    ticketMax:
      !ehStartup && perfil && 'ticketMax' in perfil ? String(perfil.ticketMax) : '300000',
    bio: !ehStartup && perfil && 'bio' in perfil ? (perfil.bio ?? '') : '',
  });

  const [mensagem, setMensagem] = useState<{ tipo: 'erro' | 'sucesso'; texto: string } | null>(
    null,
  );
  const [salvando, setSalvando] = useState(false);

  function atualizar(campo: keyof typeof form, valor: string) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMensagem(null);
    setSalvando(true);

    try {
      if (ehStartup && perfil) {
        await startupService.update(perfil.id, {
          name: form.name,
          companyName: form.companyName,
          city: form.city,
          state: form.state,
          sector: form.sector,
          stage: form.stage,
          description: form.description,
          needs: form.needs || undefined,
        });
      } else if (perfil) {
        await investorService.update(perfil.id, {
          name: form.name,
          companyName: form.companyName || undefined,
          city: form.city,
          state: form.state,
          sectorInterest: form.sectorInterest,
          stageInterest: form.stageInterest,
          ticketMin: Number(form.ticketMin),
          ticketMax: Number(form.ticketMax),
          bio: form.bio || undefined,
        });
      }

      setMensagem({ tipo: 'sucesso', texto: 'Perfil atualizado com sucesso.' });
    } catch (e) {
      setMensagem({ tipo: 'erro', texto: extractErrorMessage(e) });
    } finally {
      setSalvando(false);
    }
  }

  if (!user || !perfil) {
    return (
      <Alert mensagem="Seu perfil não foi encontrado. Refaça o cadastro para criar o perfil." />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Meu perfil</h1>
        <p className="text-sm text-slate-500">
          Quanto mais completo, melhor o algoritmo te casa com o perfil certo.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card max-w-3xl space-y-4">
        {mensagem && <Alert tipo={mensagem.tipo} mensagem={mensagem.texto} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="p-name" className="label">
              Seu nome
            </label>
            <input
              id="p-name"
              className="input"
              value={form.name}
              onChange={(e) => atualizar('name', e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="p-company" className="label">
              {ehStartup ? 'Nome da startup' : 'Empresa'}
            </label>
            <input
              id="p-company"
              className="input"
              value={form.companyName}
              onChange={(e) => atualizar('companyName', e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="p-city" className="label">
              Cidade
            </label>
            <input
              id="p-city"
              className="input"
              value={form.city}
              onChange={(e) => atualizar('city', e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="p-state" className="label">
              UF
            </label>
            <input
              id="p-state"
              className="input"
              maxLength={2}
              value={form.state}
              onChange={(e) => atualizar('state', e.target.value.toUpperCase())}
              required
            />
          </div>
        </div>

        {ehStartup ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="p-sector" className="label">
                  Setor
                </label>
                <input
                  id="p-sector"
                  className="input"
                  value={form.sector}
                  onChange={(e) => atualizar('sector', e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="p-stage" className="label">
                  Estágio
                </label>
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
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="p-desc" className="label">
                Sobre a startup
              </label>
              <textarea
                id="p-desc"
                className="input min-h-[100px]"
                value={form.description}
                onChange={(e) => atualizar('description', e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="p-needs" className="label">
                O que você procura
              </label>
              <input
                id="p-needs"
                className="input"
                placeholder="Rodada seed, parceria, mentorado..."
                value={form.needs}
                onChange={(e) => atualizar('needs', e.target.value)}
              />
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="p-interest" className="label">
                  Setores de interesse
                </label>
                <input
                  id="p-interest"
                  className="input"
                  value={form.sectorInterest}
                  onChange={(e) => atualizar('sectorInterest', e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="p-stages" className="label">
                  Estágios de interesse
                </label>
                <input
                  id="p-stages"
                  className="input"
                  value={form.stageInterest}
                  onChange={(e) => atualizar('stageInterest', e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="p-tmin" className="label">
                  Ticket mínimo (R$)
                </label>
                <input
                  id="p-tmin"
                  type="number"
                  className="input"
                  value={form.ticketMin}
                  onChange={(e) => atualizar('ticketMin', e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="p-tmax" className="label">
                  Ticket máximo (R$)
                </label>
                <input
                  id="p-tmax"
                  type="number"
                  className="input"
                  value={form.ticketMax}
                  onChange={(e) => atualizar('ticketMax', e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <label htmlFor="p-bio" className="label">
                Sobre você
              </label>
              <textarea
                id="p-bio"
                className="input min-h-[90px]"
                value={form.bio}
                onChange={(e) => atualizar('bio', e.target.value)}
              />
            </div>
          </>
        )}

        <button type="submit" className="btn-primary" disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </form>
    </div>
  );
}