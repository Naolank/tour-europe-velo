/* === Worker Cloudflare : paiement de la boutique « La Boucle des Six Pays » ===

   Ce qu'il fait, en une phrase : le client paie sur Stripe, la commande part toute
   seule chez Printful qui imprime et expédie, et votre bot reçoit un message.

   Rôle détaillé :
     - creer la page de paiement Stripe en recalculant les prix d'apres le catalogue publie ;
     - recevoir la confirmation de Stripe (webhook) et passer la commande a « paid » ;
     - envoyer la commande chez Printful, puis prevenir votre bot une seule fois ;
     - dire au site si une commande est payee.
   Le site n'affiche « Paiement recu » que lorsque ce Worker repond status = "paid"
   (jamais d'apres l'adresse de la page). Une commande ne devient « paid » que par un
   webhook Stripe correctement signe : aucun autre chemin ne peut la faire basculer.

   -----------------------------------------------------------------------------
   VARIABLES A DEFINIR (Worker > Settings > Variables) :
     STRIPE_SECRET          (secret)  Votre cle secrete Stripe : sk_live_… en vrai, sk_test_… pour essayer.
     STRIPE_WEBHOOK_SECRET  (secret)  Le secret de signature du webhook Stripe : whsec_… Il sert a prouver
                                      que la confirmation de paiement vient bien de Stripe.
     ADMIN_KEY              (secret)  Le mot de passe de votre liste de commandes. Prenez-le long et au hasard.
     SITE_URL                         L'adresse de votre site avec la barre oblique finale,
                                      ex. https://naolank.github.io/tour-europe-velo/
                                      C'est la que le Worker va lire votre catalogue (site-edits.json).
     ALLOWED_ORIGIN                   L'origine de votre site, ex. https://naolank.github.io
                                      Seules les pages de cette origine peuvent appeler le Worker depuis un navigateur.
     SHIPPING_EUR           (facultatif) Frais de livraison fixes en euros, ex. 5.90. Laissez vide pour ne rien facturer.
     SHIPPING_COUNTRIES     (facultatif) Pays livres, ex. FR,BE,CH,LU,DE,IT,ES. Par defaut : FR.
     PRINTFUL_TOKEN         (facultatif) Votre cle API Printful. Sans elle, les commandes restent a expedier par vous.
     PRINTFUL_STORE_ID      (facultatif) L'identifiant de votre boutique Printful, si votre cle en gere plusieurs.
     PRINTFUL_DRAFT         (facultatif) Mettez 1 (ou true) pour que les commandes arrivent chez Printful
                                      en BROUILLON : rien n'est imprime ni facture avant que vous ne validiez
                                      vous-meme depuis votre tableau de bord Printful. C'est le reglage
                                      conseille pour vos premieres vraies commandes. Laissez vide ensuite
                                      pour que tout parte sans intervention.
     NOTIFY_WEBHOOK         (facultatif) L'adresse du webhook de votre bot (Discord, Slack ou tout service qui accepte
                                      du JSON). Il recoit le detail complet de chaque commande payee.
     TELEGRAM_BOT_TOKEN     (facultatif) Si votre bot est sur Telegram : le jeton du bot.
     TELEGRAM_CHAT_ID       (facultatif) Si votre bot est sur Telegram : l'identifiant de la conversation.
   Liaison KV : creez un espace KV nomme « ORDERS » et liez-le au Worker sous le nom ORDERS.
                C'est la memoire du Worker : les commandes y sont rangees.
   Webhook Stripe : Developers > Webhooks > ajoutez  https://<ce-worker>/stripe-webhook
                avec les evenements checkout.session.completed,
                checkout.session.async_payment_succeeded,
                checkout.session.async_payment_failed, checkout.session.expired
   -----------------------------------------------------------------------------
   Webhook Stripe, evenements a cocher egalement pour que le site cesse de dire
                « payee » quand l argent repart : charge.refunded, charge.dispute.created,
                charge.dispute.funds_withdrawn. Ils sont facultatifs mais vivement conseilles.
   -----------------------------------------------------------------------------
   TROIS GARANTIES QUI PROTEGENT VOTRE ARGENT ET VOTRE REPUTATION :
     1. Le site n affiche « commande confirmee » que si ce Worker repond paid, et
        une commande ne devient paid que si le montant reellement encaisse par
        Stripe correspond, au centime et dans la bonne devise, au total enregistre
        au moment du panier, frais de port compris. Si les deux ne concordent pas,
        la commande prend l etat « montant-anormal » : ni payee, ni annulee, rien
        n est envoye chez l imprimeur et votre bot vous previent.
     2. Un remboursement ou une contestation de paiement fait basculer la commande
        en « remboursee » ou « contestee » : le site ne repond plus « payee ».
     3. Une commande d essai (mode test Stripe) n est jamais envoyee a l impression.
   -----------------------------------------------------------------------------
   POUR VERIFIER QUE TOUT EST EN PLACE : ouvrez  https://<ce-worker>/health
   Cette page dit ce qui est configure et ce qui manque, sans jamais afficher la
   moindre valeur secrete. C'est elle qu'utilise le bouton de test de l'administration.
   Elle indique aussi le mode d'envoi en cours : automatique, brouillon ou inactif.
   -----------------------------------------------------------------------------
   VOS ESSAIS NE COUTENT RIEN : une commande reglee avec une carte de test Stripe
   (4242 4242 4242 4242) porte la mention « mode test ». Dans ce cas le Worker
   n'envoie RIEN chez Printful : aucune impression, aucune facture pour vous. La
   commande est tout de meme enregistree comme payee et votre bot vous previent en
   precisant qu'il s'agit d'un essai. Seuls les paiements reels partent a l'impression.
   -----------------------------------------------------------------------------
   CE QUE LE WORKER ATTEND DE VOTRE CATALOGUE (site-edits.json, cfg.shop.items) :
     un article   : { id, n (nom), sizes:[tailles], colors:[{k, h, imgs}], v:[versions] }
     une version  : { k (nom), p (prix en euros), pf (identifiant Printful), u, d, imgs }
   Les tailles et les couleurs sont facultatives. Les photos et les descriptions
   servent a votre site : le Worker les ignore, il ne garde en memoire que les noms,
   les prix et les identifiants Printful. Votre fichier de catalogue peut donc
   grossir avec les photos sans alourdir le paiement.
   Le navigateur n'envoie jamais de prix ni de nom de couleur : il envoie un
   identifiant d'article, un indice de version, une taille, un indice de couleur
   (champ « c ») et une quantite. Tout le reste est relu dans votre catalogue.
   -----------------------------------------------------------------------------
   ROUTES (ne pas renommer, le site en depend) :
     POST /checkout       panier et coordonnees  ->  adresse de paiement Stripe
     POST /stripe-webhook confirmation de Stripe
     GET  /order?id=      etat de la commande, au format { "status": "..." }
     GET  /health         etat de la configuration
     GET  /admin/orders   liste des commandes (jeton ADMIN_KEY requis).
                          Par defaut une vue allegee : pas de nom, pas d adresse,
                          pas de detail des articles. Ajoutez ?full=1 pour obtenir
                          le detail complet d une commande precise, par exemple
                          /admin/orders?full=1&id=LaReference
     POST /admin/ship     marque une commande comme expediee (jeton ADMIN_KEY requis)
   -----------------------------------------------------------------------------
   ETATS POSSIBLES D UNE COMMANDE, tels que les renvoie /order?id= :
     pending          en attente de paiement, rien n est encaisse ;
     paid             argent encaisse et verifie, c est le seul etat « confirme » ;
     montant-anormal  Stripe a encaisse un montant ou une devise qui ne
                      correspondent pas au panier : a regarder a la main,
                      rien n a ete envoye a l impression ;
     remboursee       le paiement a ete rembourse ;
     contestee        le client a conteste le paiement aupres de sa banque ;
     expired          la page de paiement a expire sans paiement ;
     canceled         paiement refuse, ou page de paiement impossible a ouvrir.
*/

/* Catalogue de secours, utilise seulement si votre site n'a jamais pu etre lu.
   Normalement il reste vide : le catalogue est lu dans site-edits.json, c'est-a-dire
   ce que vous publiez depuis votre administration. */
const DEFAULT_ITEMS = [];

/* ---------------------------------------------------------------------------
   LIMITES DE SECURITE
   Elles evitent qu'un visiteur mal intentionne envoie un panier absurde
   (dix mille articles, un nom de deux pages, un corps de requete enorme).
   Vous pouvez les ajuster si votre boutique grandit.
--------------------------------------------------------------------------- */
const L = {
  corpsMaxOctets: 8000,      // taille maximale du panier envoye par le navigateur
  lignesMax: 20,             // nombre d'articles differents dans un panier
  quantiteMax: 20,           // quantite maximale pour un meme article
  quantiteTotaleMax: 30,     // quantite maximale toutes lignes confondues
  /* Prix plancher. Dans votre administration, une version qui vient d etre ajoutee
     porte un prix de zero jusqu a ce que vous le remplissiez. Sans ce plancher,
     un visiteur pourrait commander cet article pour rien, et il serait tout de
     meme imprime puis expedie a vos frais. Un article en vente coute donc au
     moins un euro, et une commande entiere aussi. */
  ligneMinCents: 100,        // prix minimal d'un article : 1,00 euro
  totalMinCents: 100,        // montant minimal d'une commande : 1,00 euro
  totalMaxCents: 300000,     // montant maximal d'une commande : 3 000 euros
  bonMax: 40,                // longueur maximale d'un code de bon d'achat
  nomMax: 80,
  emailMax: 120,
  adresseMax: 300,
  /* Taille maximale acceptee pour site-edits.json. Depuis que les versions et les
     couleurs peuvent porter leurs propres photos, ce fichier peut devenir beaucoup
     plus volumineux : la marge est large. Au-dela, le Worker refuse proprement
     (message clair au client, 503) au lieu de s arreter sur une erreur. */
  catalogueMaxOctets: 3000000,
  variantesMax: 60,          // versions differentes pour un meme article
  couleursMax: 60,           // couleurs differentes pour un meme article
  taillesMax: 40,
  articlesCatalogueMax: 500
};

/* Appels repetes sur /checkout : au plus 8 demandes de paiement par tranche de dix
   minutes et par adresse. Le but est double : empecher qu un visiteur fabrique des
   centaines de sessions Stripe, et proteger votre quota d ecritures KV, qui est de
   mille ecritures par jour sur l offre gratuite.
   Limite a connaitre : le compteur est range dans KV, qui met quelques secondes a
   se propager entre les centres de donnees de Cloudflare. Ce garde-fou decourage
   les appels en rafale, il ne remplace pas une vraie protection reseau (regle
   « Rate limiting » dans le tableau de bord Cloudflare, si besoin un jour). */
const RL = { fenetreSecondes: 600, maxParFenetre: 8 };

/* Delais d'attente, en millisecondes, pour ne jamais rester bloque sur un service lent. */
const DELAIS = { catalogue: 6000, stripe: 15000, printful: 6000, bot: 4000 };

