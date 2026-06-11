// 默认配置
const defaultConfig = {
  domains: {} // 结构: { "domain.com": { enabled: true, headers: ["Auth", "X-Test"] } }
};

let currentConfig = JSON.parse(JSON.stringify(defaultConfig));

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  bindGlobalEvents();
});

// 1. 加载配置
function loadConfig() {
  chrome.storage.local.get(['crossRequestConfig'], (result) => {
    if (result.crossRequestConfig && result.crossRequestConfig.domains) {
      currentConfig = result.crossRequestConfig;
    }
    renderAll();
  });
}

// 2. 保存配置
function saveConfig() {
  chrome.storage.local.set({ crossRequestConfig: currentConfig }, () => {
    console.log('配置已保存');
  });
}

// 3. 渲染所有域名卡片
function renderAll() {
  const container = document.getElementById('domainListContainer');
  const domains = Object.keys(currentConfig.domains);

  if (domains.length === 0) {
    container.innerHTML = '<div style="text-align:center; color:#9ca3af; padding:20px;">暂无域名，请在上方添加</div>';
    return;
  }

  container.innerHTML = domains.map(domain => {
    const domainData = currentConfig.domains[domain];
    const headers = domainData.headers || [];
    const inputId = `header-input-${domain.replace(/[^a-zA-Z0-9]/g, '_')}`;

    return `
      <div class="domain-card">
        <div class="domain-header">
          <span class="domain-name">🌐 ${domain}</span>
          <button class="btn-danger btn-small btn-delete-domain" data-domain="${domain}">删除域名</button>
        </div>
        <div class="domain-body">
          <div class="header-tags" id="tags-${domain.replace(/[^a-zA-Z0-9]/g, '_')}">
            ${headers.length > 0
        ? headers.map(h => `
                  <span class="tag">
                    ${h}
                    <span class="tag-remove btn-remove-header" data-domain="${domain}" data-header="${h}">×</span>
                  </span>
                `).join('')
        : '<span class="empty-tip">暂无捕获规则，将在下方添加</span>'
    }
          </div>
          
          <div class="input-group">
            <input type="text" 
                   class="header-input" 
                   id="${inputId}" 
                   placeholder="输入 Header 名称 (如 Authorization)" 
                   data-domain="${domain}">
            <button class="btn-primary btn-small btn-add-header" data-domain="${domain}">添加 Header</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // 渲染后绑定动态事件
  bindDynamicEvents();
}

// 4. 绑定静态事件 (页面加载时只执行一次)
function bindGlobalEvents() {
  // 添加域名
  document.getElementById('addDomainBtn').addEventListener('click', () => {
    const input = document.getElementById('newDomainInput');
    const domain = input.value.trim();
    if (domain) {
      if (!currentConfig.domains[domain]) {
        currentConfig.domains[domain] = { enabled: true, headers: [] };
        saveConfig();
        renderAll();
      } else {
        alert('该域名已存在');
      }
      input.value = '';
    }
  });

  // 导出
  document.getElementById('exportBtn').addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentConfig));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = "cross_request_config.json";
    a.click();
  });

  // 导入
  document.getElementById('importBtn').addEventListener('click', () => document.getElementById('fileInput').click());
  document.getElementById('fileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        currentConfig = JSON.parse(event.target.result);
        saveConfig();
        renderAll();
      } catch (err) { alert('JSON 格式错误'); }
    };
    reader.readAsText(file);
  });

  // 清空
  document.getElementById('clearBtn').addEventListener('click', () => {
    if (confirm('确定清空所有配置吗？')) {
      currentConfig = JSON.parse(JSON.stringify(defaultConfig));
      saveConfig();
      renderAll();
    }
  });
}

// 5. 绑定动态事件 (每次渲染后执行)
function bindDynamicEvents() {
  // 删除域名
  document.querySelectorAll('.btn-delete-domain').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const domain = e.target.dataset.domain;
      if (confirm(`确定删除域名 ${domain} 及其所有规则吗？`)) {
        delete currentConfig.domains[domain];
        saveConfig();
        renderAll();
      }
    });
  });

  // 添加 Header (点击按钮)
  document.querySelectorAll('.btn-add-header').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const domain = e.target.dataset.domain;
      const inputId = `header-input-${domain.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const input = document.getElementById(inputId);
      const header = input.value.trim();

      if (header) {
        if (!currentConfig.domains[domain].headers.includes(header)) {
          currentConfig.domains[domain].headers.push(header);
          saveConfig();
          renderAll(); // 重新渲染以更新列表
        } else {
          alert('该 Header 已存在');
        }
      }
    });
  });

  // 添加 Header (回车键)
  document.querySelectorAll('.header-input').forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        // 找到同级的添加按钮并触发点击
        const btn = e.target.nextElementSibling;
        if (btn) btn.click();
      }
    });
  });

  // 删除 Header
  document.querySelectorAll('.btn-remove-header').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const domain = e.target.dataset.domain;
      const header = e.target.dataset.header;
      currentConfig.domains[domain].headers = currentConfig.domains[domain].headers.filter(h => h !== header);
      saveConfig();
      renderAll();
    });
  });
}