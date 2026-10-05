import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../components/Alert';
import { extractErrorMessage } from '../services/api';

export function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro('');
    setEnviando(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (e) {
      setErro(extractErrorMessage(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-porto-600 text-xl font-bold text-white">
            P
          </span>
          <h1 className="text-2xl font-semibold text-slate-900">Matchmaking Porto Digital</h1>
          <p className="mt-1 text-sm text-slate-500">
            Conectando startups do Recife a investidores anjo do Nordeste
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {erro && <Alert mensagem={erro} />}

          <div>
            <label htmlFor="email" className="label">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@porto.digital"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="label">
              Senha
            </label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={enviando}>
            {enviando ? 'Entrando...' : 'Entrar'}
          </button>

          <p className="text-center text-sm text-slate-500">
            Ainda não tem conta?{' '}
            <Link to="/cadastro" className="font-medium text-porto-600 hover:underline">
              Cadastre-se
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}