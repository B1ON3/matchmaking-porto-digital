import { z } from 'zod';

function vazioParaNulo(valor: unknown): unknown {
  if (typeof valor === 'string' && valor.trim() === '') {
    return null;
  }

  return valor;
}

export function textoOpcional(max = 500) {
  return z.preprocess(vazioParaNulo, z.string().trim().max(max).nullable().optional());
}

export function emailOpcional() {
  return z.preprocess(vazioParaNulo, z.string().trim().email('email invalido').max(160).nullable().optional());
}

export function urlOpcional() {
  return z.preprocess(vazioParaNulo, z.string().trim().url('url invalida').max(500).nullable().optional());
}

export function dataOpcional() {
  return z.preprocess(vazioParaNulo, z.coerce.date().nullable().optional());
}

export function inteiroOpcional(min = 0, max = 1_000_000) {
  return z.preprocess((valor) => {
    if (valor === '' || valor === null || valor === undefined) {
      return null;
    }

    return typeof valor === 'string' ? Number(valor) : valor;
  }, z.number().int().min(min).max(max).nullable().optional());
}
