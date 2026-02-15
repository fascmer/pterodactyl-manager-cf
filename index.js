// Pterodactyl File Manager - Cloudflare Worker Version

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-URL, X-API-Key, X-Server-ID'
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
  });
}

// 代理请求到翼龙 API
async function proxyRequest(request, apiUrl, apiKey, path, method = 'GET', body = null) {
  const url = apiUrl + path;
  
  const headers = {
    'Authorization': 'Bearer ' + apiKey,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
  
  const options = { method, headers };
  if (body && method !== 'GET') {
    options.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  
  try {
    const resp = await fetch(url, options);
    const text = await resp.text();
    return new Response(text, {
      status: resp.status,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  } catch (e) {
    return jsonResponse({ error: e.message }, 500);
  }
}

// API 路由
async function handleApi(request, path) {
  const apiUrl = (request.headers.get('X-API-URL') || '').replace(/\/$/, '');
  const apiKey = request.headers.get('X-API-Key') || '';
  const serverId = request.headers.get('X-Server-ID') || '';
  
  if (!apiUrl || !apiKey) {
    return jsonResponse({ error: '请配置 API 地址和 Key' }, 400);
  }
  
  const baseUrl = apiUrl + '/' + serverId;
  const method = request.method;
  const url = new URL(request.url);
  
  // 文件列表
  if (path === '/api/files/list') {
    const dir = url.searchParams.get('directory') || '/';
    return proxyRequest(request, baseUrl, apiKey, '/files/list?directory=' + encodeURIComponent(dir));
  }
  
  // 文件内容
  if (path === '/api/files/contents') {
    const file = url.searchParams.get('file') || '';
    return proxyRequest(request, baseUrl, apiKey, '/files/contents?file=' + encodeURIComponent(file));
  }
  
  // 写入文件
  if (path === '/api/files/write' && method === 'POST') {
    const file = url.searchParams.get('file') || '';
    const body = await request.text();
    const resp = await fetch(baseUrl + '/files/write?file=' + encodeURIComponent(file), {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey },
      body
    });
    return new Response(resp.status === 204 ? '{"status":"ok"}' : await resp.text(), {
      status: resp.status === 204 ? 200 : resp.status,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
  
  // 删除文件
  if (path === '/api/files/delete' && method === 'POST') {
    const body = await request.json();
    return proxyRequest(request, baseUrl, apiKey, '/files/delete', 'POST', body);
  }
  
  // 重命名
  if (path === '/api/files/rename' && method === 'POST') {
    const body = await request.json();
    return proxyRequest(request, baseUrl, apiKey, '/files/rename', 'PUT', body);
  }
  
  // 创建文件夹
  if (path === '/api/files/create-folder' && method === 'POST') {
    const body = await request.json();
    return proxyRequest(request, baseUrl, apiKey, '/files/create-folder', 'POST', body);
  }
  
  // 下载链接
  if (path === '/api/files/download') {
    const file = url.searchParams.get('file') || '';
    return proxyRequest(request, baseUrl, apiKey, '/files/download?file=' + encodeURIComponent(file));
  }
  
  // 上传链接
  if (path === '/api/files/upload') {
    return proxyRequest(request, baseUrl, apiKey, '/files/upload');
  }
  
  // 压缩
  if (path === '/api/files/compress' && method === 'POST') {
    const body = await request.json();
    return proxyRequest(request, baseUrl, apiKey, '/files/compress', 'POST', body);
  }
  
  // 解压
  if (path === '/api/files/decompress' && method === 'POST') {
    const body = await request.json();
    return proxyRequest(request, baseUrl, apiKey, '/files/decompress', 'POST', body);
  }
  
  // 电源控制
  if (path === '/api/power' && method === 'POST') {
    const body = await request.json();
    return proxyRequest(request, baseUrl, apiKey, '/power', 'POST', body);
  }
  
  // 资源状态
  if (path === '/api/resources') {
    return proxyRequest(request, baseUrl, apiKey, '/resources');
  }
  
  // 发送命令
  if (path === '/api/command' && method === 'POST') {
    const body = await request.json();
    return proxyRequest(request, baseUrl, apiKey, '/command', 'POST', body);
  }
  
  return jsonResponse({ error: 'Not found' }, 404);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }
    
    if (path.startsWith('/api/')) {
      return handleApi(request, path);
    }
    
    if (path === '/' || path === '/index.html') {
      return new Response(HTML_PAGE, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
    
    return new Response('Not Found', { status: 404 });
  }
};

const HTML_PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>翼龙面板文件管理器</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a2e; color: #eee; min-height: 100vh; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { text-align: center; margin-bottom: 20px; color: #00d4ff; }
    .config-panel { background: #16213e; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
    .config-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: end; }
    .config-group { flex: 1; min-width: 200px; }
    .config-group label { display: block; margin-bottom: 5px; font-size: 14px; color: #aaa; }
    .config-group input { width: 100%; padding: 10px; border: 1px solid #333; border-radius: 5px; background: #0f0f23; color: #fff; }
    .btn { padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; }
    .btn-primary { background: #00d4ff; color: #000; }
    .btn-success { background: #00c853; color: #fff; }
    .btn-danger { background: #ff1744; color: #fff; }
    .btn-warning { background: #ff9100; color: #000; }
    .btn-sm { padding: 5px 10px; font-size: 12px; }
    .toolbar { display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap; align-items: center; }
    .breadcrumb { background: #16213e; padding: 10px 15px; border-radius: 5px; flex: 1; }
    .breadcrumb span { cursor: pointer; color: #00d4ff; }
    .breadcrumb span:hover { text-decoration: underline; }
    .status-bar { background: #16213e; padding: 10px 15px; border-radius: 5px; margin-bottom: 15px; display: flex; gap: 20px; align-items: center; flex-wrap: wrap; }
    .status-item { display: flex; align-items: center; gap: 5px; }
    .status-dot { width: 10px; height: 10px; border-radius: 50%; }
    .status-dot.online { background: #00c853; }
    .status-dot.offline { background: #ff1744; }
    .status-dot.unknown { background: #666; }
    .file-manager { background: #16213e; border-radius: 10px; overflow: hidden; }
    .file-header { display: grid; grid-template-columns: 30px 1fr 100px 150px 150px; padding: 15px; background: #0f3460; font-weight: bold; }
    .file-item { display: grid; grid-template-columns: 30px 1fr 100px 150px 150px; padding: 12px 15px; border-bottom: 1px solid #333; align-items: center; }
    .file-item:hover { background: #1f4068; }
    .file-icon { font-size: 18px; }
    .file-name { cursor: pointer; word-break: break-all; }
    .file-name:hover { color: #00d4ff; }
    .file-actions { display: flex; gap: 5px; flex-wrap: wrap; }
    .modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.8); justify-content: center; align-items: center; z-index: 100; }
    .modal.show { display: flex; }
    .modal-content { background: #16213e; padding: 25px; border-radius: 10px; width: 90%; max-width: 800px; max-height: 90vh; overflow: auto; }
    .modal h3 { margin-bottom: 15px; color: #00d4ff; }
    .editor { width: 100%; height: 400px; background: #0f0f23; color: #fff; border: 1px solid #333; border-radius: 5px; padding: 10px; font-family: monospace; resize: vertical; }
    .loading { text-align: center; padding: 40px; color: #888; }
    @media (max-width: 768px) {
      .file-header, .file-item { grid-template-columns: 30px 1fr 80px; }
      .file-header > *:nth-child(4), .file-header > *:nth-child(5),
      .file-item > *:nth-child(4), .file-item > *:nth-child(5) { display: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🦖 翼龙面板文件管理器</h1>
    
    <div class="config-panel">
      <div class="config-row">
        <div class="config-group">
          <label>API 地址</label>
          <input type="text" id="api-url" placeholder="https://panel.example.com/api/client/servers">
        </div>
        <div class="config-group">
          <label>Server ID</label>
          <input type="text" id="server-id" placeholder="abc12345">
        </div>
        <div class="config-group">
          <label>API Key</label>
          <input type="password" id="api-key" placeholder="ptlc_xxxxxx">
        </div>
        <button class="btn btn-primary" onclick="saveConfig()">保存配置</button>
      </div>
    </div>
    
    <div class="status-bar">
      <div class="status-item"><span class="status-dot" id="status-dot"></span><span id="status-text">未知</span></div>
      <div class="status-item">CPU: <span id="cpu-usage">-</span></div>
      <div class="status-item">内存: <span id="mem-usage">-</span></div>
      <button class="btn btn-sm btn-success" onclick="powerAction('start')">开机</button>
      <button class="btn btn-sm btn-warning" onclick="powerAction('restart')">重启</button>
      <button class="btn btn-sm btn-danger" onclick="powerAction('stop')">关机</button>
    </div>
    
    <div class="toolbar">
      <div class="breadcrumb" id="breadcrumb">/</div>
      <button class="btn btn-sm btn-primary" onclick="refresh()">刷新</button>
      <button class="btn btn-sm btn-success" onclick="showNewFolder()">新建文件夹</button>
      <button class="btn btn-sm btn-success" onclick="showNewFile()">新建文件</button>
      <button class="btn btn-sm btn-primary" onclick="showUpload()">上传</button>
    </div>
    
    <div class="file-manager">
      <div class="file-header">
        <div></div><div>文件名</div><div>大小</div><div>修改时间</div><div>操作</div>
      </div>
      <div id="file-list"><div class="loading">请先配置 API...</div></div>
    </div>
  </div>

  <div class="modal" id="editor-modal">
    <div class="modal-content">
      <h3>📝 编辑文件: <span id="edit-filename"></span></h3>
      <textarea class="editor" id="editor"></textarea>
      <div style="margin-top:15px;display:flex;gap:10px;">
        <button class="btn btn-primary" onclick="saveFile()">保存</button>
        <button class="btn" onclick="closeEditor()">取消</button>
      </div>
    </div>
  </div>

  <div class="modal" id="input-modal">
    <div class="modal-content">
      <h3 id="input-title">输入</h3>
      <input type="text" id="input-value" style="width:100%;padding:10px;margin:10px 0;background:#0f0f23;border:1px solid #333;color:#fff;border-radius:5px;">
      <div style="display:flex;gap:10px;">
        <button class="btn btn-primary" id="input-confirm">确定</button>
        <button class="btn" onclick="closeInput()">取消</button>
      </div>
    </div>
  </div>

  <div class="modal" id="upload-modal">
    <div class="modal-content">
      <h3>📤 上传文件</h3>
      <input type="file" id="upload-file" multiple style="margin:15px 0;">
      <div style="display:flex;gap:10px;">
        <button class="btn btn-primary" onclick="doUpload()">上传</button>
        <button class="btn" onclick="closeUpload()">取消</button>
      </div>
      <p id="upload-status" style="margin-top:10px;color:#888;"></p>
    </div>
  </div>

<script>
let currentPath = '/';
let config = JSON.parse(localStorage.getItem('ptero_config') || '{}');

function loadConfig() {
  document.getElementById('api-url').value = config.apiUrl || '';
  document.getElementById('server-id').value = config.serverId || '';
  document.getElementById('api-key').value = config.apiKey || '';
  if (config.apiUrl && config.apiKey) { refresh(); fetchStatus(); }
}

function saveConfig() {
  config = {
    apiUrl: document.getElementById('api-url').value.replace(/\\/$/, ''),
    serverId: document.getElementById('server-id').value,
    apiKey: document.getElementById('api-key').value
  };
  localStorage.setItem('ptero_config', JSON.stringify(config));
  refresh(); fetchStatus();
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-API-URL': config.apiUrl,
    'X-API-Key': config.apiKey,
    'X-Server-ID': config.serverId
  };
}

async function fetchStatus() {
  try {
    const res = await fetch('/api/resources', { headers: getHeaders() });
    const data = await res.json();
    const attr = data.attributes || {};
    const state = attr.current_state || 'unknown';
    document.getElementById('status-dot').className = 'status-dot ' + (state === 'running' ? 'online' : state === 'offline' ? 'offline' : 'unknown');
    document.getElementById('status-text').textContent = state;
    document.getElementById('cpu-usage').textContent = (attr.resources?.cpu_absolute || 0).toFixed(1) + '%';
    document.getElementById('mem-usage').textContent = formatSize(attr.resources?.memory_bytes || 0);
  } catch(e) {}
}

async function powerAction(action) {
  await fetch('/api/power', { method: 'POST', headers: getHeaders(), body: JSON.stringify({ signal: action }) });
  setTimeout(fetchStatus, 2000);
}

async function refresh() {
  const el = document.getElementById('file-list');
  el.innerHTML = '<div class="loading">加载中...</div>';
  try {
    const res = await fetch('/api/files/list?directory=' + encodeURIComponent(currentPath), { headers: getHeaders() });
    const data = await res.json();
    if (data.error) { el.innerHTML = '<div class="loading">' + data.error + '</div>'; return; }
    renderFiles(data.data || []);
    renderBreadcrumb();
  } catch(e) { el.innerHTML = '<div class="loading">加载失败: ' + e.message + '</div>'; }
}

function renderBreadcrumb() {
  const parts = currentPath.split('/').filter(Boolean);
  let html = '<span onclick="navigate(\\'/\\')">根目录</span>';
  let path = '';
  for (const p of parts) {
    path += '/' + p;
    html += ' / <span onclick="navigate(\\'' + path + '\\')">' + p + '</span>';
  }
  document.getElementById('breadcrumb').innerHTML = html;
}

function renderFiles(files) {
  const el = document.getElementById('file-list');
  if (!files.length) { el.innerHTML = '<div class="loading">空文件夹</div>'; return; }
  
  files.sort(function(a, b) {
    if (a.attributes.is_file !== b.attributes.is_file) return a.attributes.is_file ? 1 : -1;
    return a.attributes.name.localeCompare(b.attributes.name);
  });
  
  el.innerHTML = files.map(function(f) {
    var a = f.attributes;
    var isFile = a.is_file;
    var icon = isFile ? '📄' : '📁';
    var size = isFile ? formatSize(a.size) : '-';
    var time = new Date(a.modified_at).toLocaleString();
    var name = a.name;
    var fullPath = currentPath === '/' ? '/' + name : currentPath + '/' + name;
    var escapedPath = fullPath.replace(/'/g, "\\\\'");
    
    var actions = '';
    if (isFile) {
      actions += '<button class="btn btn-sm btn-primary" onclick="editFile(\\'' + escapedPath + '\\')">编辑</button>';
      actions += '<button class="btn btn-sm btn-success" onclick="downloadFile(\\'' + escapedPath + '\\')">下载</button>';
    }
    actions += '<button class="btn btn-sm btn-warning" onclick="renameItem(\\'' + escapedPath + '\\')">重命名</button>';
    actions += '<button class="btn btn-sm btn-danger" onclick="deleteItem(\\'' + escapedPath + '\\', ' + (!isFile) + ')">删除</button>';
    
    return '<div class="file-item">' +
      '<div class="file-icon">' + icon + '</div>' +
      '<div class="file-name" onclick="' + (isFile ? 'editFile' : 'navigate') + '(\\'' + escapedPath + '\\')">' + name + '</div>' +
      '<div>' + size + '</div>' +
      '<div>' + time + '</div>' +
      '<div class="file-actions">' + actions + '</div>' +
    '</div>';
  }).join('');
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
  if (bytes < 1024*1024*1024) return (bytes/1024/1024).toFixed(1) + ' MB';
  return (bytes/1024/1024/1024).toFixed(1) + ' GB';
}

function navigate(path) { currentPath = path; refresh(); }

async function editFile(path) {
  document.getElementById('edit-filename').textContent = path.split('/').pop();
  document.getElementById('editor').value = '加载中...';
  document.getElementById('editor-modal').classList.add('show');
  document.getElementById('editor').dataset.path = path;
  
  var res = await fetch('/api/files/contents?file=' + encodeURIComponent(path), { headers: getHeaders() });
  document.getElementById('editor').value = await res.text();
}

async function saveFile() {
  var path = document.getElementById('editor').dataset.path;
  var content = document.getElementById('editor').value;
  await fetch('/api/files/write?file=' + encodeURIComponent(path), {
    method: 'POST', headers: getHeaders(), body: content
  });
  closeEditor(); refresh();
}

function closeEditor() { document.getElementById('editor-modal').classList.remove('show'); }

async function downloadFile(path) {
  var res = await fetch('/api/files/download?file=' + encodeURIComponent(path), { headers: getHeaders() });
  var data = await res.json();
  if (data.attributes && data.attributes.url) window.open(data.attributes.url);
}

function showInput(title, callback) {
  document.getElementById('input-title').textContent = title;
  document.getElementById('input-value').value = '';
  document.getElementById('input-modal').classList.add('show');
  document.getElementById('input-confirm').onclick = function() { callback(document.getElementById('input-value').value); closeInput(); };
}

function closeInput() { document.getElementById('input-modal').classList.remove('show'); }

function showNewFolder() {
  showInput('新建文件夹', async function(name) {
    if (!name) return;
    await fetch('/api/files/create-folder', {
      method: 'POST', headers: getHeaders(),
      body: JSON.stringify({ root: currentPath, name: name })
    });
    refresh();
  });
}

function showNewFile() {
  showInput('新建文件名', async function(name) {
    if (!name) return;
    var path = currentPath === '/' ? '/' + name : currentPath + '/' + name;
    await fetch('/api/files/write?file=' + encodeURIComponent(path), {
      method: 'POST', headers: getHeaders(), body: ''
    });
    refresh();
  });
}

function renameItem(path) {
  var oldName = path.split('/').pop();
  showInput('重命名 ' + oldName, async function(newName) {
    if (!newName || newName === oldName) return;
    await fetch('/api/files/rename', {
      method: 'POST', headers: getHeaders(),
      body: JSON.stringify({ root: currentPath, files: [{ from: oldName, to: newName }] })
    });
    refresh();
  });
  document.getElementById('input-value').value = oldName;
}

async function deleteItem(path, isFolder) {
  if (!confirm('确定删除 ' + path + '？')) return;
  var name = path.split('/').pop();
  await fetch('/api/files/delete', {
    method: 'POST', headers: getHeaders(),
    body: JSON.stringify({ root: currentPath, files: [name] })
  });
  refresh();
}

function showUpload() { document.getElementById('upload-modal').classList.add('show'); }
function closeUpload() { document.getElementById('upload-modal').classList.remove('show'); document.getElementById('upload-status').textContent = ''; }

async function doUpload() {
  var files = document.getElementById('upload-file').files;
  if (!files.length) return;
  
  document.getElementById('upload-status').textContent = '获取上传地址...';
  var res = await fetch('/api/files/upload', { headers: getHeaders() });
  var data = await res.json();
  var uploadUrl = data.attributes ? data.attributes.url : null;
  if (!uploadUrl) { document.getElementById('upload-status').textContent = '获取上传地址失败'; return; }
  
  var formData = new FormData();
  for (var i = 0; i < files.length; i++) formData.append('files', files[i]);
  
  document.getElementById('upload-status').textContent = '上传中...';
  await fetch(uploadUrl + '&directory=' + encodeURIComponent(currentPath), { method: 'POST', body: formData });
  document.getElementById('upload-status').textContent = '上传完成！';
  setTimeout(function() { closeUpload(); refresh(); }, 1000);
}

loadConfig();
setInterval(fetchStatus, 30000);
</script>
</body>
</html>`;
