const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Méthode non autorisée' }) };
  }

  const authHeader = event.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Non connecté' }) };
  }

  const type = (event.queryStringParameters || {}).type;
  if (!['rapport', 'demande'].includes(type)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Paramètre type invalide' }) };
  }
  const table = type === 'rapport' ? 'rapports' : 'demandes';

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

  let query = supabaseAdmin.from(table).select('*').order('created_at', { ascending: false });
  if (!isValidator) {
    query = query.eq('auteur_id', user.id);
  }

  const { data: items, error } = await query;
  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }

  return { statusCode: 200, body: JSON.stringify(items) };
};
