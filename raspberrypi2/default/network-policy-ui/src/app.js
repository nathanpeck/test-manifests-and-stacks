const state = {
  policyName: 'default-network-policy',
  policyDesc: 'Baseline deny-all with standard exceptions',
  podSelectorType: 'all',
  podLabels: [],
  policyTypes: { ingress: true, egress: true },
  ingressRules: [
    { id: 1, name: 'Deny all ingress', type: 'deny', sourceType: 'deny' },
    { id: 2, name: 'Allow from ingress controller', type: 'allow', sourceType: 'namespace+pod', namespace: 'ingress-nginx', podKey: 'app.kubernetes.io/name', podValue: 'ingress-nginx', port: '', protocol: 'TCP' },
    { id: 3, name: 'Allow metrics scrape', type: 'allow', sourceType: 'namespace+pod', namespace: 'monitoring', podKey: 'app', podValue: 'prometheus', port: '9090', protocol: 'TCP' },
  ],
  egressRules: [
    { id: 4, name: 'Deny all egress', type: 'deny', sourceType: 'deny' },
    { id: 5, name: 'Allow DNS', type: 'allow', sourceType: 'namespace+pod', namespace: 'kube-system', podKey: 'k8s-app', podValue: 'kube-dns', port: '53', protocol: 'UDP+TCP' },
  ],
};

let editingDirection = 'ingress';
let editingRuleId = null;
let nextId = 10;

function render() {
  renderRules('ingress');
  renderRules('egress');
  renderYaml();
  updateCounts();
}

function renderRules(direction) {
  const rules = direction === 'ingress' ? state.ingressRules : state.egressRules;
  const container = document.getElementById(`${direction}-rules`);
  container.innerHTML = '';
  rules.forEach(rule => {
    container.appendChild(buildRuleCard(rule, direction));
  });
}

function buildRuleCard(rule, direction) {
  const card = document.createElement('div');
  card.className = 'rule-card';

  const isAllow = rule.type === 'allow';
  const tagClass = isAllow ? 'rule-tag-allow' : 'rule-tag-deny';
  const tagLabel = isAllow ? 'allow' : 'deny';

  let fieldsHtml = '';
  if (rule.type === 'allow') {
    const fields = [];
    if (rule.namespace) fields.push({ label: 'Namespace', value: rule.namespace });
    if (rule.podKey) fields.push({ label: 'Pod label', value: `${rule.podKey}: ${rule.podValue}` });
    if (rule.cidr) fields.push({ label: 'CIDR', value: rule.cidr });
    if (rule.port) fields.push({ label: 'Port', value: rule.protocol === 'UDP+TCP' ? `${rule.port}/UDP+TCP` : `${rule.port}/${rule.protocol}` });

    if (fields.length) {
      fieldsHtml = `<div class="rule-card-fields">${fields.map(f =>
        `<div><div class="rule-field-label">${f.label}</div><div class="rule-field-value" title="${f.value}">${f.value}</div></div>`
      ).join('')}</div>`;
    }

    if (rule.sourceType === 'namespace+pod' && rule.namespace && rule.podKey) {
      fieldsHtml += `<div class="rule-note">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="12" height="12"><path d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/></svg>
        Namespace + pod label ANDed (same <code style="font-family:monospace;font-size:11px">from</code> element)
      </div>`;
    }
  } else {
    fieldsHtml = `<div style="font-size:12px;color:#aaa;margin-top:4px;">No rules defined — all ${direction} traffic is dropped</div>`;
  }

  card.innerHTML = `
    <div class="rule-card-header">
      <div class="rule-card-title">
        <span>${rule.name}</span>
        <span class="rule-tag ${tagClass}">${tagLabel}</span>
      </div>
      <div class="rule-card-actions">
        <button class="rule-action-btn" title="Edit" onclick="openEditRule('${direction}', ${rule.id})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14"><path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"/></svg>
        </button>
        <button class="rule-action-btn" title="Delete" onclick="deleteRule('${direction}', ${rule.id})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14"><path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>
        </button>
      </div>
    </div>
    ${fieldsHtml}
  `;

  return card;
}

function updateCounts() {
  document.getElementById('ingress-count').textContent =
    `${state.ingressRules.length} rule${state.ingressRules.length !== 1 ? 's' : ''}`;
  document.getElementById('egress-count').textContent =
    `${state.egressRules.length} rule${state.egressRules.length !== 1 ? 's' : ''}`;
}

function togglePolicyType(type) {
  state.policyTypes[type] = !state.policyTypes[type];
  const btn = document.getElementById(`btn-${type}`);
  if (state.policyTypes[type]) {
    btn.classList.remove('inactive');
    btn.classList.add(type === 'ingress' ? 'active-ingress' : 'active-egress');
    document.getElementById(`${type}-section`).style.display = '';
  } else {
    btn.classList.add('inactive');
    btn.classList.remove('active-ingress', 'active-egress');
    document.getElementById(`${type}-section`).style.display = 'none';
  }
  renderYaml();
}

