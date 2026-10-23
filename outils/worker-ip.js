// Cloudflare Worker (gratuit) : 1 tour offert toutes les 12 h par appareil, avec un plafond par adresse IP (plusieurs personnes peuvent partager la même box).
// 1) Workers > Create > coller ce code. 2) Créer un KV "WHEEL" et le lier sous le nom WHEEL.
// Tour de bienvenue : 1 par nouvelle IP (act=welcome). 3) Mettre l'URL du worker dans CONFIG.freeApi du site. Sans cela, l'attente est limitée au navigateur.
const WAIT = 12 * 3600 * 1000; // 1 tour offert par tranche de 12 h et par appareil
// Tirage de la roue côté serveur (impossible à truquer depuis le navigateur). Les lots et leurs poids sont ici.
const PR = [['lot0', 8, 'Lot offert par le partenaire n°1'], ['remise0', 12, 'Remise de 15 % chez le partenaire n°1'], ['boutique1', 20, 'Remise de 10 % sur la boutique'], ['lot1', 8, 'Lot offert par le partenaire n°2'], ['remise1', 12, 'Remise de 10 % chez le partenaire n°2'], ['nom', 12, 'Nom dans la vidéo de remerciement'], ['lot2', 8, 'Lot offert par le partenaire n°3'], ['remise2', 12, 'Remise de 10 % chez le partenaire n°3'], ['boutique2', 8, 'Remise de 20 % sur la boutique']];
const H = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Content-Type': 'application/json' };
export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: H });
    const u = new URL(req.url), act = u.searchParams.get('act');
    const rawIp = req.headers.get('CF-Connecting-IP') || 'x';
    // l'IP n'est jamais stockée en clair : seulement une empreinte SHA-256 salée
    const dg = await crypto.subtle.digest('SHA-256', new TextEncoder().encode((env.SALT || 'roue') + rawIp));
    const ip = Array.from(new Uint8Array(dg).slice(0, 12), b => b.toString(16).padStart(2, '0')).join('');
    const dev = (u.searchParams.get('d') || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 24) || 'nod';
    const now = Date.now();
    // La roue n'ouvre que le 10 mai 2027 à 00h00 heure de Paris (= 9 mai 22h00 UTC). Pour tester avant : variable OPEN_AT (ex. 2026-01-01T00:00:00Z).
    const OPEN = Date.parse(env.OPEN_AT || '2027-05-09T22:00:00Z');
    if (now < OPEN && ['check', 'claim', 'welcome', 'redeem', 'spin'].includes(act)) return new Response(JSON.stringify({ ok: false, closed: true, open: OPEN }), { headers: H });
    // Une IP partagée (famille, école, 4G) peut servir plusieurs appareils : 1 tour offert / 2 h PAR APPAREIL, plafonné à IPCAP appareils par IP et par fenêtre.
    const IPCAP = 6, WIPCAP = 6;
    const jget = async k => { try { return JSON.parse(await env.WHEEL.get(k)); } catch (e) { return null; } };
    const ipw = async () => { let o = await jget('ipc:' + ip); if (!o || o.exp <= now) o = { n: 0, exp: now + WAIT }; return o; };
    const devUntil = parseInt(await env.WHEEL.get('dv:' + dev) || '0', 10);
    const devWait = Math.max(0, devUntil - now);
    if (act === 'check') {
      if (devWait > 0) return new Response(JSON.stringify({ wait: devWait }), { headers: H });
      const o = await ipw();
      return new Response(JSON.stringify({ wait: o.n >= IPCAP ? o.exp - now : 0 }), { headers: H });
    }
    if (act === 'claim' && req.method === 'POST') {
      if (devWait > 0) return new Response(JSON.stringify({ ok: false, wait: devWait }), { headers: H });
      const o = await ipw();
      if (o.n >= IPCAP) return new Response(JSON.stringify({ ok: false, wait: o.exp - now }), { headers: H });
      o.n++;
      await env.WHEEL.put('ipc:' + ip, JSON.stringify(o), { expirationTtl: Math.max(60, Math.ceil((o.exp - now) / 1000) + 60) });
      const nu = now + WAIT;
      await env.WHEEL.put('dv:' + dev, String(nu), { expirationTtl: 43500 });
      return new Response(JSON.stringify({ ok: true, until: nu }), { headers: H });
    }
    if (act === 'welcome' && req.method === 'POST') {
      const k = 'welcome:' + dev;
      if (await env.WHEEL.get(k)) return new Response(JSON.stringify({ ok: false }), { headers: H });
      const wn = parseInt(await env.WHEEL.get('wip:' + ip) || '0', 10);
      if (wn >= WIPCAP) return new Response(JSON.stringify({ ok: false }), { headers: H });
      await env.WHEEL.put('wip:' + ip, String(wn + 1), { expirationTtl: 86400 * 30 });
      await env.WHEEL.put(k, '1');
      return new Response(JSON.stringify({ ok: true }), { headers: H });
    }
    if (act === 'redeem' && req.method === 'POST') {
      let b = {}; try { b = JSON.parse((await req.text()).slice(0, 300)); } catch (e) {}
      const code = String(b.code || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24);
      const rk = 'rl:' + ip, n0 = parseInt(await env.WHEEL.get(rk) || '0', 10);
      if (n0 >= 30 || !code) return new Response(JSON.stringify({ ok: false }), { headers: H });
      await env.WHEEL.put(rk, String(n0 + 1), { expirationTtl: 3600 });
      const v = await env.WHEEL.get('code:' + code);
      const n = Math.min(20, parseInt(v || '0', 10) || 0);
      if (!n) return new Response(JSON.stringify({ ok: false }), { headers: H });
      await env.WHEEL.delete('code:' + code);
      return new Response(JSON.stringify({ ok: true, n }), { headers: H });
    }
    const tg = async txt => {
      const jobs = [];
      if (env.TG_TOKEN && env.TG_CHAT) jobs.push(fetch('https://api.telegram.org/bot' + env.TG_TOKEN + '/sendMessage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: env.TG_CHAT, text: txt }) }));
      if (env.CMB_PHONE && env.CMB_KEY) jobs.push(fetch('https://api.callmebot.com/whatsapp.php?phone=' + encodeURIComponent(env.CMB_PHONE) + '&apikey=' + encodeURIComponent(env.CMB_KEY) + '&text=' + encodeURIComponent(txt)));
      const rs = await Promise.allSettled(jobs);
      return rs.some(r => r.status === 'fulfilled' && r.value.ok);
    };
    const rb = () => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] / 4294967296; };
    if (act === 'spin' && req.method === 'POST') {
      const sk = 'sp:' + ip, sn = parseInt(await env.WHEEL.get(sk) || '0', 10);
      await env.WHEEL.put(sk, String(sn + 1), { expirationTtl: 3600 });
      let dp = Math.min(2, Math.max(0, parseFloat(env.DRONE_PCT || '0.7')));
      // Le drone n'est en jeu qu'à partir du 15 mai 2027 00h00 Paris (= 14 mai 22h00 UTC). Variable DRONE_FROM pour changer la date.
      if (now < Date.parse(env.DRONE_FROM || '2027-05-14T22:00:00Z')) dp = 0;
      if (sn >= 60 || await env.WHEEL.get('drone:won')) dp = 0;
      let id, label;
      if (rb() * 100 < dp) { id = 'drone'; label = '🚁 DRONE DJI MINI 3'; await env.WHEEL.put('drone:won', '1'); }
      else { const sum = PR.reduce((a, x) => a + x[1], 0); let u = rb() * sum, pk = PR[PR.length - 1]; for (const x of PR) { if (u < x[1]) { pk = x; break; } u -= x[1]; } id = pk[0]; label = pk[2]; }
      const AL = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let code = 'R-'; for (let i = 0; i < 6; i++) code += AL[Math.floor(rb() * AL.length)];
      await env.WHEEL.put('win:' + code, JSON.stringify({ id, label, at: now }), { expirationTtl: 86400 * 45 });
      await tg((id === 'drone' ? '🚨🚁 JACKPOT ! Un joueur a gagné le drone\nCode : ' : '🎡 Nouveau gain : ' + label + '\nCode : ') + code);
      return new Response(JSON.stringify({ id, code }), { headers: H });
    }
    if (act === 'prize' && req.method === 'POST') {
      let b = {}; try { b = JSON.parse((await req.text()).slice(0, 2000)); } catch (e) {}
      const c = (s, n = 80) => String(s || '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, n);
      const code = String(b.code || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 16);
      const rec = await jget('win:' + code);
      if (!rec) return new Response(JSON.stringify({ ok: false }), { headers: H });
      const prenom = c(b.prenom, 40), nom = c(b.nom, 40), email = c(b.email), insta = c(b.insta, 32), defi = c(b.defi, 200);
      if (!prenom || !nom || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || !/^@[A-Za-z0-9._]{1,30}$/.test(insta) || (rec.id === 'defi' && defi.length < 5))
        return new Response(JSON.stringify({ ok: false, err: 'champs' }), { headers: H });
      const dk = 'clm:' + code;
      if (await env.WHEEL.get(dk)) return new Response(JSON.stringify({ ok: true }), { headers: H });
      await env.WHEEL.put(dk, '1', { expirationTtl: 86400 * 45 });
      const ok = await tg('📨 RÉCOMPENSE RÉCLAMÉE (code vérifié)\nLot : ' + rec.label + (rec.id === 'defi' ? '\nDéfi demandé : ' + defi : '') + '\nCode : ' + code + '\nNom : ' + prenom + ' ' + nom + '\nE-mail : ' + email + '\nInstagram : ' + insta);
      return new Response(JSON.stringify({ ok }), { headers: H });
    }
    if (act === 'test') {
      const rk = 'rl:' + ip, n = parseInt(await env.WHEEL.get(rk) || '0', 10);
      if (n >= 30) return new Response(JSON.stringify({ ok: false, err: 'trop de demandes' }), { headers: H });
      await env.WHEEL.put(rk, String(n + 1), { expirationTtl: 3600 });
      if (!env.TG_TOKEN || !env.TG_CHAT) return new Response(JSON.stringify({ ok: false, err: 'TG_TOKEN ou TG_CHAT manquant' }), { headers: H });
      try {
        const r = await fetch('https://api.telegram.org/bot' + env.TG_TOKEN + '/sendMessage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: env.TG_CHAT, text: '✅ Test de la roue : les messages arrivent bien.' }) });
        const j = await r.json().catch(() => ({}));
        return new Response(JSON.stringify({ ok: !!j.ok, err: j.ok ? null : (j.description || r.status) }), { headers: H });
      } catch (e) { return new Response(JSON.stringify({ ok: false, err: 'réseau' }), { headers: H }); }
    }
    // --- Formulaire de contact : transmis sur Telegram, 3 messages / heure / IP, anti-robot (champ piège) ---
    if (act === 'contact' && req.method === 'POST') {
      let b = {}; try { b = JSON.parse(await req.text()); } catch (e) {}
      if (b.hp) return new Response(JSON.stringify({ ok: true }), { headers: H });
      const cl = (s, n = 80) => String(s || '').replace(/[\u0000-\u0008\u000b-\u001f<>]/g, ' ').trim().slice(0, n);
      const name = cl(b.name, 60), email = cl(b.email, 120), msg = cl(b.msg, 1500), type = ['Partenariat', 'Question', 'Autre'].includes(b.type) ? b.type : 'Autre';
      if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || msg.length < 10) return new Response(JSON.stringify({ ok: false, err: 'champs' }), { headers: H });
      const rk = 'ct:' + ip, n = parseInt(await env.WHEEL.get(rk) || '0', 10);
      if (n >= 3) return new Response(JSON.stringify({ ok: false, err: 'trop' }), { headers: H });
      await env.WHEEL.put(rk, String(n + 1), { expirationTtl: 3600 });
      const ok = await tg('✉️ MESSAGE DU SITE (' + type + ')\nNom : ' + name + '\nE-mail : ' + email + '\n\n' + msg);
      return new Response(JSON.stringify({ ok }), { headers: H });
    }
    // --- Statistiques anonymes (aucune IP, aucun identifiant) : compteurs par clé et par jour ---
    if (act === 'track') {
      const k = (u.searchParams.get('k') || '');
      if (!/^(vis|ad[0-9]{1,2}|clk[0-9]{1,2}|spn)$/.test(k)) return new Response('{}', { headers: H });
      const day = new Date(now).toISOString().slice(0, 10), key = 'st:' + day + ':' + k;
      // 1 écriture KV par événement (le plan gratuit autorise 1000 écritures / jour) : au-delà, on ignore sans erreur
      const cap = parseInt(await env.WHEEL.get('stcap:' + day) || '0', 10);
      if (cap < 900) {
        await env.WHEEL.put('stcap:' + day, String(cap + 1), { expirationTtl: 172800 });
        const v = parseInt(await env.WHEEL.get(key) || '0', 10);
        await env.WHEEL.put(key, String(v + 1), { expirationTtl: 86400 * 400 });
      }
      return new Response('{}', { headers: H });
    }
    if (act === 'stats') {
      if (!env.STATS_KEY || u.searchParams.get('key') !== env.STATS_KEY) return new Response(JSON.stringify({ ok: false }), { status: 403, headers: H });
      const out = {}; let cur;
      do {
        const l = await env.WHEEL.list({ prefix: 'st:', cursor: cur });
        for (const e of l.keys) { const [, d, k] = e.name.split(':'); (out[k] = out[k] || {})[d] = parseInt(await env.WHEEL.get(e.name) || '0', 10); }
        cur = l.list_complete ? null : l.cursor;
      } while (cur);
      return new Response(JSON.stringify({ ok: true, stats: out }), { headers: H });
    }
    return new Response('{}', { headers: H });
  }
};
