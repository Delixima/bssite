document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('rapport-form');
  const btn = document.getElementById('submit-btn');
  const statusMsg = document.getElementById('status-msg');
  const listEl = document.getElementById('items-list');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
      alert('Connecte-toi avec Discord avant de soumettre un rapport.');
      return;
    }

    const payload = {
      titre: form.titre.value,
      classe: form.classe.value,
      contenu: form.contenu.value
    };

    btn.disabled = true;
    let result;
    try {
      const res = await fetch('/.netlify/functions/submit-rapport', {
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
    statusMsg.textContent = result.depasse_accreditation
      ? 'Rapport enregistré. Classe au-dessus de ton accréditation : transmis directement à un Gérant ou Dirigeant.'
      : 'Rapport enregistré. Statut : en attente de validation.';
    statusMsg.style.display = 'block';
    form.reset();
    loadItems();
  });

  function renderItem(item) {
    const canValidate = window.currentProfile
      && ['co_gerant', 'gerant', 'dirigeant'].includes(window.currentProfile.rang)
      && item.statut === 'en_attente';

    return `
      <div class="item-card">
        <div class="item-head">
          <strong>${escapeHtml(item.titre)}</strong>
          <span class="tag tag-${item.statut}">${STATUT_LABELS[item.statut]}</span>
        </div>
        <div class="item-meta">${escapeHtml(item.auteur_nom || '')} · classe ${item.classe}${item.depasse_accreditation ? ' · hors accréditation' : ''}</div>
        <p>${escapeHtml(item.contenu || '')}</p>
        ${canValidate ? `
          <div class="item-actions">
            <button class="mini-btn valide" data-id="${item.id}" data-action="valide">valider</button>
            <button class="mini-btn refuse" data-id="${item.id}" data-action="refuse">refuser</button>
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
      listEl.innerHTML = '<p>Connecte-toi pour voir tes rapports.</p>';
      return;
    }
    const res = await fetch('/.netlify/functions/list-items?type=rapport', {
      headers: { 'Authorization': 'Bearer ' + session.access_token }
    });
    const items = await res.json();
    if (!Array.isArray(items)) {
      listEl.innerHTML = '<p>Impossible de charger les rapports pour le moment.</p>';
      return;
    }
    listEl.innerHTML = items.map(renderItem).join('') || '<p>Aucun rapport pour le moment.</p>';
    attachValidationHandlers();
  }

  function attachValidationHandlers() {
    listEl.querySelectorAll('.mini-btn').forEach((b) => {
      b.onclick = async () => {
        const { data: { session } } = await supabaseClient.auth.getSession();
        b.disabled = true;
        await fetch('/.netlify/functions/validate-item', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + session.access_token
          },
          body: JSON.stringify({ type: 'rapport', id: b.dataset.id, action: b.dataset.action })
        });
        loadItems();
      };
    });
  }

  document.addEventListener('profile-ready', loadItems);
  setTimeout(loadItems, 400);
});