function onPodSelectorChange(value) {
  state.podSelectorType = value;
  const hint = document.getElementById('pod-selector-hint');
  const labelInputs = document.getElementById('pod-label-inputs');
  const exprInputs = document.getElementById('pod-expression-inputs');

  hint.style.display = value === 'all' ? '' : 'none';
  labelInputs.style.display = value === 'labels' ? '' : 'none';
  exprInputs.style.display = value === 'expression' ? '' : 'none';

  if (value === 'labels' && state.podLabels.length === 0) addPodLabel();
  renderYaml();
}

function addPodLabel() {
  const id = nextId++;
  state.podLabels.push({ id, key: '', value: '' });
  renderPodLabels();
}

function renderPodLabels() {
  const list = document.getElementById('pod-label-list');
  list.innerHTML = '';
  state.podLabels.forEach(lbl => {
    const row = document.createElement('div');
    row.className = 'label-pair';
    row.innerHTML = `
      <input type="text" class="input" placeholder="key" value="${lbl.key}" style="max-width:160px;"
        oninput="updatePodLabel(${lbl.id}, 'key', this.value)" />
      <span style="color:#ccc;">:</span>
      <input type="text" class="input" placeholder="value" value="${lbl.value}" style="max-width:160px;"
        oninput="updatePodLabel(${lbl.id}, 'value', this.value)" />
      <button class="btn-remove-label" onclick="removePodLabel(${lbl.id})">×</button>
    `;
    list.appendChild(row);
  });
}

function updatePodLabel(id, field, val) {
  const lbl = state.podLabels.find(l => l.id === id);
  if (lbl) { lbl[field] = val; renderYaml(); }
}

function removePodLabel(id) {
  state.podLabels = state.podLabels.filter(l => l.id !== id);
  renderPodLabels();
  renderYaml();
}

// Modal
function openAddRule(direction) {
  editingDirection = direction;
  editingRuleId = null;
  document.getElementById('modal-title').textContent = `Add ${direction} rule`;
  document.getElementById('modal-name').value = '';
  document.getElementById('modal-source-type').value = 'namespace';
  document.getElementById('modal-namespace').value = '';
  document.getElementById('modal-pod-key').value = '';
  document.getElementById('modal-pod-value').value = '';
  document.getElementById('modal-cidr').value = '';
  document.getElementById('modal-port').value = '';
  document.getElementById('modal-protocol').value = 'TCP';
  document.querySelector('.modal-footer .btn-primary').textContent = 'Add rule';
  onModalSourceChange();
  document.getElementById('modal-backdrop').style.display = 'flex';
}

function openEditRule(direction, id) {
  editingDirection = direction;
  editingRuleId = id;
  const rules = direction === 'ingress' ? state.ingressRules : state.egressRules;
  const rule = rules.find(r => r.id === id);
  if (!rule) return;

  document.getElementById('modal-title').textContent = `Edit ${direction} rule`;
  document.getElementById('modal-name').value = rule.name;
  document.getElementById('modal-source-type').value = rule.sourceType || 'deny';
  document.getElementById('modal-namespace').value = rule.namespace || '';
  document.getElementById('modal-pod-key').value = rule.podKey || '';
  document.getElementById('modal-pod-value').value = rule.podValue || '';
  document.getElementById('modal-cidr').value = rule.cidr || '';
  document.getElementById('modal-port').value = rule.port || '';
  document.getElementById('modal-protocol').value = rule.protocol === 'UDP+TCP' ? 'UDP' : (rule.protocol || 'TCP');
  document.querySelector('.modal-footer .btn-primary').textContent = 'Save rule';
  onModalSourceChange();
  document.getElementById('modal-backdrop').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal-backdrop').style.display = 'none';
}

function onModalSourceChange() {
  const val = document.getElementById('modal-source-type').value;
  const nsField = document.getElementById('modal-namespace-field');
  const podField = document.getElementById('modal-pod-label-field');
  const cidrField = document.getElementById('modal-cidr-field');
  const andHint = document.getElementById('modal-and-hint');

  nsField.style.display = (val === 'namespace' || val === 'namespace+pod') ? 'flex' : 'none';
  podField.style.display = (val === 'namespace+pod' || val === 'pod') ? 'flex' : 'none';
  cidrField.style.display = val === 'cidr' ? 'flex' : 'none';
  andHint.style.display = val === 'namespace+pod' ? 'block' : 'none';
}

