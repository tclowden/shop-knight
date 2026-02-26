const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = process.env.PORT || 8787;
const PUBLIC_DIR = path.join(__dirname, 'public');

function run(command) {
  return new Promise((resolve) => {
    exec(command, { timeout: 120000, maxBuffer: 5 * 1024 * 1024 }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        code: error ? (typeof error.code === 'number' ? error.code : 1) : 0,
        stdout: (stdout || '').trim(),
        stderr: (stderr || '').trim(),
      });
    });
  });
}

function parseJsonSafe(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function scoreFromAudit(audit) {
  if (!audit) return null;

  const directScore =
    audit.securityScore ??
    audit.score ??
    audit.summary?.score ??
    audit.result?.score ??
    null;

  if (typeof directScore === 'number') {
    return Math.max(0, Math.min(100, Math.round(directScore)));
  }

  const findings =
    audit.issues ||
    audit.findings ||
    audit.summary?.issues ||
    audit.result?.issues ||
    [];

  if (!Array.isArray(findings) || findings.length === 0) return 100;

  const weights = { critical: 30, high: 20, medium: 10, low: 4, info: 1 };
  let penalty = 0;

  for (const item of findings) {
    const sev = String(item.severity || item.level || 'low').toLowerCase();
    penalty += weights[sev] ?? 5;
  }

  return Math.max(0, 100 - penalty);
}

function extractIssues(audit) {
  if (!audit) return [];
  const buckets = [
    audit.issues,
    audit.findings,
    audit.summary?.issues,
    audit.result?.issues,
    audit.warnings,
  ];

  for (const b of buckets) {
    if (Array.isArray(b)) {
      return b.map((issue, index) => ({
        id: issue.id || issue.code || `issue-${index + 1}`,
        title: issue.title || issue.message || issue.name || `Issue ${index + 1}`,
        severity: String(issue.severity || issue.level || 'unknown').toLowerCase(),
        detail: issue.detail || issue.description || issue.recommendation || '',
      }));
    }
  }

  return [];
}

async function getOverview() {
  const [statusRes, healthRes, auditRes] = await Promise.all([
    run('openclaw status --deep'),
    run('openclaw health --json'),
    run('openclaw security audit --json'),
  ]);

  const health = parseJsonSafe(healthRes.stdout);
  const audit = parseJsonSafe(auditRes.stdout);

  return {
    generatedAt: new Date().toISOString(),
    status: {
      ok: statusRes.ok,
      raw: statusRes.stdout || statusRes.stderr,
      code: statusRes.code,
    },
    health: {
      ok: healthRes.ok,
      data: health,
      raw: healthRes.stdout || healthRes.stderr,
      code: healthRes.code,
    },
    security: {
      ok: auditRes.ok,
      score: scoreFromAudit(audit),
      issues: extractIssues(audit),
      data: audit,
      raw: auditRes.stdout || auditRes.stderr,
      code: auditRes.code,
      command: 'openclaw security audit --json',
    },
  };
}

function sendJson(res, statusCode, payload) {
  const data = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data),
  });
  res.end(data);
}

function serveStatic(req, res) {
  const reqPath = req.url === '/' ? '/index.html' : req.url;
  const safePath = path.normalize(reqPath).replace(/^\.\.(\/|\\|$)/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const types = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
    };

    res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain; charset=utf-8' });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/api/overview') {
    try {
      const data = await getOverview();
      sendJson(res, 200, data);
    } catch (err) {
      sendJson(res, 500, { error: 'Failed to build overview', detail: String(err) });
    }
    return;
  }

  if (req.method === 'POST' && req.url === '/api/security-audit/run') {
    const auditRes = await run('openclaw security audit --deep --json');
    const audit = parseJsonSafe(auditRes.stdout);
    sendJson(res, auditRes.ok ? 200 : 500, {
      ok: auditRes.ok,
      code: auditRes.code,
      score: scoreFromAudit(audit),
      issues: extractIssues(audit),
      data: audit,
      raw: auditRes.stdout || auditRes.stderr,
      command: 'openclaw security audit --deep --json',
      generatedAt: new Date().toISOString(),
    });
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Mission Control running on http://localhost:${PORT}`);
});
