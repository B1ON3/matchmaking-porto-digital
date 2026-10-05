import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../components/Alert';
import { extractErrorMessage } from '../services/api';

type Tipo = 'STARTUP' | 'INVESTOR';

export function Register() {
  const { register, user } = useAuth();
  const navigate = useNavigate();

  const [tipo, setTipo] = useState<Tipo>('STARTUP');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    companyName: '',
    sector: '',
    description: '',
    stage: 'Seed',
    city: 'Recife',
    state: 'PE',
    sectorInterest: '',
    stageInterest: 'Seed',
    ticketMin: '50000',
    ticketMax: '300000',
    bio: '',
  });
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  function atualizar(campo: keyof typeof form, valor: string) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro('');
    setEnviando(true);

    try {
      if (tipo === 'STARTUP') {
        await register({
          name: form.name,
          email: form.email,
          password: form.password,
          role: 'STARTUP',
          startup: {
            companyName: form.companyName,
            sector: form.sector,
            description: form.description,
            stage: form.stage,
            city: form.city,
            state: form.state,
          },
        });
      } else {
        await register({
          name: form.name,
          email: form.email,
          password: form.password,
          role: 'INVESTOR',
          investor: {
            companyName: form.companyName || undefined,
            sectorInterest: form.sectorInterest,
            stageInterest: form.stageInterest,
            ticketMin: Number(form.ticketMin),
            ticketMax: Number(form.ticketMax),
            city: form.city,
            state: form.state,
            bio: form.bio || undefined,
          },
        });
      }

      navigate('/dashboard');
    } catch (e) {
      setErro(extractErrorMessage(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Criar conta</h1>
          <p className="mt-1 text-sm text-slate-500">
            Escolha seu perfil pra gente calcular a compatibilidade certa
          </p>
        </div>

        <div className="mb-5 flex gap-2">
          {(['STARTUP', 'INVESTOR'] as Tipo[]).map((opcao) => (
            <button
              key={opcao}
              type="button"
              onClick={() => setTipo(opcao)}
              className={tipo === opcao ? 'btn-primary flex-1' : 'btn-secondary flex-1'}
            >
              {opcao === 'STARTUP' ? 'Sou startup' : 'Sou investidor anjo'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {erro && <Alert mensagem={erro} />}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="label">
                Seu nome
              </label>
              <input
                id="name"
                className="input"
                value={form.name}
                onChange={(e) => atualizar('name', e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="label">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => atualizar('email', e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="label">
              Senha
            </label>
            <input
              id="password"
              type="password"
              className="input"
              value={form.password}
              onChange={(e) => atualizar('password', e.target.value)}
              placeholder="mínimo de 6 caracteres"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="companyName" className="label">
                {tipo === 'STARTUP' ? 'Nome da startup' : 'Empresa (opcional)'}
              </label>
              <input
                id="companyName"
                className="input"
                value={form.companyName}
                onChange={(e) => atualizar('companyName', e.target.value)}
                required={tipo === 'STARTUP'}
              />
            </div>
            <div>
              <label htmlFor="city" className="label">
                Cidade
              </label>
              <input
                id="city"
                className="input"
                value={form.city}
                onChange={(e) => atualizar('city', e.target.value)}
              />
            </div>
          </div>

          {tipo === 'STARTUP' ? (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="sector" className="label">
                    Setor
                  </label>
                  <input
                    id="sector"
                    className="input"
                    placeholder="Tecnologia"
                    value={form.sector}
                    onChange={(e) => atualizar('sector', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="stage" className="label">
                    Estágio
                  </label>
                  <select
                    id="stage"
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
                <div>
                  <label htmlFor="state" className="label">
                    UF
                  </label>
                  <input
                    id="state"
                    className="input"
                    maxLength={2}
                    value={form.state}
                    onChange={(e) => atualizar('state', e.target.value.toUpperCase())}
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="description" className="label">
                  Sobre a startup
                </label>
                <textarea
                  id="description"
                  className="input min-h-[90px]"
                  value={form.description}
                  onChange={(e) => atualizar('description', e.target.value)}
                  required
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label htmlFor="sectorInterest" className="label">
                    Setores de interesse
                  </label>
                  <input
                    id="sectorInterest"
                    className="input"
                    placeholder="Tecnologia, Design"
                    value={form.sectorInterest}
                    onChange={(e) => atualizar('sectorInterest', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="state" className="label">
                    UF
                  </label>
                  <input
                    id="state"
                    className="input"
                    maxLength={2}
                    value={form.state}
                    onChange={(e) => atualizar('state', e.target.value.toUpperCase())}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="stageInterest" className="label">
                    Estágios
                  </label>
                  <input
                    id="stageInterest"
                    className="input"
                    placeholder="Seed, Pre-seed"
                    value={form.stageInterest}
                    onChange={(e) => atualizar('stageInterest', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="ticketMin" className="label">
                    Ticket mínimo (R$)
                  </label>
                  <input
                    id="ticketMin"
                    type="number"
                    className="input"
                    value={form.ticketMin}
                    onChange={(e) => atualizar('ticketMin', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="ticketMax" className="label">
                    Ticket máximo (R$)
                  </label>
                  <input
                    id="ticketMax"
                    type="number"
                    className="input"
                    value={form.ticketMax}
                    onChange={(e) => atualizar('ticketMax', e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="bio" className="label">
                  Sobre você
                </label>
                <textarea
                  id="bio"
                  className="input min-h-[80px]"
                  value={form.bio}
                  onChange={(e) => atualizar('bio', e.target.value)}
                />
              </div>
            </>
          )}

          <button type="submit" className="btn-primary w-full" disabled={enviando}>
            {enviando ? 'Criando conta...' : 'Criar conta'}
          </button>

          <p className="text-center text-sm text-slate-500">
            Já tem conta?{' '}
            <Link to="/login" className="font-medium text-porto-600 hover:underline">
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}