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

  const supabaseAnon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { data: userData, error: userError } = await supabaseAnon.auth.getUser(token);
  if (userError || !userData?.user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Session invalide' }) };
  }
  const user = userData.user;

  const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('nom')
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

  const { date_debut, date_fin, motif } = payload;
  if (!date_debut) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Date de début manquante' }) };
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('absences')
    .insert({
      membre_id: user.id,
      membre_nom: profile.nom,
      date_debut,
      date_fin: date_fin || null,
      motif,
      statut: 'en_attente'
    })
    .select()
    .single();

  if (insertError) {
    return { statusCode: 500, body: JSON.stringify({ error: insertError.message }) };
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true, item: inserted }) };
};
