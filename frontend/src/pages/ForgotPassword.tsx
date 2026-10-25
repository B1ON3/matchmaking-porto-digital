import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { AuthLayout } from '../components/AuthLayout';
import { authService } from '../services';
import { extractErrorMessage } from '../services/api';

type Etapa = 'email' | 'codigo' | 'pronto';

export function ForgotPassword() {
  const navigate = useNavigate();

  const [etapa, setEtapa] = useState<Etapa>('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [enviando, setEnviando] = useState(false);

  const tokenRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (etapa === 'codigo') {
      tokenRef.current?.focus();
    }
  }, [etapa]);

  async function pedirCodigo(event: FormEvent) {
    event.preventDefault();
    setErro('');
    setEnviando(true);

    try {
      const resposta = await authService.forgotPassword(email);

      if (resposta.token) {
        setToken(resposta.token);
        setAviso('Ambiente de desenvolvimento: o código foi preenchido automaticamente.');
      }

      setEtapa('codigo');
    } catch (e) {
      setErro(extractErrorMessage(e));
    } finally {
      setEnviando(false);
    }
  }

  async function trocarSenha(event: FormEvent) {
    event.preventDefault();
    setErro('');

    if (!token.trim()) {
      setErro('Informe o código que você recebeu.');
      return;
    }

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
      await authService.resetPassword(token.trim(), password);
      setEtapa('pronto');
    } catch (e) {
      setErro(extractErrorMessage(e));
    } finally {
      setEnviando(false);
    }
  }

  async function reenviarCodigo() {
    setErro('');
    setEnviando(true);

    try {
      const resposta = await authService.forgotPassword(email);

      if (resposta.token) {
        setToken(resposta.token);
        setAviso('Novo código gerado e preenchido automaticamente.');
      } else {
        setAviso('Se o e-mail existir, enviamos um novo código.');
      }
    } catch (e) {
      setErro(extractErrorMessage(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AuthLayout
      titulo="Redefinir senha"
      subtitulo={
        etapa === 'email'
          ? 'Informe o e-mail da conta. Enviamos um código para você criar uma nova senha.'
          : 'Use o código enviado para o seu e-mail e escolha a nova senha.'
      }
    >
      {etapa === 'pronto' ? (
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
            <p className="mt-1 text-sm text-slate-500">Já pode entrar com a nova senha.</p>
          </div>

          <button type="button" onClick={() => navigate('/login')} className="btn-primary w-full">
            Ir para o login
          </button>
        </div>
      ) : etapa === 'email' ? (
        <form onSubmit={pedirCodigo} className="card space-y-5">
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

          <button type="submit" className="btn-primary w-full" disabled={enviando}>
            {enviando ? 'Enviando...' : 'Enviar código'}
          </button>

          <p className="text-center text-sm text-slate-500">
            Lembrou a senha?{' '}
            <Link to="/login" className="link">
              Voltar para o login
            </Link>
          </p>
        </form>
      ) : (
        <form onSubmit={trocarSenha} className="card space-y-5">
          {erro && <Alert mensagem={erro} />}
          {aviso && <Alert tipo="sucesso" mensagem={aviso} />}

          <p className="text-sm text-slate-500">
            Código enviado para <strong className="font-semibold text-slate-700">{email}</strong>.{' '}
            <button type="button" onClick={() => setEtapa('email')} className="link">
              Usar outro e-mail
            </button>
          </p>

          <div>
            <label htmlFor="token" className="label">
              Código de redefinição
            </label>
            <input
              id="token"
              ref={tokenRef}
              type="text"
              className="input font-mono text-sm"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="cole o código recebido"
              autoComplete="one-time-code"
              spellCheck={false}
              aria-describedby="token-ajuda"
              required
            />
            <p id="token-ajuda" className="mt-1.5 text-xs text-slate-500">
              O código expira em alguns minutos e só pode ser usado uma vez.
            </p>
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

          <button type="submit" className="btn-primary w-full" disabled={enviando}>
            {enviando ? 'Salvando...' : 'Salvar nova senha'}
          </button>

          <p className="text-center text-sm text-slate-500">
            Não recebeu?{' '}
            <button type="button" onClick={reenviarCodigo} className="link" disabled={enviando}>
              Reenviar código
            </button>
          </p>

          <p className="text-center text-sm text-slate-500">
            <Link to="/login" className="link">
              Voltar para o login
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
