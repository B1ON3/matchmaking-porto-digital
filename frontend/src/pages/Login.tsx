import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../components/Alert';
import { AuthLayout } from '../components/AuthLayout';
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
    <AuthLayout titulo="Entrar" subtitulo="Acesse com seu e-mail para continuar a conversa.">
      <form onSubmit={handleSubmit} className="card space-y-5">
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
            autoComplete="email"
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="password" className="label mb-0">
              Senha
            </label>
            <Link to="/esqueci-senha" className="text-xs font-semibold text-laco-700 hover:underline">
              Esqueci minha senha
            </Link>
          </div>
          <input
            id="password"
            type="password"
            className="input mt-1.5"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </div>

        <button type="submit" className="btn-primary w-full" disabled={enviando}>
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>

        <p className="text-center text-sm text-slate-500">
          Ainda não tem conta?{' '}
          <Link to="/cadastro" className="link">
            Cadastre-se
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
