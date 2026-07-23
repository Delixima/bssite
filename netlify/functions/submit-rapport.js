const { createClient } = require('@supabase/supabase-js');

const ACCREDITATION = {
  scientifique_test: 0,
  scientifique_confirme: 1,
  scientifique_sous_chef: 2,
  scientifique_chef: 3,
  co_gerant: 4,
  gerant: 4,
  dirigeant: 4
};

const CLASSE_NIVEAU = { Verte: 0, Orange: 1, Rose: 2, Noire: 3 };

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Méthode non autorisée' }) };
  }

  const authHeader = event.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Non connecté' }) };
  }

  const supabaseAnon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { data: userData, error: userError } = await supabaseAnon.auth.getUser(token);
  if (userError || !userData?.user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Session invalide' }) };
  }
  const user = userData.user;

  const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('nom, rang')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Profil introuvable' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Corps de requête invalide' }) };
  }

  const { titre, classe, contenu } = payload;
  if (!titre || !classe || !(classe in CLASSE_NIVEAU)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Champs manquants ou classe invalide' }) };
  }

  const depasseAccreditation = CLASSE_NIVEAU[classe] > ACCREDITATION[profile.rang];

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('rapports')
    .insert({
      auteur_id: user.id,
      auteur_nom: profile.nom,
      titre,
      classe,
      contenu,
      statut: 'en_attente',
      depasse_accreditation: depasseAccreditation
    })
    .select()
    .single();

  if (insertError) {
    return { statusCode: 500, body: JSON.stringify({ error: insertError.message }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, item: inserted, depasse_accreditation: depasseAccreditation })
  };
};
