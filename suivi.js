const LEADERSHIP = ['co_gerant', 'gerant', 'dirigeant'];
const STATUT_AVERT_LABELS = { en_attente: 'en attente', valide: 'validé', annule: 'annulé' };
const STATUT_AVERT_CLASS = { en_attente: 'tag-en_attente', valide: 'tag-valide', annule: 'tag-refuse' };

document.addEventListener('DOMContentLoaded', () => {
  const content = document.getElementById('suivi-content');
  const avertBlock = document.getElementById('avertissements-block');
  const avertList = document.getElementById('avertissements-list');

  async function load() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
      content.innerHTML = '<p>Connecte-toi avec Discord pour accéder à cette page.</p>';
      return;
    }

    const profile = window.currentProfile;
    if (!profile || !LEADERSHIP.includes(profile.rang)) {
      content.innerHTML = '<p>Accès réservé aux Co-gérant, Gérant et Dirigeant.</p>';
      return;
    }

    const [{ data: profiles }, { data: rapports }, { data: demandes }] = await Promise.all([
      supabaseClient.from('profiles').select('id, nom, rang').not('rang', 'in', `(${LEADERSHIP.join(',')})`),
      supabaseClient.from('rapports').select('auteur_id, created_at, statut').order('created_at', { ascending: true }),
      supabaseClient.from('demandes').select('auteur_id, created_at, statut').order('created_at', { ascending: true })
    ]);

    const lastRapport = {};
    (rapports || []).forEach((r) => { lastRapport[r.auteur_id] = r; });

    const lastDemande = {};
    (demandes || []).forEach((d) => { lastDemande[d.auteur_id] = d; });

    if (!profiles || profiles.length === 0) {
      content.innerHTML = '<p>Aucun membre à afficher pour le moment.</p>';
    } else {
      const rows = profiles.map((p) => {
        const d = lastDemande[p.id];
        const r = lastRapport[p.id];
        return `<tr>
          <td>${escapeHtml(p.nom || 'Sans nom')}</td>
          <td>${RANG_LABELS[p.rang] || p.rang}</td>
          <td>${d ? formatDate(d.created_at) + ' · ' + STATUT_LABELS[d.statut] : '—'}</td>
          <td>${r ? formatDate(r.created_at) + ' · ' + STATUT_LABELS[r.statut] : '—'}</td>
        </tr>`;
      }).join('');

      content.innerHTML = `
        <table>
          <tr><th>Nom</th><th>Rang</th><th>Dernière demande</th><th>Dernier rapport</th></tr>
          ${rows}
        </table>`;
    }

    avertBlock.style.display = 'block';
    loadAvertissements();
  }

  async function loadAvertissements() {
    const { data: items, error } = await supabaseClient
      .from('avertissements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      avertList.innerHTML = '<p>Impossible de charger les avertissements pour le moment.</p>';
      return;
    }
    if (!items || items.length === 0) {
      avertList.innerHTML = '<p>Aucun avertissement pour le moment.</p>';
      return;
    }

    avertList.innerHTML = items.map(renderAvertissement).join('');
    attachAvertHandlers();
  }

  function renderAvertissement(item) {
    const canAct = item.statut === 'en_attente';
    return `
      <div class="item-card">
        <div class="item-head">
          <strong>${escapeHtml(item.membre_nom || 'Membre')} · avertissement n°${item.niveau}</strong>
          <span class="tag ${STATUT_AVERT_CLASS[item.statut]}">${STATUT_AVERT_LABELS[item.statut]}</span>
        </div>
        <div class="item-meta">semaine du ${formatDate(item.semaine)}</div>
        <p><strong>Sanction recommandée :</strong> ${escapeHtml(item.sanction_recommandee)}</p>
        ${canAct ? `
          <div class="item-actions">
            <button class="mini-btn valide" data-id="${item.id}" data-action="valide">valider</button>
            <button class="mini-btn refuse" data-id="${item.id}" data-action="annule">annuler</button>
          </div>` : ''}
      </div>`;
  }

  function attachAvertHandlers() {
    avertList.querySelectorAll('.mini-btn').forEach((b) => {
      b.onclick = async () => {
        const { data: { session } } = await supabaseClient.auth.getSession();
        b.disabled = true;
        await fetch('/.netlify/functions/resolve-warning', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + session.access_token
          },
          body: JSON.stringify({ id: b.dataset.id, action: b.dataset.action })
        });
        loadAvertissements();
      };
    });
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  document.addEventListener('profile-ready', load);
  setTimeout(load, 500);
});
