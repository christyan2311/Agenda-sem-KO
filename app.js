var SB_URL  = 'https://vngscnahsuqakwmzsnbb.supabase.co';
var SB_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuZ3NjbmFoc3VxYWt3bXpzbmJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NzA5OTIsImV4cCI6MjA5NjA0Njk5Mn0.6fbixdBTO8MGYcb2DuekzLCIVN7k_eZXvAlEeoW_8XY';
var SB_HEADERS = { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation' };

var CLD_NAME   = 'dgzqo3yve';
var CLD_PRESET = 'agenda_pipa';
var CLD_URL    = 'https://api.cloudinary.com/v1_1/' + CLD_NAME + '/image/upload';

var eventos   = [];
var editId    = null;
var flyerUrl  = null;
var uploading = false;
var hoje      = new Date();
var cAno      = hoje.getFullYear();
var cMes      = hoje.getMonth();
var eAno      = hoje.getFullYear();
var eMes      = hoje.getMonth();

var MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
var MABR  = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function fmt(d) { if (!d) return ''; var p = d.split('-'); return p[2]+'/'+p[1]+'/'+p[0]; }

function sbRow(ev) {
  return { id: ev.id, nome: ev.nome, data: ev.data || '', hora: ev.hora || '', local: ev.local || '', descricao: ev.desc || '', flyer: ev.flyer || '' };
}
function fromRow(r) {
  return { id: r.id, nome: r.nome, data: r.data, hora: r.hora, local: r.local, desc: r.descricao, flyer: r.flyer || null };
}

function toast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('on');
  setTimeout(function() { t.classList.remove('on'); }, 3000);
}

function setLoading(on) {
  var el = document.getElementById('loading');
  if (on) el.classList.remove('oculto');
  else    el.classList.add('oculto');
}

function setBusy(on, txt) {
  var bs = document.getElementById('btn-salvar');
  var bn = document.getElementById('btn-novo');
  bs.disabled = on;
  bn.disabled = on;
  bs.textContent = on ? (txt || 'Salvando...') : 'Salvar Evento';
}

// ── CARREGAR ──
function carregar() {
  setLoading(true);
  fetch(SB_URL + '/rest/v1/eventos?select=*&order=data.asc', { headers: SB_HEADERS })
    .then(function(r) {
      setLoading(false);
      if (!r.ok) { toast('Erro ' + r.status + ' ao carregar.'); return null; }
      return r.json();
    })
    .then(function(data) {
      if (!data) return;
      eventos = data.map(fromRow);
      renderEventos();
    })
    .catch(function() {
      setLoading(false);
      toast('Erro de conexão. Recarregue a página.');
    });
}

// ── INSERIR / ATUALIZAR / EXCLUIR ──
function inserirEvento(ev, cb) {
  fetch(SB_URL + '/rest/v1/eventos', {
    method: 'POST',
    headers: SB_HEADERS,
    body: JSON.stringify(sbRow(ev))
  }).then(function(r) {
    if (!r.ok) { setBusy(false); toast('Erro ao salvar.'); return; }
    if (cb) cb();
  }).catch(function() { setBusy(false); toast('Erro de conexão.'); });
}

function atualizarEvento(ev, cb) {
  fetch(SB_URL + '/rest/v1/eventos?id=eq.' + encodeURIComponent(ev.id), {
    method: 'PATCH',
    headers: SB_HEADERS,
    body: JSON.stringify(sbRow(ev))
  }).then(function(r) {
    if (!r.ok) { setBusy(false); toast('Erro ao atualizar.'); return; }
    if (cb) cb();
  }).catch(function() { setBusy(false); toast('Erro de conexão.'); });
}

function excluirEvento(id, cb) {
  fetch(SB_URL + '/rest/v1/eventos?id=eq.' + encodeURIComponent(id), {
    method: 'DELETE',
    headers: SB_HEADERS
  }).then(function(r) {
    if (!r.ok) { setBusy(false); toast('Erro ao excluir.'); return; }
    if (cb) cb();
  }).catch(function() { setBusy(false); toast('Erro de conexão.'); });
}

