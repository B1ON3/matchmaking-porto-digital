import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { AuthLayout } from '../components/AuthLayout';
import { authService } from '../services';
import { extractErrorMessage } from '../services/api';

export function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [pronto, setPronto] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro('');

    if (password.length < 6) {
      setErro('A nova senha precisa de pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmacao) {
      setErro('As senhas não conferem.');
      return;
    }

    setEnviando(true);

    try {
      await authService.resetPassword(email, password);
      setPronto(true);
    } catch (e) {
      setErro(extractErrorMessage(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AuthLayout titulo="Redefinir senha" subtitulo="Informe seu e-mail e escolha uma nova senha. Sem burocracia.">
      {pronto ? (
        <div className="card space-y-5 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-laco-100 text-laco-800 dark:bg-laco-900 dark:text-laco-200">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
              aria-hidden="true"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>

          <div>
            <h2 className="text-lg font-semibold text-slate-900">Senha atualizada</h2>
            <p className="mt-1 text-sm text-slate-500">
              Já pode entrar com a nova senha. Se algo der errado, tente redefinir de novo.
            </p>
          </div>

          <button type="button" onClick={() => navigate('/login')} className="btn-primary w-full">
            Ir para o login
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card space-y-5">
          {erro && <Alert mensagem={erro} />}

          <div>
            <label htmlFor="email" className="label">
              E-mail da conta
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
            <label htmlFor="password" className="label">
              Nova senha
            </label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="mínimo de 6 caracteres"
              autoComplete="new-password"
              required
            />
          </div>

          <div>
            <label htmlFor="confirmacao" className="label">
              Confirme a nova senha
            </label>
            <input
              id="confirmacao"
              type="password"
              className="input"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              placeholder="digite de novo"
              autoComplete="new-password"
              required
            />
          </div>

          <p className="rounded-xl bg-areia-100 px-3.5 py-3 text-xs leading-relaxed text-slate-600 dark:bg-noite-700 dark:text-slate-400">
            Neste protótipo a troca é feita direto pelo e-mail cadastrado, sem envio de código. A verificação por e-mail
            entra numa próxima etapa.
          </p>

          <button type="submit" className="btn-primary w-full" disabled={enviando}>
            {enviando ? 'Salvando...' : 'Salvar nova senha'}
          </button>

          <p className="text-center text-sm text-slate-500">
            Lembrou a senha?{' '}
            <Link to="/login" className="link">
              Voltar para o login
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