/* Relances et budget de temps du traitement d'un webhook.
   Stripe considere un webhook comme echoue au bout d'une trentaine de secondes.
   Les relances s'arretent donc avant ces reperes pour que la reponse arrive a temps :
   au-dela, c'est Stripe lui-meme qui relancera, et le travail reprendra la ou il
   s'etait arrete grace a la reservation decrite plus bas. */
const RELANCES = {
  printfulEssais: 3,
  printfulLimiteMs: 12000, // plus de nouvelle tentative vers Printful au-dela
  botEssais: 3,
  botLimiteMs: 22000       // plus de nouvelle tentative vers le bot au-dela
};

/* Tolerance d'horodatage du webhook Stripe : on refuse un message trop vieux
   (rejeu) et un message date du futur (horloge faussee). */
const SIG_TOLERANCE_PASSE = 300; // 5 minutes
const SIG_TOLERANCE_FUTUR = 60;  // 1 minute

/* ---------------------------------------------------------------------------
   DUREE DE CONSERVATION DES COMMANDES DANS KV
   Une commande payee contient le nom et l'adresse du client : on ne la garde
   donc pas plus longtemps que necessaire. Six mois couvrent largement une
   reclamation, un retour ou une question de comptabilite. Au-dela, la commande
   disparait toute seule de KV, sans aucune manipulation de votre part.
   Une commande jamais payee ne vit qu'un mois : elle n'a aucune valeur.
--------------------------------------------------------------------------- */
const TTL_COMMANDE_PAYEE = 186 * 24 * 3600;  // environ six mois
const TTL_COMMANDE_ATTENTE = 30 * 24 * 3600; // un mois
const TTL_RESERVATION = 186 * 24 * 3600;     // memoire des evenements deja traites

/* Etats consideres comme « de l'argent a encaisse ou a eu lieu » : ils meritent
   la conservation longue. Les autres partent au bout d'un mois. */
const ETATS_LONGS = ['paid', 'montant-anormal', 'remboursee', 'contestee'];
const ttlPour = statut => (ETATS_LONGS.includes(statut) ? TTL_COMMANDE_PAYEE : TTL_COMMANDE_ATTENTE);

/* Memoire courte du catalogue, pour ne pas relire votre site a chaque visiteur. */
let CAT = { t: 0, items: null };
const CAT_FRAIS_MS = 60 * 1000;          // au-dela, on relit le catalogue
const CAT_SECOURS_MS = 15 * 60 * 1000;   // si le site ne repond plus, on accepte le dernier catalogue lu jusqu'a 15 minutes

