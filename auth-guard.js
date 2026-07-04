// ══════════════════════════════════════════
// auth-guard.js — shared session management
// Include this file AFTER the Supabase SDK.
// ══════════════════════════════════════════

(function () {
  const SUPABASE_URL_VALUE = 'https://avdwwlwxmnuqphxlpgrn.supabase.co';
  const SUPABASE_KEY_VALUE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZHd3bHd4bW51cXBoeGxwZ3JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMzgxMjksImV4cCI6MjA5MDYxNDEyOX0.3Ka_rAeRYciF3CNagRFYl78LUpJPJLkC7qtQFiK1iqE';

  const SESSION_CACHE_KEY = 'obf_session_cache';
  const SESSION_CHECK_TIMEOUT_MS = 10000;

  function initClient() {
    try {
      if (!window.supabase) {
        throw new Error('Supabase SDK not loaded. Add the Supabase script before auth-guard.js.');
      }

      if (!window.sbClient) {
        window.sbClient = window.supabase.createClient(SUPABASE_URL_VALUE, SUPABASE_KEY_VALUE);
      }

      return window.sbClient;
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      return null;
    }
  }

  const client = initClient();

  async function getSessionWithTimeout(activeClient) {
    let timeoutId;

    try {
      return await Promise.race([
        activeClient.auth.getSession(),
        new Promise((_, reject) => {
          timeoutId = window.setTimeout(
            () => reject(new Error('Session verification timed out.')),
            SESSION_CHECK_TIMEOUT_MS
          );
        })
      ]);
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
    }
  }

  function hideAuthLoader() {
    const loader = document.getElementById('auth-loader');
    if (loader) loader.classList.add('hidden');
  }

  function isLoginPage() {
    return window.location.pathname.toLowerCase().includes('login.html');
  }

  function clearSessionCache() {
    localStorage.removeItem(SESSION_CACHE_KEY);
  }

  function cacheSession(session) {
    try {
      if (!session || !session.user || !session.user.email) return;

      localStorage.setItem(
        SESSION_CACHE_KEY,
        JSON.stringify({
          timestamp: Date.now(),
          email: session.user.email
        })
      );
    } catch (err) {
      console.error('Error caching session:', err);
    }
  }

  function setUserEmail(email) {
    const emailEl = document.getElementById('user-email');
    if (emailEl && email) emailEl.textContent = email;
  }

  window.requireAuth = async function requireAuth() {
    try {
      const activeClient = window.sbClient || client;
      if (!activeClient) {
        throw new Error('Supabase client is not available.');
      }

      const result = await getSessionWithTimeout(activeClient);
      if (result.error) throw result.error;

      const session = result.data && result.data.session;
      if (!session) {
        clearSessionCache();
        window.location.replace('Login.html');
        return null;
      }

      cacheSession(session);
      setUserEmail(session.user.email);
      return session;
    } catch (err) {
      console.error('Auth check failed:', err);
      clearSessionCache();
      window.location.replace('Login.html');
      return null;
    } finally {
      hideAuthLoader();
    }
  };

  window.redirectIfLoggedIn = async function redirectIfLoggedIn() {
    try {
      const activeClient = window.sbClient || client;
      if (!activeClient) return;

      const result = await getSessionWithTimeout(activeClient);
      const session = result.data && result.data.session;

      if (session) {
        cacheSession(session);
        window.location.replace('FillDetails.html');
      }
    } catch (err) {
      console.error('Session check error:', err);
    }
  };

  window.doSignOut = async function doSignOut() {
    try {
      const activeClient = window.sbClient || client;
      if (activeClient) await activeClient.auth.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      localStorage.removeItem('obf_plan_data');
      clearSessionCache();
      window.location.replace('Login.html');
    }
  };

  if (client && client.auth) {
    client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        cacheSession(session);
        if (isLoginPage()) window.location.replace('FillDetails.html');
      }

      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('obf_plan_data');
        clearSessionCache();
        if (!isLoginPage()) window.location.replace('Login.html');
      }
    });
  }
})();
