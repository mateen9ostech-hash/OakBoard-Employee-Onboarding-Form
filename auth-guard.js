// ══════════════════════════════════════════
// auth-guard.js — shared session management
// Include this file AFTER the Supabase SDK.
// ══════════════════════════════════════════

(function () {
  const SUPABASE_URL_VALUE = 'https://avdwwlwxmnuqphxlpgrn.supabase.co';
  const SUPABASE_KEY_VALUE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZHd3bHd4bW51cXBoeGxwZ3JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMzgxMjksImV4cCI6MjA5MDYxNDEyOX0.3Ka_rAeRYciF3CNagRFYl78LUpJPJLkC7qtQFiK1iqE';

  const SESSION_CACHE_KEY = 'obf_session_cache';
  const SUPABASE_AUTH_STORAGE_KEY = 'sb-avdwwlwxmnuqphxlpgrn-auth-token';
  const SESSION_CHECK_TIMEOUT_MS = 10000;
  const SESSION_CACHE_MAX_AGE_MS = 2 * 60 * 1000;

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

  function isLocalPreview() {
    return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  }

  function getCachedSession() {
    try {
      const raw = localStorage.getItem(SESSION_CACHE_KEY);
      if (!raw) return null;

      const cached = JSON.parse(raw);
      if (!cached || !cached.email || !cached.timestamp) return null;
      if (Date.now() - Number(cached.timestamp) > SESSION_CACHE_MAX_AGE_MS) return null;

      return {
        user: { email: cached.email },
        cached: true
      };
    } catch (err) {
      console.error('Unable to read cached session:', err);
      return null;
    }
  }

  function getPersistedSession() {
    try {
      const raw = localStorage.getItem(SUPABASE_AUTH_STORAGE_KEY);
      if (!raw) return null;

      const stored = JSON.parse(raw);
      const session = stored.currentSession || stored.session || stored;
      if (!session || !session.access_token || !session.user || !session.user.email) return null;

      const expiresAt = Number(session.expires_at || session.expiresAt || 0);
      if (expiresAt && expiresAt <= Math.floor(Date.now() / 1000) + 30) return null;

      return session;
    } catch (err) {
      console.error('Unable to read persisted session:', err);
      return null;
    }
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
      const persistedSession = getPersistedSession();
      if (persistedSession) {
        cacheSession(persistedSession);
        setUserEmail(persistedSession.user.email);
        return persistedSession;
      }

      // Live Server / localhost can occasionally hang on Supabase's browser
      // session lock. If the user just passed auth in the same local preview,
      // allow the page to continue so GenerateForm can render saved plan data.
      const cachedSession = getCachedSession();
      if (isLocalPreview() && cachedSession && !isLoginPage()) {
        setUserEmail(cachedSession.user.email);
        return cachedSession;
      }

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
      const cachedSession = getCachedSession();
      if (isLocalPreview() && cachedSession && !isLoginPage()) {
        setUserEmail(cachedSession.user.email);
        return cachedSession;
      }
      clearSessionCache();
      window.location.replace('Login.html');
      return null;
    } finally {
      hideAuthLoader();
    }
  };

  window.redirectIfLoggedIn = async function redirectIfLoggedIn() {
    try {
      const persistedSession = getPersistedSession();
      if (persistedSession) {
        cacheSession(persistedSession);
        window.location.replace('FillDetails.html');
        return;
      }

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

  window.invokeAuthenticatedFunction = async function invokeAuthenticatedFunction(name, body) {
    const session = getPersistedSession();
    if (!session) throw new Error('Your session has expired. Please sign in again.');

    const response = await fetch(
      `${SUPABASE_URL_VALUE}/functions/v1/${encodeURIComponent(name)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: SUPABASE_KEY_VALUE,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      throw new Error(data.error || `Function request failed (${response.status}).`);
    }

    return data;
  };

  window.doSignOut = async function doSignOut() {
    try {
      const activeClient = window.sbClient || client;
      if (activeClient) await activeClient.auth.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      localStorage.removeItem('obf_plan_data');
      localStorage.removeItem(SUPABASE_AUTH_STORAGE_KEY);
      clearSessionCache();
      window.location.replace('Login.html');
    }
  };
})();
