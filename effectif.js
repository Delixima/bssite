document.addEventListener('DOMContentLoaded', async () => {
  const table = document.getElementById('effectif-table');

  setTimeout(async () => {
    const { data: profiles, error } = await supabaseClient
      .from('profiles')
      .select('nom, rang')
      .order('rang', { ascending: false });

    if (error || !profiles) {
      table.innerHTML = '<tr><th>Nom</th><th>Rang</th></tr><tr><td colspan="2">Registre indisponible pour le moment.</td></tr>';
      return;
    }

    if (profiles.length === 0) {
      table.innerHTML = '<tr><th>Nom</th><th>Rang</th></tr><tr><td colspan="2">Aucun membre inscrit pour le moment.</td></tr>';
      return;
    }

    const rows = profiles.map((p) => `<tr><td>${escapeHtml(p.nom || 'Sans nom')}</td><td>${RANG_LABELS[p.rang] || p.rang}</td></tr>`).join('');
    table.innerHTML = '<tr><th>Nom</th><th>Rang</th></tr>' + rows;
  }, 400);

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
});
