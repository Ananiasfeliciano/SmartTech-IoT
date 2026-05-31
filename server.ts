dotenv.config();
import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { google } from 'googleapis';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3001;

// ── Item 6 — CORS seguro (OWASP API Security Top 10: API7) ───────────────────
const ALLOWED_ORIGINS: string[] = (
  process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173'
).split(',').map(o => o.trim());

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin ?? '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 h preflight cache
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// ── Item 15 — Limitar tamanho do body (protege contra DoS payload) ────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(cookieParser());

// ── Item 15 — Security headers do servidor (Node/Express) ────────────────────
app.use((_req: Request, res: Response, next: NextFunction) => {
  // Evitar que browsers snifem o tipo de conteúdo
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Impedir embedding em iframe (clickjacking)
  res.setHeader('X-Frame-Options', 'DENY');
  // XSS filter legado
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Não expor tecnologia usada
  res.removeHeader('X-Powered-By');
  next();
});

// Endpoint para checar se existe admin cadastrado
app.get('/api/check-admin', async (req, res) => {
  try {
    const adminCheck = await (await import('firebase-admin')).firestore().doc('users/admin-check').get();
    res.json({ exists: adminCheck.exists });
  } catch (e) {
    res.json({ exists: false });
  }
});

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.APP_URL}/auth/google/callback`
);

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

// Auth URL endpoint
app.get('/api/auth/google/url', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
  res.json({ url });
});

// Callback endpoint
app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send('No code provided');
  }

  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    
    // Store tokens in a secure cookie
    res.cookie('google_tokens', JSON.stringify(tokens), {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: 'google' }, '*');
              window.close();
            } else {
              window.location.href = '/schedule';
            }
          </script>
          <p>Autenticação bem-sucedida! Esta janela fechará automaticamente.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    res.status(500).send('Authentication failed');
  }
});

// Status endpoint
app.get('/api/auth/google/status', (req, res) => {
  const tokens = req.cookies.google_tokens;
  res.json({ connected: !!tokens });
});

// Logout endpoint
app.post('/api/auth/google/logout', (req, res) => {
  res.clearCookie('google_tokens', {
    secure: true,
    sameSite: 'none',
  });
  res.json({ success: true });
});

// Calendar events endpoint
app.get('/api/calendar/events', async (req, res) => {
  const tokensStr = req.cookies.google_tokens;
  if (!tokensStr) {
    return res.status(401).json({ error: 'Not connected to Google' });
  }

  try {
    const tokens = JSON.parse(tokensStr);
    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.APP_URL}/auth/google/callback`
    );
    client.setCredentials(tokens);

    const calendar = google.calendar({ version: 'v3', auth: client });
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });

    res.json(response.data.items || []);
  } catch (error: any) {
    console.error('Error fetching calendar events:', error);
    if (error.code === 401) {
      res.clearCookie('google_tokens');
      return res.status(401).json({ error: 'Session expired' });
    }
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