// ── UPLOAD CLOUDINARY ──
function uploadFlyer(file, cb) {
  uploading = true;
  setBusy(true, 'Enviando imagem...');
  var prog = document.getElementById('upload-progress');
  var fill = document.getElementById('progress-fill');
  var ptxt = document.getElementById('progress-txt');
  prog.style.display = 'block';
  fill.style.width = '0%';
  ptxt.textContent = 'Enviando...';

  var fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CLD_PRESET);

  var xhr = new XMLHttpRequest();
  xhr.open('POST', CLD_URL, true);
  xhr.upload.onprogress = function(e) {
    if (e.lengthComputable) {
      var p = Math.round(e.loaded / e.total * 100);
      fill.style.width = p + '%';
      ptxt.textContent = 'Enviando ' + p + '%';
    }
  };
  xhr.onload = function() {
    uploading = false;
    prog.style.display = 'none';
    if (xhr.status === 200) {
      var res = JSON.parse(xhr.responseText);
      flyerUrl = res.secure_url;
      setBusy(false);
      cb(res.secure_url);
    } else {
      setBusy(false);
      toast('Erro no upload da imagem.');
    }
  };
  xhr.onerror = function() {
    uploading = false;
    prog.style.display = 'none';
    setBusy(false);
    toast('Falha no upload. Verifique o preset do Cloudinary.');
  };
  xhr.send(fd);
}

function selecionarFlyer(e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    var img = document.getElementById('f-preview');
    img.src = ev.target.result;
    img.style.display = 'block';
    document.getElementById('upload-placeholder').style.display = 'none';
  };
  reader.readAsDataURL(file);
  flyerUrl = null;
  uploadFlyer(file, function(url) {
    flyerUrl = url;
    toast('Imagem enviada!');
  });
}

// ── VIEWS ──
function trocarView(view, btn) {
  document.querySelectorAll('.view').forEach(function(v) { v.classList.remove('ativo'); });
  document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('ativo'); });
  document.getElementById('view-' + view).classList.add('ativo');
  btn.classList.add('ativo');
  if (view === 'calendario') renderCal();
  if (view === 'eventos') renderEventos();
}

// ── FILTRO MÊS EVENTOS ──
function mudaMesEventos(d) {
  eMes += d;
  if (eMes < 0)  { eMes = 11; eAno--; }
  if (eMes > 11) { eMes = 0;  eAno++; }
  renderEventos();
}