function saveRule() {
  const name = document.getElementById('modal-name').value.trim();
  if (!name) { document.getElementById('modal-name').focus(); return; }

  const sourceType = document.getElementById('modal-source-type').value;
  const rule = {
    id: editingRuleId || nextId++,
    name,
    type: sourceType === 'deny' ? 'deny' : 'allow',
    sourceType,
    namespace: document.getElementById('modal-namespace').value.trim(),
    podKey: document.getElementById('modal-pod-key').value.trim(),
    podValue: document.getElementById('modal-pod-value').value.trim(),
    cidr: document.getElementById('modal-cidr').value.trim(),
    port: document.getElementById('modal-port').value.trim(),
    protocol: document.getElementById('modal-protocol').value,
  };

  const rules = editingDirection === 'ingress' ? state.ingressRules : state.egressRules;

  if (editingRuleId) {
    const idx = rules.findIndex(r => r.id === editingRuleId);
    if (idx !== -1) rules[idx] = rule;
  } else {
    rules.push(rule);
  }

  closeModal();
  render();
}

function deleteRule(direction, id) {
  if (direction === 'ingress') {
    state.ingressRules = state.ingressRules.filter(r => r.id !== id);
  } else {
    state.egressRules = state.egressRules.filter(r => r.id !== id);
  }
  render();
}

// YAML generation
function renderYaml() {
  const name = document.getElementById('policy-name').value || 'unnamed-policy';
  const lines = [];

  lines.push('apiVersion: networking.k8s.io/v1');
  lines.push('kind: NetworkPolicy');
  lines.push('metadata:');
  lines.push(`  name: ${name}`);
  lines.push('spec:');

  // podSelector
  if (state.podSelectorType === 'all') {
    lines.push('  podSelector: {}');
  } else if (state.podSelectorType === 'labels' && state.podLabels.length) {
    lines.push('  podSelector:');
    lines.push('    matchLabels:');
    state.podLabels.forEach(l => {
      if (l.key) lines.push(`      ${l.key}: ${l.value || '""'}`);
    });
  } else {
    lines.push('  podSelector: {}');
  }

  const types = [];
  if (state.policyTypes.ingress) types.push('Ingress');
  if (state.policyTypes.egress) types.push('Egress');

  lines.push('  policyTypes:');
  types.forEach(t => lines.push(`  - ${t}`));

  if (state.policyTypes.ingress) {
    const allowRules = state.ingressRules.filter(r => r.type === 'allow');
    if (allowRules.length) {
      lines.push('  ingress:');
      allowRules.forEach(r => appendRuleYaml(lines, r, 'from'));
    }
  }

  if (state.policyTypes.egress) {
    const allowRules = state.egressRules.filter(r => r.type === 'allow');
    if (allowRules.length) {
      lines.push('  egress:');
      allowRules.forEach(r => appendRuleYaml(lines, r, 'to'));
    }
  }

  document.getElementById('yaml-output').textContent = lines.join('\n');
}

function appendRuleYaml(lines, rule, dir) {
  const hasPeer = rule.sourceType !== 'wildcard' && rule.sourceType !== 'deny';
  const hasPort = !!rule.port;

  lines.push(`  - ${hasPeer ? dir + ':' : ''}`);

  if (rule.sourceType === 'namespace' || rule.sourceType === 'namespace+pod') {
    lines.push(`    - namespaceSelector:`);
    lines.push(`        matchLabels:`);
    lines.push(`          kubernetes.io/metadata.name: ${rule.namespace}`);
    if (rule.sourceType === 'namespace+pod' && rule.podKey) {
      lines.push(`      podSelector:`);
      lines.push(`        matchLabels:`);
      lines.push(`          ${rule.podKey}: ${rule.podValue}`);
    }
  } else if (rule.sourceType === 'pod') {
    lines.push(`    - podSelector:`);
    lines.push(`        matchLabels:`);
    lines.push(`          ${rule.podKey}: ${rule.podValue}`);
  } else if (rule.sourceType === 'cidr') {
    lines.push(`    - ipBlock:`);
    lines.push(`        cidr: ${rule.cidr}`);
  } else if (rule.sourceType === 'wildcard') {
    lines[lines.length - 1] = `  -`;
  }

  if (hasPort) {
    if (rule.protocol === 'UDP+TCP') {
      lines.push(`    ports:`);
      lines.push(`    - port: ${rule.port}`);
      lines.push(`      protocol: UDP`);
      lines.push(`    - port: ${rule.port}`);
      lines.push(`      protocol: TCP`);
    } else {
      lines.push(`    ports:`);
      lines.push(`    - port: ${rule.port}`);
      lines.push(`      protocol: ${rule.protocol}`);
    }
  }
}

// Preview toggle
document.getElementById('btn-preview-toggle').addEventListener('click', () => {
  const panel = document.getElementById('yaml-panel');
  const btn = document.getElementById('btn-preview-toggle');
  if (panel.style.display === 'none') {
    panel.style.display = '';
    btn.textContent = 'Hide YAML';
  } else {
    panel.style.display = 'none';
    btn.textContent = 'Show YAML';
  }
});

// Live name update
document.getElementById('policy-name').addEventListener('input', renderYaml);

render();
