const defaultBoard = {
  backlog: [
    { id: crypto.randomUUID(), title: 'Define mission milestones' },
    { id: crypto.randomUUID(), title: 'Review this week priorities' },
  ],
  in_progress: [],
  blocked: [],
  complete: [],
};

const columns = [
  { key: 'backlog', title: 'Backlog' },
  { key: 'in_progress', title: 'In Progress' },
  { key: 'blocked', title: 'Blocked' },
  { key: 'complete', title: 'Complete' },
];

const state = {
  board: loadBoard(),
  dragTaskId: null,
};

const statusText = document.getElementById('statusText');
const healthText = document.getElementById('healthText');
const securityScore = document.getElementById('securityScore');
const securityUpdated = document.getElementById('securityUpdated');
const issuesList = document.getElementById('issuesList');

function loadBoard() {
  const raw = localStorage.getItem('mission-control-kanban');
  if (!raw) return structuredClone(defaultBoard);

  try {
    const parsed = JSON.parse(raw);
    for (const c of columns) {
      if (!Array.isArray(parsed[c.key])) parsed[c.key] = [];
    }
    return parsed;
  } catch {
    return structuredClone(defaultBoard);
  }
}

function saveBoard() {
  localStorage.setItem('mission-control-kanban', JSON.stringify(state.board));
}

function renderKanban() {
  const root = document.getElementById('kanban');
  root.innerHTML = '';

  for (const col of columns) {
    const wrap = document.createElement('div');
    wrap.className = 'column';
    wrap.dataset.column = col.key;

    const title = document.createElement('h3');
    title.textContent = `${col.title} (${state.board[col.key].length})`;
    wrap.appendChild(title);

    const list = document.createElement('div');
    list.className = 'task-list';

    list.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    list.addEventListener('drop', () => {
      if (!state.dragTaskId) return;
      moveTask(state.dragTaskId, col.key);
      state.dragTaskId = null;
    });

    for (const task of state.board[col.key]) {
      const el = document.getElementById('taskTemplate').content.firstElementChild.cloneNode(true);
      el.dataset.id = task.id;
      el.querySelector('.task-title').textContent = task.title;

      el.addEventListener('dragstart', () => {
        state.dragTaskId = task.id;
      });

      el.querySelector('.delete-task').addEventListener('click', () => {
        deleteTask(task.id);
      });

      list.appendChild(el);
    }

    wrap.appendChild(list);

    const addBtn = document.createElement('button');
    addBtn.className = 'add-task';
    addBtn.textContent = '+ Add task';
    addBtn.addEventListener('click', () => {
      const title = prompt(`New task for ${col.title}:`);
      if (!title || !title.trim()) return;
      state.board[col.key].push({ id: crypto.randomUUID(), title: title.trim() });
      saveBoard();
      renderKanban();
    });
    wrap.appendChild(addBtn);

    root.appendChild(wrap);
  }
}

function moveTask(taskId, targetColumn) {
  let moved = null;

  for (const col of columns) {
    const idx = state.board[col.key].findIndex((t) => t.id === taskId);
    if (idx !== -1) {
      moved = state.board[col.key][idx];
      state.board[col.key].splice(idx, 1);
      break;
    }
  }

  if (!moved) return;
  state.board[targetColumn].push(moved);
  saveBoard();
  renderKanban();
}

function deleteTask(taskId) {
  for (const col of columns) {
    const idx = state.board[col.key].findIndex((t) => t.id === taskId);
    if (idx !== -1) {
      state.board[col.key].splice(idx, 1);
      saveBoard();
      renderKanban();
      return;
    }
  }
}

function setScore(score) {
  if (typeof score !== 'number') {
    securityScore.textContent = '--';
    securityScore.className = 'score';
    return;
  }

  securityScore.textContent = String(score);
  let cls = 'score good';
  if (score < 70) cls = 'score bad';
  else if (score < 90) cls = 'score warn';
  securityScore.className = cls;
}

function renderIssues(issues) {
  issuesList.innerHTML = '';
  if (!issues || !issues.length) {
    const li = document.createElement('li');
    li.textContent = 'No outstanding security issues detected.';
    issuesList.appendChild(li);
    return;
  }

  for (const issue of issues) {
    const li = document.createElement('li');
    const sev = document.createElement('span');
    sev.className = 'severity';
    sev.textContent = issue.severity || 'unknown';

    li.textContent = issue.title;
    li.appendChild(sev);

    if (issue.detail) {
      const d = document.createElement('div');
      d.style.color = '#9da7b3';
      d.style.fontSize = '0.8rem';
      d.textContent = issue.detail;
      li.appendChild(d);
    }

    issuesList.appendChild(li);
  }
}

async function loadOverview() {
  statusText.textContent = 'Loading...';
  healthText.textContent = 'Loading...';
  try {
    const res = await fetch('/api/overview');
    const data = await res.json();

    statusText.textContent = data.status.raw || 'No status output';

    if (data.health.data) {
      healthText.textContent = JSON.stringify(data.health.data, null, 2);
    } else {
      healthText.textContent = data.health.raw || 'No health output';
    }

    setScore(data.security.score);
    renderIssues(data.security.issues);
    securityUpdated.textContent = `Last update: ${new Date(data.generatedAt).toLocaleString()}`;
  } catch (err) {
    statusText.textContent = `Failed to load overview: ${err}`;
    healthText.textContent = 'Unavailable';
    setScore(null);
    renderIssues([{ title: 'Could not fetch security audit results.', severity: 'high', detail: String(err) }]);
  }
}

async function runDeepAudit() {
  securityUpdated.textContent = 'Running deep audit...';
  try {
    const res = await fetch('/api/security-audit/run', { method: 'POST' });
    const data = await res.json();
    setScore(data.score);
    renderIssues(data.issues);
    securityUpdated.textContent = `Deep audit complete: ${new Date(data.generatedAt).toLocaleString()}`;
  } catch (err) {
    securityUpdated.textContent = `Deep audit failed: ${err}`;
  }
}

document.getElementById('refreshBtn').addEventListener('click', loadOverview);
document.getElementById('runAuditBtn').addEventListener('click', runDeepAudit);

renderKanban();
loadOverview();