// ── RENDER EVENTOS ──
function renderEventos() {
  document.getElementById('eventos-mes-label').textContent = MESES[eMes] + ' ' + eAno;
  var grid  = document.getElementById('grid-eventos');
  var empty = document.getElementById('empty');
  var pfx   = eAno + '-' + String(eMes+1).padStart(2,'0');
  var list  = eventos.filter(function(e) { return e.data && e.data.startsWith(pfx); })
                     .sort(function(a,b) { return (a.data||'').localeCompare(b.data||''); });

  if (!list.length) { grid.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  grid.innerHTML = list.map(function(ev) {
    var fh = ev.flyer
      ? '<img class="card-flyer" src="' + ev.flyer + '" alt="Flyer">'
      : '<div class="card-no-flyer"><span class="card-no-flyer-text">Sem flyer</span></div>';
    var dh = ev.data ? '<div class="card-date">' + fmt(ev.data) + (ev.hora ? ' &middot; ' + ev.hora : '') + '</div>' : '';
    var lh = ev.local ? '<div class="card-location"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>' + ev.local + '</div>' : '';
    var xh = ev.desc ? '<div class="card-divider"></div><div class="card-desc">' + ev.desc + '</div>' : '';
    return '<div class="card">' + fh + '<div class="card-body">' + dh + '<div class="card-title">' + ev.nome + '</div>' + lh + xh
      + '<div class="card-actions">'
      + '<button class="btn btn-ghost" onclick="abrirModal(\'' + ev.id + '\')">Editar</button>'
      + '<button class="btn btn-ghost-danger" onclick="excluir(\'' + ev.id + '\')">Excluir</button>'
      + '</div></div></div>';
  }).join('');
}

// ── MODAL ──
function abrirModal(id) {
  editId   = id || null;
  flyerUrl = null;
  ['f-nome','f-data','f-hora','f-local','f-desc'].forEach(function(k) { document.getElementById(k).value = ''; });
  document.getElementById('f-preview').style.display = 'none';
  document.getElementById('upload-placeholder').style.display = 'block';
  document.getElementById('f-flyer').value = '';
  document.getElementById('upload-progress').style.display = 'none';

  if (editId) {
    var ev = eventos.find(function(e) { return e.id === editId; });
    if (ev) {
      document.getElementById('modal-titulo').textContent = 'Editar Evento';
      document.getElementById('f-nome').value  = ev.nome  || '';
      document.getElementById('f-data').value  = ev.data  || '';
      document.getElementById('f-hora').value  = ev.hora  || '';
      document.getElementById('f-local').value = ev.local || '';
      document.getElementById('f-desc').value  = ev.desc  || '';
      if (ev.flyer) {
        flyerUrl = ev.flyer;
        var img = document.getElementById('f-preview');
        img.src = ev.flyer;
        img.style.display = 'block';
        document.getElementById('upload-placeholder').style.display = 'none';
      }
    }
  } else {
    document.getElementById('modal-titulo').textContent = 'Novo Evento';
  }

  document.getElementById('overlay').classList.add('aberto');
  document.body.style.overflow = 'hidden';
}

function fechar() {
  if (uploading) { toast('Aguarde o upload.'); return; }
  document.getElementById('overlay').classList.remove('aberto');
  document.body.style.overflow = '';
  editId = null; flyerUrl = null;
}

function overlayClick(e) { if (e.target === document.getElementById('overlay')) fechar(); }

// ── SALVAR EVENTO ──
function salvar() {
  if (uploading) { toast('Aguarde o upload.'); return; }
  var nome = document.getElementById('f-nome').value.trim();
  if (!nome) { toast('Informe o nome do evento'); return; }

  var ev = {
    id:    editId || uid(),
    nome:  nome,
    data:  document.getElementById('f-data').value,
    hora:  document.getElementById('f-hora').value,
    local: document.getElementById('f-local').value.trim(),
    desc:  document.getElementById('f-desc').value.trim(),
    flyer: flyerUrl || null
  };

  var wasEdit = !!editId;
  setBusy(true);

  if (wasEdit) {
    var i = eventos.findIndex(function(e) { return e.id === editId; });
    if (i !== -1) eventos[i] = ev; else eventos.push(ev);
    atualizarEvento(ev, function() {
      setBusy(false);
      toast('Evento atualizado!');
      renderEventos();
      fechar();
    });
  } else {
    eventos.push(ev);
    inserirEvento(ev, function() {
      setBusy(false);
      toast('Evento adicionado!');
      renderEventos();
      fechar();
    });
  }
}

function excluir(id) {
  if (!confirm('Excluir este evento?')) return;
  setBusy(true);
  excluirEvento(id, function() {
    eventos = eventos.filter(function(e) { return e.id !== id; });
    setBusy(false);
    toast('Evento removido');
    renderEventos();
  });
}

// ── CALENDÁRIO ──
function mudaMes(d) {
  cMes += d;
  if (cMes < 0)  { cMes = 11; cAno--; }
  if (cMes > 11) { cMes = 0;  cAno++; }
  renderCal();
}

function renderCal() {
  document.getElementById('cal-label').textContent = MESES[cMes] + ' ' + cAno;
  var prim = new Date(cAno, cMes, 1).getDay();
  var dias = new Date(cAno, cMes + 1, 0).getDate();
  var ant  = new Date(cAno, cMes, 0).getDate();
  var hStr = hoje.toISOString().slice(0,10);
  var h = '';

  for (var i = prim - 1; i >= 0; i--)
    h += '<div class="cal-cell outro"><span class="cal-cell-num">' + (ant-i) + '</span></div>';

  for (var d = 1; d <= dias; d++) {
    var str = cAno + '-' + String(cMes+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
    var evs = eventos.filter(function(e) { return e.data === str; });
    var cls = 'cal-cell' + (str === hStr ? ' hoje' : '') + (evs.length ? ' com-evento' : '');
    h += '<div class="' + cls + '" title="' + evs.map(function(e) { return e.nome; }).join(', ') + '">'
      + '<span class="cal-cell-num">' + d + '</span>'
      + (evs.length ? '<div class="cal-dot"></div>' : '')
      + '</div>';
  }

  var rest = (prim + dias) % 7;
  if (rest) for (var d2 = 1; d2 <= 7 - rest; d2++)
    h += '<div class="cal-cell outro"><span class="cal-cell-num">' + d2 + '</span></div>';

  document.getElementById('cal-cells').innerHTML = h;

  var pfx   = cAno + '-' + String(cMes+1).padStart(2,'0');
  var lista = eventos.filter(function(e) { return e.data && e.data.startsWith(pfx); })
                     .sort(function(a,b) { return a.data.localeCompare(b.data); });
  var el    = document.getElementById('cal-lista');

  if (!lista.length) {
    el.innerHTML = '<div class="empty" style="padding:44px 20px"><div class="empty-title">Sem eventos neste mês</div></div>';
    return;
  }

  var lh = '<div class="cal-events-title">Eventos do Mês</div>';
  lista.forEach(function(ev) {
    var p = ev.data.split('-');
    lh += '<div class="cal-ev-row">'
      + '<div class="cal-ev-date"><div class="cal-ev-day">' + p[2] + '</div><div class="cal-ev-mon">' + MABR[parseInt(p[1],10)-1] + '</div></div>'
      + '<div class="cal-ev-info"><div class="cal-ev-name">' + ev.nome + '</div><div class="cal-ev-meta">'
      + (ev.hora  ? '<span>' + ev.hora  + '</span>' : '')
      + (ev.local ? '<span>' + ev.local + '</span>' : '')
      + '</div></div></div>';
  });
  el.innerHTML = lh;
}

// ── INIT ──
carregar();
