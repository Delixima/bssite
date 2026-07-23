const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Méthode non autorisée' }) };
  }

  const authHeader = event.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Non connecté' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Corps de requête invalide' }) };
  }

  const { id, action } = payload;
  if (!id || !['valide', 'annule'].includes(action)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Paramètres invalides' }) };
  }

  const supabaseAnon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { data: userData, error: userError } = await supabaseAnon.auth.getUser(token);
  if (userError || !userData?.user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Session invalide' }) };
  }
  const user = userData.user;

  const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('rang')
    .eq('id', user.id)
    .single();

  const isValidator = profile && ['co_gerant', 'gerant', 'dirigeant'].includes(profile.rang);
  if (!isValidator) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Droits insuffisants' }) };
  }

  const { data: updated, error } = await supabaseAdmin
    .from('avertissements')
    .update({ statut: action })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true, item: updated }) };
};
