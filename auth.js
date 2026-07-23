const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabaseClient = supabaseClient;
window.currentProfile = null;

async function renderAuthWidget() {
  const el = document.getElementById('auth-widget');
  if (!el) return;

  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    el.innerHTML = '<button class="auth-btn" id="login-btn">se connecter avec discord</button>';
    document.getElementById('login-btn').onclick = () => {
      supabaseClient.auth.signInWithOAuth({
        provider: 'discord',
        options: { redirectTo: window.location.href }
      });
    };
    window.currentProfile = null;
    return;
  }

  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('nom, rang')
    .eq('id', session.user.id)
    .single();

  window.currentProfile = profile || null;
  const rangLabel = (profile && RANG_LABELS[profile.rang]) || 'rang inconnu';
  const nom = (profile && profile.nom) || session.user.email;

  el.innerHTML = `
    <span class="auth-status">${nom} · ${rangLabel}</span>
    <button class="auth-btn" id="logout-btn">se déconnecter</button>
  `;
  document.getElementById('logout-btn').onclick = async () => {
    await supabaseClient.auth.signOut();
    window.location.reload();
  };

  document.dispatchEvent(new CustomEvent('profile-ready', { detail: profile }));
}

renderAuthWidget();
