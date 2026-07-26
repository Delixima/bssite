const { createClient } = require('@supabase/supabase-js');

const LEADERSHIP = ['co_gerant', 'gerant', 'dirigeant'];

const SANCTIONS = {
  1: 'Avertissement',
  2: 'Rétrogradation d\'un rang',
  3: 'Licenciement de la Brigade'
};

// Génère un avertissement visuel pour chaque membre (hors direction) n'ayant
// soumis ni rapport ni demande d'expérience durant les 7 derniers jours.
// Ne modifie jamais un rang ni ne retire personne : uniquement indicatif,
// à valider ou annuler manuellement par un Co-gérant, Gérant ou Dirigeant.
exports.handler = async () => {
  const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: membres, error: membresError } = await supabaseAdmin
    .from('profiles')
    .select('id, nom, rang')
    .not('rang', 'in', `(${LEADERSHIP.join(',')})`);

  if (membresError) {
    return { statusCode: 500, body: JSON.stringify({ error: membresError.message }) };
  }

  const results = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const membre of membres || []) {
    // ignore les membres en absence validée couvrant aujourd'hui (date_fin
    // null = durée indéterminée, donc toujours couverte une fois commencée)
    const { data: absencesActives } = await supabaseAdmin
      .from('absences')
      .select('id')
      .eq('membre_id', membre.id)
      .eq('statut', 'validee')
      .lte('date_debut', today)
      .or(`date_fin.is.null,date_fin.gte.${today}`);
    if (absencesActives && absencesActives.length > 0) continue;

    const [{ count: rapportsCount }, { count: demandesCount }] = await Promise.all([
      supabaseAdmin.from('rapports').select('id', { count: 'exact', head: true })
        .eq('auteur_id', membre.id).gte('created_at', sevenDaysAgo),
      supabaseAdmin.from('demandes').select('id', { count: 'exact', head: true })
        .eq('auteur_id', membre.id).gte('created_at', sevenDaysAgo)
    ]);

    const actif = (rapportsCount || 0) > 0 || (demandesCount || 0) > 0;
    if (actif) continue;

    // Évite de générer deux avertissements pour la même semaine si la fonction
    // est relancée manuellement par erreur.
    const { data: recent } = await supabaseAdmin
      .from('avertissements')
      .select('id')
      .eq('membre_id', membre.id)
      .gte('created_at', sevenDaysAgo)
      .limit(1);
    if (recent && recent.length > 0) continue;

    const { count: existants } = await supabaseAdmin
      .from('avertissements')
      .select('id', { count: 'exact', head: true })
      .eq('membre_id', membre.id)
      .neq('statut', 'annule');

    const niveau = (existants || 0) + 1;
    const sanction = SANCTIONS[niveau] || SANCTIONS[3];

    const { error: insertError } = await supabaseAdmin
      .from('avertissements')
      .insert({
        membre_id: membre.id,
        membre_nom: membre.nom,
        niveau,
        sanction_recommandee: sanction,
        statut: 'en_attente'
      });

    results.push({ membre: membre.nom, niveau, sanction, error: insertError?.message || null });
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true, traites: results.length, details: results }) };
};
