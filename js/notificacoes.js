// Lembretes (notificações). Três caminhos, do melhor pro mais simples:
//  1. Push pelo servidor (Cloudflare Worker): funciona no Android e no iPhone (iOS 16.4+, app INSTALADO na tela
//     inicial). O servidor só manda um "toque" vazio na hora marcada; quem monta o texto é o próprio aparelho,
//     então nenhum dado financeiro passa pelo servidor.
//  2. Sincronização periódica (só Chrome/Android com o app instalado): o navegador acorda o app de vez em quando,
//     sem servidor. O horário é aproximado (o navegador decide).
//  3. Sem nenhum dos dois: só dá pra lembrar quando o app estiver aberto.

import * as db from './db.js';
import { chamar } from './ia.js';

export function suporte() {
  const sw = 'serviceWorker' in navigator;
  return {
    notificacao: 'Notification' in window,
    push: sw && 'PushManager' in window,
    periodica: sw && 'periodicSync' in (window.ServiceWorkerRegistration?.prototype || {}),
    instalado: matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
    ios: /iphone|ipad|ipod/i.test(navigator.userAgent),
  };
}

function chaveParaBytes(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

export async function config() {
  return db.getMeta('lembrete', { ativo: false, hora: '20:30', modo: null });
}

/** Precisa ser chamado num toque (o navegador só pede permissão assim). */
export async function ativar({ hora = '20:30', servidor = '' } = {}) {
  const s = suporte();
  if (!s.notificacao) throw new Error('Este navegador não mostra notificações.');
  if (s.ios && !s.instalado) throw new Error('No iPhone, os lembretes só funcionam com o app instalado (Compartilhar → Adicionar à Tela de Início).');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Permissão de notificação negada. Dá pra liberar nas configurações do navegador.');
  const reg = await navigator.serviceWorker.ready;

  let modo = 'app_aberto';
  if (servidor && s.push) {
    const { chave } = await chamar(servidor, '/push/chave');
    const sub = (await reg.pushManager.getSubscription())
      || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(chave) });
    await chamar(servidor, '/push/inscrever', {
      inscricao: sub.toJSON(), hora, fuso: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
    });
    modo = 'push';
  } else if (s.periodica) {
    try {
      await reg.periodicSync.register('lembrete', { minInterval: 12 * 3_600_000 });
      modo = 'periodica';
    } catch {
      modo = 'app_aberto';
    }
  }
  const c = { ativo: true, hora, modo };
  await db.setMeta('lembrete', c);
  return c;
}

export async function desativar({ servidor = '' } = {}) {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager?.getSubscription();
    if (sub) {
      if (servidor) await chamar(servidor, '/push/sair', { endpoint: sub.endpoint }).catch(() => {});
      await sub.unsubscribe();
    }
    await reg.periodicSync?.unregister('lembrete').catch(() => {});
  } catch {}
  const c = { ...(await config()), ativo: false, modo: null };
  await db.setMeta('lembrete', c);
  return c;
}

export async function testar(texto = 'Assim vão chegar os lembretes do C.A.O.S.') {
  if (Notification.permission !== 'granted') throw new Error('Ative os lembretes primeiro.');
  const reg = await navigator.serviceWorker.ready;
  await reg.showNotification('C.A.O.S. Finanças', { body: texto, icon: './icons/icon-192.png', badge: './icons/icon-192.png', tag: 'teste' });
}

export function descreverModo(modo) {
  return {
    push: 'Lembrete diário pelo servidor, no horário escolhido.',
    periodica: 'Lembrete pelo navegador, perto do horário escolhido (o Android decide o momento exato).',
    app_aberto: 'Este aparelho não aceita lembrete com o app fechado sem o servidor. Configure a IA online (servidor) para receber no horário.',
  }[modo] || '';
}