/* ---------------------------------------------------------------------------
   PETITS OUTILS
--------------------------------------------------------------------------- */
const j = (o, st, env, extra) => new Response(JSON.stringify(o), { status: st || 200, headers: Object.assign({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, cors(env), extra || {}) });

/* La seule origine a laquelle ce Worker accepte de repondre dans un navigateur :
   ALLOWED_ORIGIN si vous l'avez remplie, sinon l'origine deduite de SITE_URL,
   sinon rien du tout. Renvoie null quand aucune des deux n'est configuree. */
function origineDuSite(env) {
  if (env && rempli(env.ALLOWED_ORIGIN)) return env.ALLOWED_ORIGIN.trim().replace(/\/$/, '');
  if (env && rempli(env.SITE_URL)) { try { return new URL(env.SITE_URL).origin; } catch (e) { return null; } }
  return null;
}

/* En-tetes CORS. Point important : tant que ALLOWED_ORIGIN et SITE_URL sont vides,
   aucune autorisation d'origine n'est renvoyee. Autrefois le Worker repondait
   « * », c'est-a-dire « n'importe quel site peut m'appeler » : une variable oubliee
   ouvrait la boutique a tout le monde. Mieux vaut un site qui ne fonctionne pas
   et qui se repare en remplissant une variable, qu'une boutique ouverte a tous. */
const cors = env => {
  const h = { 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Vary': 'Origin' };
  const o = origineDuSite(env);
  if (o) h['Access-Control-Allow-Origin'] = o;
  return h;
};
const rid = () => { const b = crypto.getRandomValues(new Uint8Array(14)); return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const pause = ms => new Promise(r => setTimeout(r, ms));
const rempli = v => typeof v === 'string' && v.trim().length > 0;

/* Convertit des euros en centimes. Renvoie null si la valeur n'est pas un nombre
   utilisable : on prefere refuser une commande plutot que d'envoyer un prix faux a Stripe.
   Le deuxieme argument est un plancher en centimes : un prix d'article doit valoir
   au moins L.ligneMinCents, alors que des frais de port peuvent etre plus bas. */
function eurc(x, minCents) {
  if (x === null || x === undefined || x === '' || typeof x === 'boolean' || Array.isArray(x)) return null;
  const n = Number(x);
  if (!Number.isFinite(n) || n <= 0 || n > 20000) return null;
  const cents = Math.round(n * 100);
  if (!Number.isFinite(cents) || cents < 1) return null;
  if (minCents && cents < minCents) return null;
  return cents;
}

/* Nettoie un texte venu du navigateur : retire les caracteres de controle,
   compresse les espaces, coupe a la longueur voulue. */
function texteSimple(v, max) {
  return String(v == null ? '' : v)
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/* Caracteres que l'on n'attend ni dans un nom ni dans une adresse. Ils servent
   surtout aux tentatives d'injection dans le message du bot ou dans Stripe.
   On reste volontairement tolerant sur les accents, apostrophes et tirets,
   pour ne jamais refuser une vraie adresse. */
/* Code de bon d'achat : on ne garde que les lettres, les chiffres et les tirets.
   Ce code est recopie tel quel dans le message envoye a votre bot ; sans ce
   filtre, un client pourrait y glisser des retours a la ligne et vous faire lire
   un faux message (« TOTAL ENCAISSE : 499 euros »), ou une mention « @everyone ».
   Tout le reste est simplement retire, le code n'est jamais refuse pour autant :
   de toute facon vous le verifiez vous-meme. */
function codeBon(v) {
  return String(v == null ? '' : v).replace(/[^A-Za-z0-9-]/g, '').slice(0, L.bonMax);
}

const CARACTERES_INATTENDUS = /[<>{}\\`$|^~\[\]]/;
const CONTIENT_LIEN = /https?:\/\//i;
const CONTIENT_LETTRE = /\p{L}/u;

/* ---------------------------------------------------------------------------
   COMPARAISONS EN TEMPS CONSTANT
   Comparer deux secretes caractere par caractere avec === peut renseigner un
   attaquant sur le nombre de caracteres justes. On compare donc les empreintes
   SHA-256 des deux textes : la duree ne depend plus du contenu ni de la longueur.
--------------------------------------------------------------------------- */
async function sha256(txt) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(txt)));
  return new Uint8Array(d);
}
function sha256Hex(oct) { return [...oct].map(b => b.toString(16).padStart(2, '0')).join(''); }
async function egalSecurise(a, b) {
  const [x, y] = await Promise.all([sha256(a), sha256(b)]);
  let r = 0;
  for (let i = 0; i < 32; i++) r |= x[i] ^ y[i];
  return r === 0;
}

async function hmacHex(secret, msg) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const s = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg));
  return [...new Uint8Array(s)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ---------------------------------------------------------------------------
   LECTURE DU CATALOGUE
   Regle d'or : le prix facture vient TOUJOURS du catalogue publie sur votre site.
   Le navigateur n'envoie qu'un identifiant d'article, une variante, une taille
   et une quantite. Tout prix envoye par le client est purement ignore.
--------------------------------------------------------------------------- */

/* Verifie article par article que le catalogue a bien la forme attendue.
   Un article mal forme est ecarte plutot que de faire tomber toute la boutique.

   Forme attendue d'un article :
     { id, n, sizes:[...], colors:[{k, h, imgs:[]}], v:[{k, p, u, pf, d:[], imgs:[]}] }
   Les photos (imgs), les descriptions (d) et les adresses d'images (u) ne servent
   qu'a votre site : elles sont volontairement NON recopiees ici. Seuls le nom,
   le prix, l'identifiant Printful, les tailles et les noms de couleurs sont
   conservees en memoire. Le catalogue garde ainsi une taille minuscule meme si
   votre fichier de catalogue grossit beaucoup avec les photos. */
function nettoyerCatalogue(brut) {
  const it = brut && brut.cfg && brut.cfg.shop && brut.cfg.shop.items;
  if (!Array.isArray(it)) return [];
  const propres = [];
  for (const a of it.slice(0, L.articlesCatalogueMax)) {
    if (!a || typeof a !== 'object') continue;
    const id = texteSimple(a.id, 60);
    const nom = texteSimple(a.n, 120);
    if (!id || !nom) continue;
    if (!Array.isArray(a.v) || !a.v.length) continue;

    const variantes = [];
    for (const v of a.v.slice(0, L.variantesMax)) {
      if (!v || typeof v !== 'object') { variantes.push(null); continue; }
      /* Le plancher de prix s'applique ici : une version dont le prix est vide,
         nul, negatif, non numerique ou inferieur a un euro est mise de cote.
         Elle garde sa place dans la liste pour que les indices envoyes par le
         navigateur restent alignes, mais elle ne peut plus etre commandee. */
      const cents = eurc(v.p, L.ligneMinCents);
      if (cents === null) { variantes.push(null); continue; }
      variantes.push({ k: texteSimple(v.k, 80) || 'Standard', cents, pf: texteSimple(v.pf, 200) });
    }
    if (!variantes.some(Boolean)) continue;

    const tailles = Array.isArray(a.sizes) ? a.sizes.map(s => texteSimple(s, 12)).filter(Boolean).slice(0, L.taillesMax) : [];

    /* Couleurs facultatives. On ne garde que le nom : c'est la seule chose dont
       le Worker a besoin pour etiqueter la ligne et vous dire quoi expedier.
       Une couleur mal formee devient null mais garde sa place dans la liste :
       les indices envoyes par le navigateur restent ainsi alignes sur les votres. */
    const couleurs = Array.isArray(a.colors)
      ? a.colors.slice(0, L.couleursMax).map(c => (c && typeof c === 'object' && texteSimple(c.k, 40)) || null)
      : [];

    propres.push({ id, n: nom, sizes: tailles, colors: couleurs.some(Boolean) ? couleurs : [], v: variantes });
  }
  return propres;
}

/* Renvoie { items, frais, souci }.
   items vaut null si aucun catalogue fiable n'est disponible : dans ce cas on
   refuse le paiement plutot que de deviner un prix. */
async function catalogue(env) {
  const maintenant = Date.now();
  if (CAT.items && maintenant - CAT.t < CAT_FRAIS_MS) return { items: CAT.items, frais: true, souci: null };
  if (!rempli(env.SITE_URL)) {
    if (CAT.items) return { items: CAT.items, frais: false, souci: 'SITE_URL non configuree' };
    return { items: DEFAULT_ITEMS.length ? DEFAULT_ITEMS : null, frais: false, souci: 'SITE_URL non configuree' };
  }

  let brut = null, souci = null;
  try {
    const url = env.SITE_URL + 'site-edits.json?t=' + maintenant;
    const r = await fetch(url, { cf: { cacheTtl: 0 }, headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(DELAIS.catalogue) });
    if (!r || !r.ok) souci = 'le site a repondu ' + ((r && r.status) || 'rien');
    else {
      const txt = await r.text();
      if (typeof txt !== 'string' || !txt.length) souci = 'catalogue vide';
      else if (txt.length > L.catalogueMaxOctets) souci = 'catalogue trop volumineux';
      else { try { brut = JSON.parse(txt); } catch (e) { souci = 'catalogue illisible (JSON abime)'; } }
    }
  } catch (e) { souci = 'site injoignable'; }

  if (brut) {
    const propre = nettoyerCatalogue(brut);
    if (propre.length) { CAT = { t: maintenant, items: propre }; return { items: propre, frais: true, souci: null }; }
    souci = 'catalogue sans article exploitable';
  }

  /* Le site ne repond pas : on se replie sur le dernier catalogue connu s'il est
     encore recent, sinon sur le catalogue de secours, sinon on refuse. */
  if (CAT.items && maintenant - CAT.t < CAT_SECOURS_MS) return { items: CAT.items, frais: false, souci };
  if (DEFAULT_ITEMS.length) return { items: DEFAULT_ITEMS, frais: false, souci };
  return { items: null, frais: false, souci: souci || 'catalogue indisponible' };
}

/* ---------------------------------------------------------------------------
   CONSTRUCTION DU PANIER
   Renvoie { lignes } si tout va bien, sinon { err, detail } avec une raison lisible.
--------------------------------------------------------------------------- */
function construire(items, panier) {
  if (!Array.isArray(panier)) return { err: 'panier', detail: 'panier absent' };
  if (!panier.length) return { err: 'panier', detail: 'panier vide' };
  if (panier.length > L.lignesMax) return { err: 'panier', detail: 'plus de ' + L.lignesMax + ' articles differents' };

  const lignes = [];
  let quantiteTotale = 0, total = 0;
  for (const l of panier) {
    if (!l || typeof l !== 'object') return { err: 'panier', detail: 'ligne de panier invalide' };

    const idDemande = texteSimple(l.id, 60);
    const art = items.find(x => x && x.id === idDemande);
    if (!art) return { err: 'panier', detail: 'article inconnu ou retire du catalogue : ' + (idDemande || '(vide)') };

    const iv = Number(l.v);
    if (!Number.isInteger(iv) || iv < 0 || iv >= art.v.length) return { err: 'panier', detail: 'variante inconnue pour ' + art.id };
    const v = art.v[iv];
    if (!v) return { err: 'panier', detail: 'variante indisponible pour ' + art.id };

    /* Deuxieme controle du prix, juste avant de facturer. Il parait redondant avec
       celui du catalogue, il ne l'est pas : c'est le dernier filet avant Stripe,
       et il garantit qu'aucune ligne a zero euro, ni a quelques centimes, ne peut
       etre imprimee puis expediee a vos frais. */
    if (!Number.isFinite(v.cents) || v.cents < L.ligneMinCents) {
      return { err: 'panier', detail: 'prix indisponible pour ' + art.id + ' : cet article n est pas en vente pour le moment' };
    }

    const q = Number(l.q);
    if (!Number.isInteger(q) || q < 1) return { err: 'panier', detail: 'quantite invalide pour ' + art.id };
    if (q > L.quantiteMax) return { err: 'panier', detail: 'quantite trop grande pour ' + art.id + ' (maximum ' + L.quantiteMax + ')' };

    let taille = texteSimple(l.s, 12);
    if (art.sizes && art.sizes.length) {
      if (!art.sizes.includes(taille)) return { err: 'panier', detail: 'taille inexistante pour ' + art.id + ' : ' + (taille || '(vide)') };
    } else taille = '';

    /* Couleur facultative : le navigateur n'envoie qu'un indice, dans le champ « c ».
       Le nom de la couleur est toujours relu dans votre catalogue a partir de cet
       indice : un nom de couleur envoye par le client est purement ignore, exactement
       comme un prix. Si l'article propose des couleurs, l'indice doit en designer une.
       Si l'article n'en propose pas, le champ est ignore et un panier plus ancien,
       enregistre sans ce champ, continue de fonctionner comme avant. */
    let couleur = '', ic = null;
    if (art.colors && art.colors.length) {
      ic = Number(l.c);
      if (!Number.isInteger(ic) || ic < 0 || ic >= art.colors.length || !art.colors[ic]) {
        return { err: 'panier', detail: 'couleur inexistante pour ' + art.id + ' : ' + (l.c === undefined || l.c === null || l.c === '' ? '(aucune choisie)' : String(l.c).slice(0, 20)) };
      }
      couleur = art.colors[ic];
    } else ic = null;

    const precisions = [taille, couleur].filter(Boolean).join(', ');
    quantiteTotale += q;
    total += v.cents * q;
    lignes.push({
      id: art.id, v: iv, s: taille, q,
      c: ic, couleur,            /* indice et nom venus du catalogue, jamais du navigateur */
      pf: v.pf,
      base: texteSimple(art.n + ' - ' + v.k, 120),
      name: texteSimple(art.n + ' - ' + v.k + (precisions ? ' (' + precisions + ')' : ''), 120),
      cents: v.cents /* prix du catalogue publie, jamais celui du navigateur */
    });
  }
  if (quantiteTotale > L.quantiteTotaleMax) return { err: 'panier', detail: 'plus de ' + L.quantiteTotaleMax + ' articles au total (maximum ' + L.quantiteTotaleMax + ')' };
  if (!Number.isFinite(total) || total < L.totalMinCents) return { err: 'panier', detail: 'montant de commande trop faible : ce panier ne peut pas etre facture' };
  if (total > L.totalMaxCents) return { err: 'panier', detail: 'montant trop eleve pour une commande en ligne' };
  return { lignes, total, quantiteTotale };
}

/* ---------------------------------------------------------------------------
   VERIFICATION DE LA SIGNATURE STRIPE
   On signe le corps BRUT recu, tel quel, sans le relire ni le reformater :
   le moindre espace en plus invaliderait la signature.
--------------------------------------------------------------------------- */
async function verifierStripe(raw, header, secret) {
  if (!rempli(secret)) return { ok: false, raison: 'secret-absent' };
  if (!rempli(header)) return { ok: false, raison: 'entete-absente' };

  const parts = {};
  for (const seg of String(header).split(',')) {
    const i = seg.indexOf('=');
    if (i < 1) continue;
    const cle = seg.slice(0, i).trim(), val = seg.slice(i + 1).trim();
    if (!cle || !val) continue;
    (parts[cle] = parts[cle] || []).push(val);
  }

  const t = (parts.t || [])[0];
  if (!/^\d{9,12}$/.test(String(t || ''))) return { ok: false, raison: 'horodatage' };
  const ecart = Math.floor(Date.now() / 1000) - Number(t);
  if (ecart > SIG_TOLERANCE_PASSE) return { ok: false, raison: 'perime' };
  if (ecart < -SIG_TOLERANCE_FUTUR) return { ok: false, raison: 'date-future' };

  const signatures = (parts.v1 || []).filter(v => /^[0-9a-f]{64}$/i.test(v));
  if (!signatures.length) return { ok: false, raison: 'signature-absente' };

  const attendu = await hmacHex(secret, t + '.' + raw);
  for (const v of signatures) if (await egalSecurise(v.toLowerCase(), attendu)) return { ok: true, raison: 'ok' };
  return { ok: false, raison: 'signature' };
}

/* ---------------------------------------------------------------------------
   PROTECTION CONTRE LES DOUBLONS (idempotence)

   Stripe relance ses webhooks jusqu'a ce qu'il recoive une reponse, et deux
   evenements differents peuvent concerner la meme commande presque en meme temps.
   Sans garde-fou, la commande partirait deux fois chez Printful et votre bot
   recevrait deux messages.

   L'espace KV ne propose aucun verrou. Nous posons donc trois garde-fous :
     1. une empreinte de l'evenement : un evenement deja traite est ignore
        (on utilise l'identifiant Stripe, ou l'empreinte du corps brut a defaut) ;
     2. un jeton de reservation par commande : le premier appel qui ecrit son
        jeton puis le relit inchange a seul le droit d'envoyer la commande
        chez Printful et de prevenir le bot ;
     3. l'« external_id » envoye a Printful est la reference de commande :
        Printful refuse lui-meme une seconde commande portant la meme reference.

   LIMITE A CONNAITRE, ecrite noir sur blanc : KV n'est pas immediatement coherent
   entre les centres de donnees de Cloudflare (quelques secondes de decalage
   possible). Si deux evenements arrivaient dans la meme seconde sur deux
   continents, les deux pourraient croire avoir la reservation. C'est le garde-fou
   numero 3, chez Printful, qui empeche alors le double envoi reel. Une vraie
   exclusion demanderait un Durable Object, ce qui compliquerait l'installation.

   Un appel interrompu en cours de route (Worker coupe) laisse une reservation
   ouverte. Au bout de dix minutes, elle est consideree comme abandonnee et la
   relance suivante de Stripe peut reprendre le travail la ou il s'etait arrete.
--------------------------------------------------------------------------- */
const REPRISE_MS = 10 * 60 * 1000;

async function reserver(env, cle) {
  let existant = null;
  try { existant = await env.ORDERS.get(cle); } catch (e) { return null; }
  if (existant) {
    let e = {};
    try { e = JSON.parse(existant) || {}; } catch (_) { e = {}; }
    if (e.fini) return null;                                   // travail deja termine
    if (Date.now() - (e.t || 0) < REPRISE_MS) return null;      // un autre appel s'en occupe
  }
  const jeton = rid();
  await env.ORDERS.put(cle, JSON.stringify({ jeton, t: Date.now() }), { expirationTtl: TTL_RESERVATION });
  let relu = null;
  try { relu = await env.ORDERS.get(cle); } catch (e) { return null; }
  try { if (!relu || JSON.parse(relu).jeton !== jeton) return null; } catch (_) { return null; }
  return jeton;
}
async function clore(env, cle, jeton, note) {
  try { await env.ORDERS.put(cle, JSON.stringify({ jeton, t: Date.now(), fini: true, note: note || '' }), { expirationTtl: TTL_RESERVATION }); } catch (e) {}
}

/* ---------------------------------------------------------------------------
   LECTURE ET ECRITURE DES COMMANDES
--------------------------------------------------------------------------- */
async function lireCommande(env, id) {
  try { const r = await env.ORDERS.get('o:' + id); return r ? JSON.parse(r) : null; } catch (e) { return null; }
}

/* Etats qui ont le droit de prendre la place d'un « paid » deja enregistre.
   Un remboursement et une contestation sont des faits reels et posterieurs au
   paiement : le site doit cesser de dire « commande confirmee ». A l'inverse,
   une session expiree ou un paiement refuse arrivant en retard ne doivent
   jamais effacer un paiement bien encaisse. */
const ETATS_APRES_PAIEMENT = ['remboursee', 'contestee'];

/* Met a jour une commande. Trois regles de prudence :
     - une commande deja payee ne peut plus redevenir « pending », « expired »
       ou « canceled » : un evenement en retard ne doit pas effacer un paiement ;
     - elle peut en revanche devenir « remboursee » ou « contestee » ;
     - seule la fonction du webhook ecrit « paid », et seulement apres avoir
       verifie le montant reellement encaisse. */
async function majCommande(env, id, patch) {
  if (!id) return null;
  const o = await lireCommande(env, id);
  if (!o) return null;
  const suite = Object.assign({}, o, patch);
  if (o.status === 'paid' && patch.status && patch.status !== 'paid' && !ETATS_APRES_PAIEMENT.includes(patch.status)) {
    suite.status = 'paid';
    suite.noteEtat = 'Evenement « ' + patch.status + ' » recu apres le paiement : etat conserve a paid.';
  }
  try { await env.ORDERS.put('o:' + id, JSON.stringify(suite), { expirationTtl: ttlPour(suite.status) }); } catch (e) { return null; }
  return suite;
}

/* Petit annuaire : identifiant de paiement Stripe -> reference de commande.
   Il est indispensable pour traiter un remboursement ou une contestation :
   ces evenements parlent d'un paiement, pas d'une session de paiement, et ne
   portent donc pas la reference de commande. */
async function noterPaiement(env, paymentIntent, id) {
  const pi = texteSimple(paymentIntent, 80);
  if (!pi || !id) return;
  try { await env.ORDERS.put('pi:' + pi, String(id), { expirationTtl: TTL_COMMANDE_PAYEE }); } catch (e) {}
}
async function commandeDuPaiement(env, paymentIntent) {
  const pi = texteSimple(paymentIntent, 80);
  if (!pi) return '';
  try { return (await env.ORDERS.get('pi:' + pi)) || ''; } catch (e) { return ''; }
}

/* ---------------------------------------------------------------------------
   /checkout : creation de la page de paiement
--------------------------------------------------------------------------- */

/* Lit le corps de la requete en refusant ce qui est trop gros. */
async function corpsJson(req) {
  const annonce = Number(req.headers.get('Content-Length') || 0);
  if (Number.isFinite(annonce) && annonce > L.corpsMaxOctets) return { err: 'trop-gros' };
  let txt;
  try { txt = await req.text(); } catch (e) { return { err: 'lecture' }; }
  if (txt.length > L.corpsMaxOctets) return { err: 'trop-gros' };
  try { return { data: JSON.parse(txt) }; } catch (e) { return { err: 'json' }; }
}

/* Verifie les coordonnees du client. */
function verifierCoordonnees(b) {
  const nom = texteSimple(b.name, L.nomMax);
  const email = texteSimple(b.email, L.emailMax);
  const adresse = texteSimple(b.address, L.adresseMax);

  if (nom.length < 2 || !CONTIENT_LETTRE.test(nom)) return { err: 'champs', detail: 'nom trop court' };
  if (CARACTERES_INATTENDUS.test(nom) || CONTIENT_LIEN.test(nom)) return { err: 'champs', detail: 'caracteres inattendus dans le nom' };
  if (email.length > L.emailMax || !/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/.test(email)) return { err: 'champs', detail: 'adresse e-mail invalide' };
  if (adresse.length < 8) return { err: 'champs', detail: 'adresse postale trop courte' };
  if (CARACTERES_INATTENDUS.test(adresse) || CONTIENT_LIEN.test(adresse)) return { err: 'champs', detail: 'caracteres inattendus dans l adresse' };

  /* Le nom et l'adresse sont deja debarrasses des caracteres de controle et des
     retours a la ligne par texteSimple, et le code du bon ne garde que lettres,
     chiffres et tirets. Ces trois textes sont les seuls que le client choisit et
     qui finissent dans le message de votre bot. */
  return { nom, email, adresse, bon: codeBon(b.voucher), uid: texteSimple(b.uid, 60) };
}

/* Compteur simple d'appels repetes. Voir le commentaire de RL pour sa limite. */
async function appelsRepetes(env, req) {
  if (!env.ORDERS) return null;
  const ip = req.headers.get('CF-Connecting-IP') || (req.headers.get('X-Forwarded-For') || '').split(',')[0].trim() || 'inconnu';
  const fenetre = Math.floor(Date.now() / 1000 / RL.fenetreSecondes);
  const cle = 'rl:' + fenetre + ':' + ip.slice(0, 60);
  let n = 0;
  try { n = Number(await env.ORDERS.get(cle)) || 0; } catch (e) { return null; }
  if (n >= RL.maxParFenetre) return { bloque: true };
  /* Le compteur doit survivre a sa propre tranche de temps, sinon il s effacerait
     en cours de route et la rafale repartirait de zero. On garde donc le double
     de la duree de la tranche : KV n accepte pas moins de soixante secondes. */
  try { await env.ORDERS.put(cle, String(n + 1), { expirationTtl: Math.max(60, RL.fenetreSecondes * 2) }); } catch (e) {}
  return null;
}

/* Refuse une page etrangere qui tenterait d'utiliser votre Worker depuis un navigateur. */
function origineAcceptee(req, env) {
  const origine = req.headers.get('Origin');
  if (!origine) return true; // appel hors navigateur, par exemple un essai en ligne de commande
  const autorisees = [];
  if (rempli(env.ALLOWED_ORIGIN)) autorisees.push(env.ALLOWED_ORIGIN.trim().replace(/\/$/, ''));
  if (rempli(env.SITE_URL)) { try { autorisees.push(new URL(env.SITE_URL).origin); } catch (e) {} }
  if (!autorisees.length) return true; // rien de configure : on ne peut comparer a rien
  if (autorisees.includes('*')) return true;
  return autorisees.includes(origine.replace(/\/$/, ''));
}

async function checkout(req, env) {
  if (!env.ORDERS) return j({ ok: false, err: 'kv', msg: 'L espace KV ORDERS n est pas lie au Worker. Ouvrez /health.' }, 503, env);
  if (!rempli(env.STRIPE_SECRET)) return j({ ok: false, err: 'config', msg: 'La cle Stripe n est pas configuree. Ouvrez /health.' }, 503, env);
  if (!origineAcceptee(req, env)) return j({ ok: false, err: 'origine', msg: 'Origine non autorisee.' }, 403, env);

  const limite = await appelsRepetes(env, req);
  if (limite) return j({ ok: false, err: 'trop', msg: 'Trop de demandes de paiement en peu de temps. Merci de patienter une minute.' }, 429, env, { 'Retry-After': '60' });

  const corps = await corpsJson(req);
  if (corps.err === 'trop-gros') return j({ ok: false, err: 'json', msg: 'Panier trop volumineux.' }, 413, env);
  if (corps.err) return j({ ok: false, err: 'json', msg: 'Donnees illisibles.' }, 400, env);
  const b = corps.data && typeof corps.data === 'object' ? corps.data : {};

  const c = verifierCoordonnees(b);
  if (c.err) return j({ ok: false, err: c.err, msg: c.detail }, 400, env);

  const cat = await catalogue(env);
  if (!cat.items) return j({ ok: false, err: 'catalogue', msg: 'La boutique est momentanement indisponible : ' + cat.souci + '. Merci de reessayer dans quelques minutes.' }, 503, env);

  const p = construire(cat.items, b.items);
  if (p.err) return j({ ok: false, err: p.err, msg: p.detail }, 400, env);

  const id = rid();
  const fraisPort = rempli(env.SHIPPING_EUR) ? eurc(env.SHIPPING_EUR) : null;

  /* ----------------------------------------------------------------------
     LA COMMANDE EST ECRITE AVANT D'APPELER STRIPE.
     Autrefois la session de paiement etait creee d'abord : si l'ecriture dans
     KV echouait juste apres (quota atteint, panne passagere), le client se
     retrouvait devant une page de paiement parfaitement valide pour une
     commande dont le serveur n'avait aucune trace. Il payait, et plus personne
     ne savait quoi lui envoyer.
     Dans l'ordre actuel, si KV refuse d'ecrire, aucune page de paiement n'est
     ouverte : personne ne peut payer dans le vide.
     Le champ « attendu » est le montant que Stripe devra encaisser, au centime,
     frais de port compris. C'est lui que le webhook comparera au montant reel.
  ---------------------------------------------------------------------- */
  const attendu = p.total + (fraisPort || 0);
  try {
    await env.ORDERS.put('o:' + id, JSON.stringify({
      id, status: 'pending', created: Date.now(),
      name: c.nom, email: c.email, address: c.adresse,
      voucher: c.bon, uid: c.uid,
      lines: p.lignes, total: p.total,
      quantite: p.quantiteTotale,
      shipping: fraisPort || 0,
      attendu,                 /* total a encaisser, port compris */
      currency: 'eur',
      catalogueFrais: cat.frais, session: null
    }), { expirationTtl: TTL_COMMANDE_ATTENTE });
  } catch (e) {
    return j({ ok: false, err: 'kv', msg: 'La commande n a pas pu etre enregistree. Aucun paiement n a ete ouvert, merci de reessayer.' }, 503, env);
  }

  const site = rempli(env.SITE_URL) ? env.SITE_URL : 'https://example.invalid/';
  const f = new URLSearchParams();
  f.set('mode', 'payment');
  f.set('success_url', site + '#order-' + id);
  f.set('cancel_url', site + '#cart');
  f.set('client_reference_id', id);
  f.set('customer_email', c.email);
  f.set('locale', 'auto');
  f.set('expires_at', String(Math.floor(Date.now() / 1000) + 3600));
  p.lignes.forEach((l, i) => {
    const pref = 'line_items[' + i + ']';
    f.set(pref + '[quantity]', String(l.q));
    f.set(pref + '[price_data][currency]', 'eur');
    f.set(pref + '[price_data][unit_amount]', String(l.cents));
    f.set(pref + '[price_data][product_data][name]', l.name || 'Article');
  });
  (env.SHIPPING_COUNTRIES || 'FR').split(',').map(x => x.trim().toUpperCase()).filter(x => /^[A-Z]{2}$/.test(x)).forEach((pays, i) => f.set('shipping_address_collection[allowed_countries][' + i + ']', pays));
  if (fraisPort) {
    f.set('shipping_options[0][shipping_rate_data][type]', 'fixed_amount');
    f.set('shipping_options[0][shipping_rate_data][display_name]', 'Livraison');
    f.set('shipping_options[0][shipping_rate_data][fixed_amount][amount]', String(fraisPort));
    f.set('shipping_options[0][shipping_rate_data][fixed_amount][currency]', 'eur');
  }
  f.set('metadata[order_id]', id);
  f.set('metadata[nom]', c.nom);
  f.set('metadata[adresse]', c.adresse.slice(0, 480));
  if (c.bon) f.set('metadata[bon]', c.bon);
  if (c.uid) f.set('metadata[uid]', c.uid);

  let s = null, httpOk = false;
  try {
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + env.STRIPE_SECRET, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: f,
      signal: AbortSignal.timeout(DELAIS.stripe)
    });
    httpOk = !!(r && r.ok);
    s = r ? await r.json().catch(() => null) : null;
  } catch (e) { s = null; }

  if (!httpOk || !s || !s.url) {
    /* Aucune page de paiement : la commande est close tout de suite pour qu'elle
       ne traine pas en « pending » dans votre liste. Elle n'est evidemment pas payee. */
    await majCommande(env, id, { status: 'canceled', noteEtat: 'La page de paiement Stripe n a pas pu etre ouverte : commande abandonnee avant tout paiement.' });
    return j({ ok: false, err: 'stripe', msg: 'Le paiement n a pas pu etre ouvert. Merci de reessayer.' }, 502, env);
  }

  /* La commande reste en « pending ». Elle ne passera a « paid » que par un
     webhook Stripe correctement signe ET un montant encaisse conforme. */
  await majCommande(env, id, { session: s.id });
  return j({ ok: true, id, url: s.url }, 200, env);
}

/* ---------------------------------------------------------------------------
   ENVOI AUTOMATIQUE CHEZ PRINTFUL
   Des que Stripe confirme le paiement, la commande part chez Printful qui imprime
   et expedie au client. Si Printful ne repond pas ou refuse, la commande reste
   PAYEE : seul l'etat d'expedition le signale, et votre bot vous l'indique.
--------------------------------------------------------------------------- */
/* Comment ecrire l'identifiant Printful d'une version, dans votre catalogue :
     - un seul article sans declinaison    :  pf = "4012345"
     - une declinaison par taille          :  pf = "S:110,M:111,L:112"
     - une declinaison par taille et couleur : pf = "M/NOIR:111,M/BLANC:121"
   La recherche essaie d'abord « taille/couleur », puis « couleur/taille », puis
   la couleur seule, puis la taille seule. Les anciens catalogues ecrits par
   taille uniquement continuent donc de fonctionner sans rien changer. */
function pfVariant(pf, taille, couleur) {
  pf = String(pf || '').trim();
  if (!pf) return 0;
  if (/^\d+$/.test(pf)) return Number(pf);
  const m = {};
  pf.split(/[,;]/).forEach(x => {
    const i = x.indexOf(':');
    if (i < 1) return;
    const k = x.slice(0, i).trim().toUpperCase(), v = Number(x.slice(i + 1).trim());
    if (k && Number.isFinite(v) && v > 0) m[k] = v;
  });
  const t = String(taille || '').toUpperCase(), c = String(couleur || '').toUpperCase();
  const cles = [];
  if (t && c) cles.push(t + '/' + c, c + '/' + t, t + '-' + c, c + '-' + t);
  if (c) cles.push(c);
  if (t) cles.push(t);
  for (const k of cles) if (m[k]) return m[k];
  return 0;
}

/* Dit si la commande vient d'un paiement de test (carte 4242 4242 4242 4242).
   Stripe le precise dans chaque evenement avec le champ livemode. Par securite,
   un evenement qui ne le precise pas est aussi considere comme un essai lorsque
   la cle Stripe configuree est une cle de test. Mieux vaut ne rien imprimer a tort
   que de vous faire facturer une commande qui n'existe pas. */
function paiementDeTest(env, o) {
  if (o.livemode === false) return true;
  if (o.livemode === true) return false;
  return String(env.STRIPE_SECRET || '').startsWith('sk_test_');
}

/* true si les commandes doivent arriver en brouillon chez Printful. */
function modeBrouillon(env) {
  const v = String(env.PRINTFUL_DRAFT == null ? '' : env.PRINTFUL_DRAFT).trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'oui';
}

async function fulfil(env, o, debut) {
  if (!rempli(env.PRINTFUL_TOKEN)) return { status: 'manual', code: 'non-active', note: 'Envoi automatique non active : commande a expedier vous-meme.' };

  /* Garde-fou le plus important pour votre porte-monnaie : un paiement de test
     ne declenche jamais d'impression reelle. */
  if (paiementDeTest(env, o)) {
    return { status: 'manual', code: 'mode-test', note: 'ESSAI : paiement en mode test Stripe, aucune commande envoyee chez Printful. Rien n a ete imprime et rien ne vous sera facture.' };
  }

  const articles = [], manquants = [];
  (o.lines || []).forEach(l => {
    const vid = pfVariant(l.pf, l.s, l.couleur);
    if (vid) articles.push({ sync_variant_id: vid, quantity: l.q });
    else manquants.push(l.name);
  });
  if (!articles.length && !manquants.length) return { status: 'manual', code: 'panier-vide', note: 'Aucun article a envoyer : commande a verifier vous-meme.' };
  if (manquants.length) return { status: 'manual', code: 'identifiant-manquant', note: 'Identifiant Printful manquant pour : ' + manquants.join(', ') + '. Commande a expedier vous-meme.' };

  const a = (o.shipTo && o.shipTo.address) || {};
  if (!a.line1) return { status: 'manual', code: 'adresse-absente', note: 'Adresse de livraison absente de la confirmation Stripe : commande a expedier vous-meme.' };

  const body = {
    recipient: {
      name: texteSimple((o.shipTo && o.shipTo.name) || o.name, 120),
      address1: texteSimple(a.line1, 120),
      address2: texteSimple(a.line2, 120),
      city: texteSimple(a.city, 80),
      state_code: texteSimple(a.state, 20),
      country_code: texteSimple(a.country, 2) || 'FR',
      zip: texteSimple(a.postal_code, 20),
      email: o.stripeEmail || o.email,
      phone: texteSimple(o.stripePhone, 30)
    },
    /* La reference de commande sert de garde-fou : Printful refuse deux commandes
       portant le meme external_id, ce qui empeche un double envoi. */
    external_id: String(o.id).slice(0, 32),
    items: articles
  };
  const h = { Authorization: 'Bearer ' + env.PRINTFUL_TOKEN, 'Content-Type': 'application/json' };
  if (rempli(env.PRINTFUL_STORE_ID)) h['X-PF-Store-Id'] = env.PRINTFUL_STORE_ID;

  /* Mode brouillon : confirm=false envoie la commande chez Printful sans la lancer.
     Vous la validez vous-meme depuis votre tableau de bord Printful, donc rien
     n'est imprime ni facture avant votre accord. */
  const brouillon = modeBrouillon(env);
  const adresse = 'https://api.printful.com/orders?confirm=' + (brouillon ? 'false' : 'true');
  const suffixeBrouillon = brouillon ? ' ATTENTION : elle attend votre validation manuelle dans votre tableau de bord Printful, sans quoi elle ne sera pas imprimee.' : '';

  /* Relance simple : jusqu'a trois tentatives, uniquement pour les pannes
     passageres (service injoignable, delai depasse, 429, 5xx). Un refus clair
     de Printful (4xx) n'est pas relance : le probleme ne disparaitrait pas. */
  const ESSAIS = RELANCES.printfulEssais;
  const limite = (debut || Date.now()) + RELANCES.printfulLimiteMs;
  const encoreLeTemps = () => Date.now() < limite;
  let dernier = '';
  for (let essai = 1; essai <= ESSAIS; essai++) {
    try {
      const r = await fetch(adresse, { method: 'POST', headers: h, body: JSON.stringify(body), signal: AbortSignal.timeout(DELAIS.printful) });
      const rep = r ? await r.json().catch(() => ({})) : {};
      const message = String((rep && rep.error && rep.error.message) || (rep && rep.result) || '').slice(0, 200);

      if (r && r.ok && rep && rep.result) {
        return brouillon
          ? { status: 'sent', code: 'brouillon', note: 'Deposee chez Printful en BROUILLON (commande numero ' + (rep.result.id || '?') + ').' + suffixeBrouillon, pfId: rep.result.id }
          : { status: 'sent', code: 'ok', note: 'Envoyee automatiquement a Printful (commande numero ' + (rep.result.id || '?') + ') : impression et expedition au client.', pfId: rep.result.id };
      }
      /* Printful signale une commande deja existante avec la meme reference :
         c'est que l'envoi a deja eu lieu. On considere la commande comme partie. */
      if (r && (r.status === 409 || /external_id|already exist|duplicat/i.test(message))) {
        return { status: 'sent', code: 'deja-envoyee', note: 'Deja enregistree chez Printful avec la meme reference : aucun second envoi.' + suffixeBrouillon };
      }
      const passager = r && (r.status === 429 || r.status >= 500);
      dernier = 'reponse ' + ((r && r.status) || '?') + (message ? ' : ' + message : '');
      if (passager && essai < ESSAIS && encoreLeTemps()) { await pause(500 * essai); continue; }
      if (passager) return { status: 'error', code: 'panne', note: 'Printful indisponible apres ' + ESSAIS + ' tentatives (' + dernier + '). La commande est payee et reste a traiter vous-meme.' };
      return { status: 'error', code: 'refus', note: 'Printful a refuse la commande (' + dernier + '). La commande est payee et reste a traiter vous-meme.' };
    } catch (e) {
      dernier = (e && e.name === 'TimeoutError') ? 'delai d attente depasse' : 'service injoignable';
      if (essai < ESSAIS && encoreLeTemps()) { await pause(500 * essai); continue; }
      return { status: 'error', code: 'panne', note: 'Printful injoignable apres ' + ESSAIS + ' tentatives (' + dernier + '). La commande est payee et reste a traiter vous-meme.' };
    }
  }
  return { status: 'error', code: 'panne', note: 'Printful injoignable (' + dernier + '). La commande est payee et reste a traiter vous-meme.' };
}

/* ---------------------------------------------------------------------------
   MESSAGE AU BOT
   Envoye UNIQUEMENT quand Stripe confirme que l'argent est encaisse,
   et une seule fois par commande.
--------------------------------------------------------------------------- */
function orderText(o) {
  const eur = c => (Number(c || 0) / 100).toFixed(2).replace('.', ',') + ' euros';
  const a = (o.shipTo && o.shipTo.address) || {};
  const adr = a.line1
    ? [((o.shipTo && o.shipTo.name) || o.name), a.line1, a.line2, (a.postal_code || '') + ' ' + (a.city || ''), a.country].filter(x => x && String(x).trim()).join(', ')
    : o.address;
  const lignes = [
    o.modeTest ? 'ESSAI EN MODE TEST STRIPE : aucun argent reel encaisse, aucune impression lancee.' : null,
    o.modeTest ? '' : null,
    'COMMANDE PAYEE : ' + eur(o.amount),
    'Reference : ' + o.id,
    'Date : ' + new Date(o.paidAt || Date.now()).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }),
    '',
    'Articles :',
    /* La taille et la couleur sont rappelees en clair pour que vous sachiez
       exactement quoi expedier, meme quand l'envoi automatique n'a pas pu se faire. */
    ...(o.lines || []).map(l => {
      const precisions = [l.s ? 'taille ' + l.s : null, l.couleur ? 'couleur ' + l.couleur : null].filter(Boolean).join(', ');
      const libelle = l.base || l.name;
      return ' - ' + l.q + ' x ' + libelle + (precisions ? '  [' + precisions + ']' : '') + '  (' + eur(l.cents * l.q) + ')';
    }),
    o.shippingCost ? 'Livraison : ' + eur(o.shippingCost) : 'Livraison : non facturee',
    /* Point important a ne pas laisser croire : ce code est simplement recopie de
       ce que le client a tape dans le formulaire. Le Worker ne le verifie pas,
       ne lui applique aucune remise, et le montant encaisse ci-dessous est le
       plein tarif du catalogue. A vous de decider s'il est valable. */
    o.voucher ? 'Bon d achat : « ' + o.voucher + ' » annonce par le client, NON VERIFIE par le site. Aucune remise n a ete appliquee : le montant encaisse est le plein tarif. A vous de controler ce code et de decider.' : null,
    'TOTAL ENCAISSE : ' + eur(o.amount),
    '',
    /* Le nom et l'adresse sont des textes tapes par le client. Ils sont deja
       debarrasses des retours a la ligne, ce qui empeche d'inventer une ligne
       entiere, mais on les presente entre guillemets pour qu'il soit evident
       d'un coup d'oeil ou commence et ou s'arrete ce que le client a ecrit. */
    'Client : « ' + o.name + ' »',
    'E-mail : ' + (o.stripeEmail || o.email),
    o.stripePhone ? 'Telephone : ' + o.stripePhone : null,
    'Adresse de livraison : « ' + adr + ' »',
    o.uid ? 'Compte : ' + o.uid : null,
    '',
    'Expedition : ' + (o.fulfilNote || 'etat inconnu')
  ];
  /* Les lignes a null sont les informations absentes : on les retire,
     les lignes vides restent pour aerer le message. */
  return lignes.filter(x => x !== null && x !== undefined).join('\n');
}

/* Envoie un texte, et un petit objet facultatif, a tous les bots configures, et
   renvoie l'etat de cet envoi. ok vaut true si au moins un bot a bien recu le
   message, ou si aucun bot n'est configure : il n'y a alors rien a attendre.

   C'est la seule porte de sortie vers vos bots : tout ce qui part d'ici porte
   « allowed_mentions: { parse: [] } », ce qui demande a Discord de n'alerter
   personne meme si le message contient @everyone ou @here. Sans cela, un client
   pouvait faire sonner tout votre serveur Discord en se nommant « @everyone ».

   Relance simple : jusqu'a trois tentatives par bot, avec une courte attente entre
   chacune, uniquement pour les pannes passageres (service injoignable, delai
   depasse, 429, 5xx). Une adresse de bot erronee (une reponse 404 par exemple)
   n'est pas relancee, le probleme ne se reglerait pas tout seul.
   Si rien ne passe, l'echec est inscrit dans la commande et reste visible dans
   /admin/orders, et la relance suivante de Stripe retentera le message sans
   renvoyer la commande chez Printful. */
async function envoyerAuBot(env, txt, objet, debut) {
  const limite = (debut || Date.now()) + RELANCES.botLimiteMs;
  const post = async (u, body) => {
    let raison = '';
    for (let essai = 1; essai <= RELANCES.botEssais; essai++) {
      let passager = true;
      try {
        const r = await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(DELAIS.bot) });
        if (r && (r.ok === undefined || r.ok)) return { ok: true, essais: essai, raison: '' };
        const code = (r && r.status) || 0;
        passager = code === 0 || code === 408 || code === 429 || code >= 500;
        raison = 'reponse ' + (code || '?');
      } catch (e) {
        raison = (e && e.name === 'TimeoutError') ? 'delai d attente depasse' : 'service injoignable';
      }
      if (essai < RELANCES.botEssais && passager && Date.now() < limite) { await pause(400 * essai); continue; }
      return { ok: false, essais: essai, raison };
    }
    return { ok: false, essais: RELANCES.botEssais, raison };
  };

  let configure = false, reussi = 0, essais = 0, raison = '';
  if (rempli(env.NOTIFY_WEBHOOK)) { /* Discord, Slack ou tout bot qui accepte du JSON */
    configure = true;
    const res = await post(env.NOTIFY_WEBHOOK, {
      content: txt.slice(0, 1900), text: txt,
      /* Demande explicite de ne declencher aucune mention, quoi que contienne le texte. */
      allowed_mentions: { parse: [] },
      order: objet || null
    });
    essais += res.essais;
    if (res.ok) reussi++; else raison = raison || res.raison;
  }
  if (rempli(env.TELEGRAM_BOT_TOKEN) && rempli(env.TELEGRAM_CHAT_ID)) {
    configure = true;
    const res = await post('https://api.telegram.org/bot' + env.TELEGRAM_BOT_TOKEN + '/sendMessage', { chat_id: env.TELEGRAM_CHAT_ID, text: txt.slice(0, 4000) });
    essais += res.essais;
    if (res.ok) reussi++; else raison = raison || res.raison;
  }
  return { configure, reussi, essais, raison, ok: !configure || reussi > 0 };
}

/* Resume technique joint au message, volontairement maigre.
   Il ne contient plus le nom, l'adresse ni le detail des articles : ces
   informations personnelles n'ont pas besoin de traverser un service de bot et
   d'y rester archivees. Elles restent lisibles pour vous dans /admin/orders.
   Le texte du message, lui, garde tout ce qu'il vous faut pour agir. */
function resumePourBot(env, o) {
  return {
    id: o.id,
    status: o.status || 'paid',
    amount_eur: Number(o.amount || 0) / 100,
    currency: o.currency || 'eur',
    articles: (o.lines || []).length,
    quantite: (o.lines || []).reduce((n, l) => n + Number(l.q || 0), 0),
    paid_at: o.paidAt || null,
    livemode: o.livemode === undefined ? null : o.livemode,
    mode_test: paiementDeTest(env, o),
    voucher_annonce: o.voucher || null,
    voucher_verifie: false,
    fulfil: o.fulfil || null, fulfil_code: o.fulfilCode || null,
    fulfil_note: o.fulfilNote || null, printful_id: o.pfId || null,
    detail: 'Nom, adresse et detail des articles : voir /admin/orders?full=1&id=' + o.id
  };
}

/* Message normal de commande payee. */
async function notify(env, o, debut) {
  return envoyerAuBot(env, orderText(o), resumePourBot(env, o), debut);
}

const euros = c => (Number(c || 0) / 100).toFixed(2).replace('.', ',') + ' euros';

/* ALERTE 1 : paiement orphelin. Stripe annonce un paiement mais aucune commande
   ne correspond. Cela ne doit jamais arriver et c'est pourtant le cas le plus
   grave : quelqu'un a paye et personne ne sait quoi lui envoyer. Rien ne part
   chez l'imprimeur, et vous etes prevenu pour agir a la main. */
async function alerteOrpheline(env, ev, s, debut) {
  const txt = [
    'PAIEMENT A TRAITER A LA MAIN : aucune commande ne correspond.',
    '',
    'Stripe annonce un paiement encaisse, mais ce Worker ne retrouve aucune commande',
    'a ce nom. Rien n a ete envoye a l impression et le site ne confirme rien.',
    '',
    'Montant annonce par Stripe : ' + euros(s && s.amount_total) + ' (' + String((s && s.currency) || '?').toUpperCase() + ')',
    'Reference annoncee : ' + (texteSimple(s && s.client_reference_id, 80) || '(aucune)'),
    'Session de paiement Stripe : ' + (texteSimple(s && s.id, 80) || '(inconnue)'),
    'Paiement Stripe : ' + (texteSimple(s && s.payment_intent, 80) || '(inconnu)'),
    'Mode : ' + (ev && ev.livemode === true ? 'paiement reel' : 'essai en mode test'),
    '',
    'A FAIRE : ouvrez ce paiement dans votre tableau de bord Stripe pour voir qui a',
    'paye et quoi, puis contactez la personne ou remboursez-la. Cela arrive si la',
    'commande a ete creee il y a tres longtemps, ou si la memoire du Worker a eu un',
    'incident entre la creation du panier et le paiement.'
  ].join('\n');
  return envoyerAuBot(env, txt, {
    alerte: 'paiement-orphelin',
    amount_eur: Number((s && s.amount_total) || 0) / 100,
    currency: (s && s.currency) || null,
    stripe_session: (s && s.id) || null,
    stripe_payment_intent: (s && s.payment_intent) || null,
    livemode: ev && ev.livemode === true
  }, debut);
}

/* ALERTE 2 : le montant encaisse ne correspond pas au panier. */
async function alerteMontant(env, o, recu, deviseRecue, attendu, deviseAttendue, debut) {
  const txt = [
    'MONTANT ANORMAL : commande bloquee, rien n a ete envoye a l impression.',
    '',
    'Reference : ' + o.id,
    'Montant attendu d apres le panier, frais de port compris : ' + euros(attendu) + ' (' + deviseAttendue.toUpperCase() + ')',
    'Montant reellement encaisse par Stripe : ' + (Number.isFinite(recu) ? euros(recu) : '(illisible)') + ' (' + String(deviseRecue || '?').toUpperCase() + ')',
    '',
    'La commande n est NI payee NI annulee : elle porte l etat « montant-anormal ».',
    'Le site n annonce donc pas de commande confirmee, et aucune impression n a ete',
    'lancee, pour que vous ne payiez pas une fabrication qui n a pas ete reglee.',
    '',
    'A FAIRE : ouvrez ce paiement dans votre tableau de bord Stripe. S il est bien',
    'conforme, vous pouvez expedier la commande vous-meme. Sinon, remboursez.',
    'Detail des articles et adresse : /admin/orders?full=1&id=' + o.id
  ].join('\n');
  return envoyerAuBot(env, txt, {
    alerte: 'montant-anormal',
    id: o.id,
    attendu_eur: Number(attendu || 0) / 100,
    encaisse_eur: Number.isFinite(recu) ? recu / 100 : null,
    devise_attendue: deviseAttendue,
    devise_encaissee: deviseRecue || null,
    detail: 'Nom, adresse et detail des articles : voir /admin/orders?full=1&id=' + o.id
  }, debut);
}

/* ALERTE 3 : remboursement ou contestation de paiement. */
async function alerteLitige(env, o, etat, debut) {
  const rembourse = etat === 'remboursee';
  const txt = [
    rembourse ? 'PAIEMENT REMBOURSE : la commande n est plus payee.' : 'PAIEMENT CONTESTE : la commande n est plus payee.',
    '',
    'Reference : ' + o.id,
    'Montant concerne : ' + euros(o.amount),
    'Nouvel etat renvoye au site : ' + etat,
    '',
    rembourse
      ? 'Le site ne presente plus cette commande comme confirmee.'
      : 'Le client a conteste ce paiement aupres de sa banque. Stripe va vous demander des justificatifs et peut retenir la somme.',
    '',
    o.fulfil === 'sent'
      ? 'ATTENTION : cette commande avait deja ete envoyee chez Printful (' + (o.pfId || 'numero inconnu') + '). Si elle n est pas encore partie, annulez-la dans votre tableau de bord Printful sans attendre.'
      : 'Aucune impression n avait ete lancee pour cette commande.',
    '',
    'Detail des articles et adresse : /admin/orders?full=1&id=' + o.id
  ].join('\n');
  return envoyerAuBot(env, txt, {
    alerte: etat,
    id: o.id,
    amount_eur: Number(o.amount || 0) / 100,
    status: etat,
    fulfil: o.fulfil || null,
    printful_id: o.pfId || null,
    detail: 'Nom, adresse et detail des articles : voir /admin/orders?full=1&id=' + o.id
  }, debut);
}

/* ---------------------------------------------------------------------------
   /stripe-webhook : confirmation de paiement
--------------------------------------------------------------------------- */
async function webhook(req, env) {
  /* Heure de depart : elle sert de budget de temps aux relances vers Printful
     et vers le bot, pour repondre a Stripe avant qu'il ne considere l'appel perdu. */
  const debut = Date.now();

  /* Corps brut, conserve tel quel : c'est lui qui est signe. */
  let raw;
  try { raw = await req.text(); } catch (e) { return new Response('lecture', { status: 400 }); }
  if (raw.length > 200000) return new Response('trop-gros', { status: 413 });

  const v = await verifierStripe(raw, req.headers.get('Stripe-Signature'), env.STRIPE_WEBHOOK_SECRET);
  if (!v.ok) return new Response('signature refusee (' + v.raison + ')', { status: 400 });

  let ev;
  try { ev = JSON.parse(raw); } catch (e) { return new Response('json', { status: 400 }); }
  if (!ev || typeof ev !== 'object') return new Response('json', { status: 400 });

  /* Sans KV nous ne pouvons rien garantir : on repond en erreur pour que Stripe relance. */
  if (!env.ORDERS) return new Response('kv absent', { status: 500 });

  /* Garde-fou 1 : evenement deja traite. Si Stripe n'a pas fourni d'identifiant,
     on se rabat sur l'empreinte du corps brut, ce qui attrape les rejeux exacts. */
  const empreinte = rempli(ev.id) ? String(ev.id).slice(0, 80) : 'h' + sha256Hex(await sha256(raw)).slice(0, 40);
  const jetonEvenement = await reserver(env, 'ev:' + empreinte);
  if (!jetonEvenement) return new Response('evenement deja traite');

  const s = (ev.data && ev.data.object) || null;
  const type = String(ev.type || '');

  /* Retrouver la commande concernee. Une session de paiement porte la reference
     dans client_reference_id. Un remboursement ou une contestation, eux, parlent
     d'un paiement et non d'une session : on passe alors par le petit annuaire
     « identifiant de paiement -> reference de commande » tenu lors du paiement. */
  let id = s && typeof s.client_reference_id === 'string' ? s.client_reference_id : '';
  if (!id && s && s.metadata && typeof s.metadata.order_id === 'string') id = s.metadata.order_id;
  if (!id && s && s.payment_intent) id = await commandeDuPaiement(env, s.payment_intent);
  if (!id && s && s.id && String(type).startsWith('payment_intent.')) id = await commandeDuPaiement(env, s.id);
  id = typeof id === 'string' ? id : '';

  const paiementConfirme = !!s && ((type === 'checkout.session.completed' && s.payment_status === 'paid') || type === 'checkout.session.async_payment_succeeded');

  /* L'argent est reparti : la commande ne doit plus etre annoncee comme payee. */
  const rembourse = type === 'charge.refunded' || type === 'refund.created' || type === 'payment_intent.refunded';
  const conteste = type === 'charge.dispute.created' || type === 'charge.dispute.funds_withdrawn' || type === 'charge.dispute.updated';

  if (!id || !/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
    /* Aucune reference exploitable. Si de l'argent a pourtant ete encaisse, c'est
       un paiement orphelin : on vous le signale pour que vous le traitiez a la main. */
    if (paiementConfirme) await alerteOrpheline(env, ev, s, debut);
    await clore(env, 'ev:' + empreinte, jetonEvenement, 'sans reference de commande');
    return new Response('ok');
  }

  try {
    if (paiementConfirme) {
      const cd = s.customer_details || {};
      const sh = s.shipping_details || (s.collected_information && s.collected_information.shipping_details) || {};

      const avant = await lireCommande(env, id);
      if (!avant) {
        /* Commande introuvable alors que Stripe annonce un paiement : la reference
           a expire, ou KV a perdu l'ecriture. De l'argent est encaisse et personne
           ne sait quoi envoyer : c'est exactement le cas qui doit vous reveiller. */
        await alerteOrpheline(env, ev, s, debut);
        await clore(env, 'ev:' + empreinte, jetonEvenement, 'commande inconnue');
        return new Response('ok');
      }

      /* ------------------------------------------------------------------
         CONTROLE DU MONTANT REELLEMENT ENCAISSE.
         Jusqu'ici le Worker croyait Stripe sur parole et recopiait amount_total
         sans jamais le comparer au panier. Un article mal tarife, une session
         de paiement bricolee, une devise inattendue, et une commande de cent
         euros pouvait partir a l'impression pour cinq euros encaisses.
         On compare donc, au centime et frais de port compris, le montant recu
         au montant « attendu » enregistre quand le panier a ete valide.
         Les commandes creees avant cette version n'ont pas de champ attendu :
         elles passent le controle, faute de point de comparaison.
      ------------------------------------------------------------------ */
      const attendu = Number(avant.attendu);
      const recu = Number(s.amount_total);
      const deviseRecue = String(s.currency || '').toLowerCase();
      const deviseAttendue = String(avant.currency || 'eur').toLowerCase();
      const comparable = Number.isFinite(attendu) && attendu > 0;
      const montantConforme = !comparable || (Number.isInteger(recu) && recu === attendu);
      const deviseConforme = !deviseRecue || deviseRecue === deviseAttendue;

      if (!montantConforme || !deviseConforme) {
        const anomalie = await majCommande(env, id, {
          status: 'montant-anormal',
          livemode: ev.livemode === true,
          amount: Number.isFinite(recu) ? recu : null,
          currency: deviseRecue || null,
          anomalieAt: Date.now(),
          anomalieNote: 'Montant encaisse ' + (Number.isFinite(recu) ? (recu / 100).toFixed(2) + ' ' + (deviseRecue || '?') : '(illisible)')
            + ' alors que le panier attendait ' + (attendu / 100).toFixed(2) + ' ' + deviseAttendue
            + '. Rien n a ete envoye a l impression. A verifier dans votre tableau de bord Stripe.',
          stripeEmail: cd.email || '',
          shipTo: sh,
          payment_intent: s.payment_intent || null
        });
        await alerteMontant(env, anomalie || avant, recu, deviseRecue, attendu, deviseAttendue, debut);
        await clore(env, 'ev:' + empreinte, jetonEvenement, 'montant anormal');
        return new Response('ok');
      }

      /* Seul endroit du fichier qui ecrit « paid » : signature Stripe valide,
         commande connue, montant et devise conformes au panier. */
      const patch = {
        status: 'paid',
        paidAt: avant.paidAt || Date.now(), /* la date du premier paiement est conservee */
        /* Stripe indique dans chaque evenement s'il s'agit d'un vrai paiement
           (livemode vrai) ou d'un essai avec une carte de test (livemode faux). */
        livemode: ev.livemode === true,
        amount: recu,
        currency: deviseRecue || deviseAttendue,
        shippingCost: s.total_details && s.total_details.amount_shipping,
        stripeEmail: cd.email || '',
        stripePhone: cd.phone || '',
        shipTo: sh,
        payment_intent: s.payment_intent
      };
      const o = await majCommande(env, id, patch);
      if (!o) return new Response('ecriture impossible', { status: 500 });
      await noterPaiement(env, s.payment_intent, id);

      /* Garde-fou 2 : une seule reservation par commande pour l'envoi et le message. */
      const jetonCommande = await reserver(env, 'fx:' + id);
      if (jetonCommande) {
        let courante = await lireCommande(env, id) || o;

        /* Si un appel precedent avait deja obtenu une reponse de Printful,
           on ne renvoie pas la commande : on reprend seulement le message au bot. */
        let f;
        if (courante.fulfil) f = { status: courante.fulfil, note: courante.fulfilNote, code: courante.fulfilCode, pfId: courante.pfId };
        else {
          f = await fulfil(env, courante, debut);
          courante = await majCommande(env, id, { fulfil: f.status, fulfilCode: f.code || null, fulfilNote: f.note, pfId: f.pfId || null, fulfilAt: Date.now(), modeTest: paiementDeTest(env, courante) }) || courante;
        }

        const n = await notify(env, courante, debut);
        await majCommande(env, id, {
          notified: n.ok,
          notifyAt: Date.now(),
          notifyEssais: n.essais || 0,
          /* Visible dans /admin/orders : vous savez si votre bot a bien recu le message. */
          notifyNote: n.configure
            ? (n.ok ? 'Bot prevenu.' : 'Le bot n a pas repondu apres ' + (n.essais || 0) + ' tentatives (' + (n.raison || 'raison inconnue') + ') : nouvelle tentative a la prochaine relance de Stripe.')
            : 'Aucun bot configure.'
        });

        /* On ne clot la reservation que si le bot a bien ete prevenu. Sinon elle
           reste ouverte et la relance suivante de Stripe retentera le message,
           sans renvoyer la commande chez Printful. */
        if (n.ok) await clore(env, 'fx:' + id, jetonCommande, f.status);
      }
    } else if (rembourse || conteste) {
      /* L'argent est parti ou est bloque : le site doit cesser de repondre
         « payee ». La commande prend un etat distinct, et vous etes prevenu,
         car il y a peut-etre une impression deja lancee a arreter. */
      const etat = rembourse ? 'remboursee' : 'contestee';
      const o = await majCommande(env, id, {
        status: etat,
        litigeAt: Date.now(),
        litigeNote: rembourse
          ? 'Paiement rembourse : le site ne presente plus cette commande comme payee.'
          : 'Paiement conteste par le client aupres de sa banque : le site ne presente plus cette commande comme payee.'
      });
      if (o) await alerteLitige(env, o, etat, debut);
    } else if (type === 'checkout.session.expired') {
      await majCommande(env, id, { status: 'expired' });
    } else if (type === 'checkout.session.async_payment_failed') {
      await majCommande(env, id, { status: 'canceled' });
    }
  } catch (e) {
    /* Un imprevu ici ne doit pas empecher Stripe de relancer : on laisse la
       reservation de l'evenement vieillir, elle sera reprise au bout de dix minutes. */
    return new Response('erreur interne', { status: 500 });
  }

  await clore(env, 'ev:' + empreinte, jetonEvenement, type);
  return new Response('ok');
}

/* ---------------------------------------------------------------------------
   /health : ce qui est configure et ce qui manque.
   Aucune valeur secrete n'est renvoyee, seulement des oui et des non.
--------------------------------------------------------------------------- */
function sante(env) {
  const modeStripe = !rempli(env.STRIPE_SECRET) ? 'absente'
    : env.STRIPE_SECRET.startsWith('sk_live_') ? 'reelle'
      : env.STRIPE_SECRET.startsWith('sk_test_') ? 'essai' : 'forme inhabituelle';
  const pays = (env.SHIPPING_COUNTRIES || 'FR').split(',').map(x => x.trim().toUpperCase()).filter(x => /^[A-Z]{2}$/.test(x));
  const fraisPort = rempli(env.SHIPPING_EUR) ? eurc(env.SHIPPING_EUR) : null;

  const configure = {
    stripe_cle: rempli(env.STRIPE_SECRET),
    stripe_cle_mode: modeStripe,
    stripe_webhook_secret: rempli(env.STRIPE_WEBHOOK_SECRET),
    admin_jeton: rempli(env.ADMIN_KEY),
    kv_orders: !!(env.ORDERS && typeof env.ORDERS.get === 'function' && typeof env.ORDERS.put === 'function'),
    site_url: rempli(env.SITE_URL),
    origine_autorisee: rempli(env.ALLOWED_ORIGIN),
    printful_cle: rempli(env.PRINTFUL_TOKEN),
    printful_boutique: rempli(env.PRINTFUL_STORE_ID),
    printful_brouillon: modeBrouillon(env),
    bot_json: rempli(env.NOTIFY_WEBHOOK),
    bot_telegram: rempli(env.TELEGRAM_BOT_TOKEN) && rempli(env.TELEGRAM_CHAT_ID)
  };

  /* Mode d'envoi en cours, a afficher au proprietaire :
       inactif      : aucune cle Printful, vous expediez vous-meme ;
       brouillon    : la commande arrive chez Printful et attend votre validation ;
       automatique  : la commande part a l'impression sans intervention.
     Dans tous les cas, un paiement de test ne declenche jamais d'envoi reel. */
  const envoi = !configure.printful_cle ? 'inactif' : (configure.printful_brouillon ? 'brouillon' : 'automatique');
  const envoiTexte = {
    inactif: 'Envoi automatique inactif : vous expediez les commandes vous-meme.',
    brouillon: 'Mode brouillon : chaque commande arrive chez Printful et attend votre validation dans votre tableau de bord avant impression.',
    automatique: 'Envoi automatique : chaque commande payee part directement a l impression et a l expedition.'
  }[envoi];

  /* Indispensable pour encaisser : Stripe, le secret du webhook, KV et l'adresse du site. */
  const manquant = [];
  if (!configure.stripe_cle) manquant.push('STRIPE_SECRET : la cle secrete Stripe.');
  if (!configure.stripe_webhook_secret) manquant.push('STRIPE_WEBHOOK_SECRET : sans lui, aucune commande ne peut devenir payee.');
  if (!configure.kv_orders) manquant.push('Liaison KV ORDERS : la memoire des commandes.');
  if (!configure.site_url) manquant.push('SITE_URL : sans elle, le catalogue et les prix ne peuvent pas etre lus.');
  if (!configure.admin_jeton) manquant.push('ADMIN_KEY : la liste des commandes reste inaccessible.');

  const conseils = [];
  if (!configure.printful_cle) conseils.push('PRINTFUL_TOKEN absent : les commandes payees seront a expedier par vous.');
  if (configure.printful_cle && !configure.printful_brouillon) conseils.push('PRINTFUL_DRAFT non active : les commandes reelles partent directement a l impression. Mettez PRINTFUL_DRAFT a 1 pour les valider vous-meme au debut.');
  if (modeStripe === 'essai') conseils.push('Cle Stripe de test : vos commandes d essai ne partiront pas chez Printful et ne vous seront pas facturees.');
  if (!configure.bot_json && !configure.bot_telegram) conseils.push('Aucun bot configure : vous ne recevrez pas de message a chaque commande. La liste reste visible dans /admin/orders.');
  if (!configure.origine_autorisee && !configure.site_url) conseils.push('ALLOWED_ORIGIN et SITE_URL sont tous deux vides : aucune origine n est autorisee, et le navigateur de vos visiteurs refusera les appels au Worker. Remplissez au moins SITE_URL.');
  else if (!configure.origine_autorisee) conseils.push('ALLOWED_ORIGIN absent : l origine deduite de SITE_URL est utilisee. Remplissez ALLOWED_ORIGIN si votre boutique est sur une autre adresse.');
  if (fraisPort === null) conseils.push('SHIPPING_EUR vide : la livraison n est pas facturee au client.');

  const pret = configure.stripe_cle && configure.stripe_webhook_secret && configure.kv_orders && configure.site_url;
  return {
    ok: true,
    pret,
    resume: pret ? 'La boutique peut encaisser des paiements.' : 'La boutique ne peut pas encore encaisser de paiement.',
    configure,
    envoi_printful: envoi,
    envoi_printful_texte: envoiTexte,
    paiements_de_test_envoyes_a_printful: false,
    origine_renvoyee: origineDuSite(env) || null,
    montant_verifie_avant_confirmation: true,
    commande_minimale_eur: L.totalMinCents / 100,
    quantite_maximale_par_commande: L.quantiteTotaleMax,
    conservation_commandes_payees_jours: Math.round(TTL_COMMANDE_PAYEE / 86400),
    livraison: { facturee: fraisPort !== null, montant_eur: fraisPort === null ? null : fraisPort / 100, pays_livres: pays },
    manquant,
    conseils,
    catalogue: { derniere_lecture_reussie: CAT.t ? new Date(CAT.t).toISOString() : null, articles: CAT.items ? CAT.items.length : 0 }
  };
}

/* ---------------------------------------------------------------------------
   /admin/… : reserve au proprietaire, jeton ADMIN_KEY obligatoire
--------------------------------------------------------------------------- */
/* Vue allegee d'une commande : de quoi suivre la boutique sans etaler le nom,
   l'adresse et le detail des articles de chaque client a chaque consultation.
   Le detail complet reste accessible, mais seulement si vous le demandez
   explicitement avec full=1, idealement pour une seule commande a la fois. */
function commandeAllegee(o) {
  return {
    id: o.id,
    status: o.status,
    created: o.created || null,
    paidAt: o.paidAt || null,
    amount: o.amount === undefined ? null : o.amount,
    currency: o.currency || null,
    attendu: o.attendu === undefined ? null : o.attendu,
    articles: (o.lines || []).length,
    quantite: (o.lines || []).reduce((n, l) => n + Number(l.q || 0), 0),
    voucher_annonce: o.voucher || null,   /* annonce par le client, non verifie */
    livemode: o.livemode === undefined ? null : o.livemode,
    modeTest: o.modeTest === undefined ? null : o.modeTest,
    fulfil: o.fulfil || null,
    fulfilCode: o.fulfilCode || null,
    fulfilNote: o.fulfilNote || null,
    pfId: o.pfId || null,
    notified: o.notified === undefined ? null : o.notified,
    notifyNote: o.notifyNote || null,
    shipped: !!o.shipped,
    shippedAt: o.shippedAt || null,
    noteEtat: o.noteEtat || null,
    anomalieNote: o.anomalieNote || null,
    litigeNote: o.litigeNote || null,
    detail_disponible: 'ajoutez full=1 pour le nom, l adresse et le detail des articles'
  };
}

async function admin(req, env, path) {
  const auth = req.headers.get('Authorization') || '';
  if (!rempli(env.ADMIN_KEY)) return j({ ok: false, err: 'config', msg: 'ADMIN_KEY n est pas configuree.' }, 401, env);
  if (!(await egalSecurise(auth, 'Bearer ' + env.ADMIN_KEY))) return j({ ok: false, err: 'jeton' }, 401, env);
  if (!env.ORDERS) return j({ ok: false, err: 'kv' }, 503, env);

  if (path === '/admin/orders' && (req.method === 'GET' || req.method === 'POST')) {
    const u = new URL(req.url);
    /* Vue complete seulement sur demande explicite : /admin/orders?full=1
       Vous pouvez aussi n'en demander qu'une : /admin/orders?full=1&id=LaReference */
    const complet = ['1', 'true', 'oui'].includes(String(u.searchParams.get('full') || '').toLowerCase());
    const seule = texteSimple(u.searchParams.get('id'), 64);

    const l = await env.ORDERS.list({ prefix: 'o:', limit: 200 });
    const out = [];
    for (const k of l.keys) {
      if (seule && k.name !== 'o:' + seule) continue;
      try { const r = await env.ORDERS.get(k.name); if (r) out.push(JSON.parse(r)); } catch (e) {}
    }
    out.sort((a, b) => (b.created || 0) - (a.created || 0));
    return j({
      ok: true,
      vue: complet ? 'complete' : 'allegee',
      note: complet
        ? 'Vue complete : elle contient le nom, l adresse et le detail des articles. A n utiliser que lorsque vous en avez besoin.'
        : 'Vue allegee : ni nom, ni adresse, ni detail des articles. Ajoutez full=1 pour le detail complet, et id=LaReference pour une seule commande.',
      orders: complet ? out : out.map(commandeAllegee)
    }, 200, env);
  }
  if (path === '/admin/ship' && req.method === 'POST') {
    const corps = await corpsJson(req);
    const b = (corps && corps.data) || {};
    const o = await majCommande(env, texteSimple(b.id, 64), { shipped: !!b.shipped, shippedAt: b.shipped ? Date.now() : null });
    return j({ ok: !!o }, 200, env);
  }
  return j({ ok: false, err: 'route' }, 404, env);
}

/* ---------------------------------------------------------------------------
   AIGUILLAGE DES ROUTES
--------------------------------------------------------------------------- */
export default {
  async fetch(req, env) {
    const u = new URL(req.url), path = u.pathname;
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env) });
    try {
      if (path === '/checkout' && req.method === 'POST') return await checkout(req, env);
      if (path === '/stripe-webhook' && req.method === 'POST') return await webhook(req, env);
      if (path === '/order' && req.method === 'GET') {
        /* Format de reponse fige : le site attend exactement { "status": "..." }. */
        const id = u.searchParams.get('id') || '';
        if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) return j({ status: 'unknown' }, 200, env);
        if (!env.ORDERS) return j({ status: 'unknown' }, 200, env);
        const o = await lireCommande(env, id);
        if (!o || typeof o.status !== 'string') return j({ status: 'unknown' }, 200, env);
        return j({ status: o.status }, 200, env);
      }
      if (path === '/health' && (req.method === 'GET' || req.method === 'POST')) return j(sante(env), 200, env);
      if (path.startsWith('/admin/')) return await admin(req, env, path);
      return j({ ok: true, service: 'boutique' }, 200, env);
    } catch (e) {
      return j({ ok: false, err: 'erreur' }, 500, env);
    }
  }
};
