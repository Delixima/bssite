const STATUT_ABSENCE_LABELS = { en_attente: 'en attente', validee: 'validée', refusee: 'refusée' };
const STATUT_ABSENCE_CLASS = { en_attente: 'tag-en_attente', validee: 'tag-valide', refusee: 'tag-refuse' };

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('absence-form');
  const btn = document.getElementById('submit-btn');
  const statusMsg = document.getElementById('status-msg');
  const listEl = document.getElementById('items-list');
  const dateFin = document.getElementById('date_fin');
  const indetermine = document.getElementById('indetermine');

  indetermine.addEventListener('change', () => {
    dateFin.disabled = indetermine.checked;
    if (indetermine.checked) dateFin.value = '';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
      alert('Connecte-toi avec Discord avant de déposer une absence.');
      return;
    }

    const payload = {
      date_debut: form.date_debut.value,
      date_fin: indetermine.checked ? null : (form.date_fin.value || null),
      motif: form.motif.value
    };

    btn.disabled = true;
    let result;
    try {
      const res = await fetch('/.netlify/functions/submit-absence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + session.access_token
        },
        body: JSON.stringify(payload)
      });
      result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erreur inconnue');
    } catch (err) {
      statusMsg.textContent = 'Erreur : ' + err.message;
      statusMsg.style.display = 'block';
      btn.disabled = false;
      return;
    }

    btn.disabled = false;
    statusMsg.textContent = 'Demande d\'absence enregistrée. Statut : en attente de validation par un Co-gérant, Gérant ou Dirigeant.';
    statusMsg.style.display = 'block';
    form.reset();
    dateFin.disabled = false;
    loadItems();
  });

  function renderItem(item) {
    const canValidate = window.currentProfile
      && ['co_gerant', 'gerant', 'dirigeant'].includes(window.currentProfile.rang)
      && item.statut === 'en_attente';

    const periode = item.date_fin
      ? `du ${item.date_debut} au ${item.date_fin}`
      : `à partir du ${item.date_debut} · durée indéterminée`;

    return `
      <div class="item-card">
        <div class="item-head">
          <strong>${escapeHtml(item.membre_nom || '')}</strong>
          <span class="tag ${STATUT_ABSENCE_CLASS[item.statut]}">${STATUT_ABSENCE_LABELS[item.statut]}</span>
        </div>
        <div class="item-meta">${periode}</div>
        ${item.motif ? `<p>${escapeHtml(item.motif)}</p>` : ''}
        ${canValidate ? `
          <div class="item-actions">
            <button class="mini-btn valide" data-id="${item.id}" data-action="validee">valider</button>
            <button class="mini-btn refuse" data-id="${item.id}" data-action="refusee">refuser</button>
          </div>` : ''}
      </div>`;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  async function loadItems() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
      listEl.innerHTML = '<p>Connecte-toi pour voir les absences.</p>';
      return;
    }
    const { data: items, error } = await supabaseClient
      .from('absences')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      listEl.innerHTML = '<p>Impossible de charger les absences pour le moment.</p>';
      return;
    }
    listEl.innerHTML = (items && items.length) ? items.map(renderItem).join('') : '<p>Aucune absence pour le moment.</p>';
    attachValidationHandlers();
  }

  function attachValidationHandlers() {
    listEl.querySelectorAll('.mini-btn').forEach((b) => {
      b.onclick = async () => {
        const { data: { session } } = await supabaseClient.auth.getSession();
        b.disabled = true;
        await fetch('/.netlify/functions/resolve-absence', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + session.access_token
          },
          body: JSON.stringify({ id: b.dataset.id, action: b.dataset.action })
        });
        loadItems();
      };
    });
  }

  document.addEventListener('profile-ready', loadItems);
  setTimeout(loadItems, 400);
});
