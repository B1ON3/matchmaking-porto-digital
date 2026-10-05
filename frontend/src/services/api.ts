import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

const TOKEN_KEY = '@matchmaking:token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// anexa o JWT devolvido pela API em todas as requisicoes (RF07)
api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // token expirado ou invalido volta pra tela de login
    if (error.response?.status === 401 && getToken()) {
      clearToken();
      window.dispatchEvent(new Event('matchmaking:unauthorized'));
    }

    return Promise.reject(error);
  },
);

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const dados = error.response?.data as
      | { error?: string; details?: { campo: string; mensagem: string }[] }
      | undefined;

    if (dados?.details?.length) {
      return dados.details.map((d) => `${d.campo}: ${d.mensagem}`).join(' | ');
    }

    if (dados?.error) {
      return dados.error;
    }

    if (error.code === 'ERR_NETWORK') {
      return 'Nao consegui falar com a API. Sobe o backend com docker-compose?';
    }
  }

  return 'Deu ruim na requisição, tenta de novo.';
}