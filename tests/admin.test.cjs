const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const yaml = require('../source/admin/vendor/js-yaml.min.js');
const marked = require('../source/admin/vendor/marked.min.js');
const { JSDOM } = require('jsdom');
const previewWindow = new JSDOM('').window;
const DOMPurify = require('../source/admin/vendor/purify.min.js')(previewWindow);

const html = fs.readFileSync(path.join(__dirname, '../source/admin/index.html'), 'utf8');
const script = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].at(-1)[1]
  .replace('if (token) connect({ restore: true });', `
    globalThis.admin = { resetEditor, fillEditor, parseMarkdown, makeMarkdown, publish, connect,
      shanghaiDate, toLocalDate, renderMarkdown, state: () => ({ current, busy }) };
    if (token) globalThis.restoring = connect({ restore: true });`);

function setup({ savedToken = '', reject = () => false } = {}) {
  const elements = new Map([...html.matchAll(/id="([^"]+)"/g)].map(([, id]) => {
    const classes = new Set(['hidden']);
    return [id, { value: '', textContent: '', innerHTML: '', disabled: false,
      classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name), contains: (name) => classes.has(name) },
      addEventListener() {}, focus() {} }];
  }));
  const storage = new Map(savedToken ? [['izumiiii_blog_admin_token', savedToken]] : []);
  const files = new Map();
  const calls = [];
  let serial = 0;
  let pendingTree;
  let pendingBlob;
  const response = (value, status = 200) => ({ ok: status < 400, status, json: async () => value });
  const context = vm.createContext({
    document: { getElementById: (id) => elements.get(id), querySelectorAll: (selector) => selector === '.post-item' ? [] : [...elements.values()],
      createElement: previewWindow.document.createElement.bind(previewWindow.document) },
    sessionStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) },
    TextEncoder, TextDecoder, btoa, atob, AbortController, setTimeout, clearTimeout, Intl, Date, URL, jsyaml: yaml, marked, DOMPurify,
    confirm: () => true, location: { reload() {} },
    fetch: async (url, options) => {
      const parsed = new URL(url);
      const route = parsed.pathname.replace('/repos/Izumi-iii/Izumi-iii-blog', '');
      const method = options.method || 'GET';
      const body = options.body ? JSON.parse(options.body) : null;
      calls.push({ route, method, body, headers: options.headers });
      const failure = reject({ route, method, body });
      if (failure) return response({ message: 'Simulated failure' }, failure);
      if (!route) return response({});
      if (route === '/contents/source/_posts') return response([...files].map(([name, file]) => ({ name, sha: file.sha, type: 'file' })));
      if (route.startsWith('/contents/')) {
        const name = decodeURIComponent(route.split('/').pop());
        const file = files.get(name);
        if (method === 'GET') return file ? response({ name, sha: file.sha, content: Buffer.from(file.markdown).toString('base64') }) : response({}, 404);
        if (method === 'PUT') {
          if (file ? body.sha !== file.sha : !!body.sha) return response({}, 409);
          const sha = `blob-${++serial}`;
          files.set(name, { sha, markdown: Buffer.from(body.content, 'base64').toString('utf8') });
          return response({ content: { name, sha } });
        }
      }
      if (route === '/git/ref/heads/main') return response({ object: { sha: 'head' } });
      if (route === '/git/commits/head') return response({ tree: { sha: 'base-tree' } });
      if (route === '/git/blobs') { pendingBlob = { sha: `blob-${++serial}`, markdown: body.content }; return response({ sha: pendingBlob.sha }); }
      if (route === '/git/trees') { pendingTree = body; return response({ sha: 'new-tree' }); }
      if (route === '/git/commits') return response({ sha: 'new-commit' });
      if (route === '/git/refs/heads/main') {
        assert.equal(body.force, false);
        assert.equal(pendingTree.base_tree, 'base-tree');
        for (const entry of pendingTree.tree) {
          const name = entry.path.split('/').pop();
          if (entry.sha === null) files.delete(name);
          else files.set(name, pendingBlob);
        }
        return response({});
      }
      throw new Error(`Unexpected request: ${method} ${route}`);
    }
  });
  vm.runInContext(script, context);
  return { admin: context.admin, restoring: context.restoring, elements, storage, files, calls,
    set: (id, value) => { elements.get(id).value = value; } };
}

const markdown = '---\ntitle: 原文\ndate: 2026-10-13 19:12:34\ntags: [Swift, macOS]\ncategories: [技术, macOS]\ncover: /images/cover.png\ndescription: |\n  第一行\n  第二行\ncustom:\n  enabled: false\n  weight: 0\n---\n\n原正文\n';
function openExisting(env, name = 'old.md') {
  env.files.set(name, { sha: 'original', markdown });
  env.admin.fillEditor({ name, sha: 'original' }, markdown);
}

test('new article can be saved repeatedly with the latest SHA', async () => {
  const env = setup();
  env.admin.resetEditor();
  env.set('titleInput', '新文章');
  env.set('bodyInput', '第一版');
  await env.admin.publish();
  const firstSha = env.admin.state().current.sha;
  env.set('bodyInput', '第二版');
  await env.admin.publish();
  assert.notEqual(env.admin.state().current.sha, firstSha);
  assert.equal(env.calls.filter((c) => c.method === 'PUT')[1].body.sha, firstSha);
  assert.match(env.files.get('新文章.md').markdown, /第二版/);
});

test('existing article saves twice without losing metadata or date seconds', async () => {
  const env = setup();
  openExisting(env);
  const before = env.admin.parseMarkdown(markdown).metadata;
  env.set('bodyInput', '修改正文');
  await env.admin.publish();
  env.set('bodyInput', '再次修改');
  await env.admin.publish();
  assert.deepEqual(env.admin.parseMarkdown(env.files.get('old.md').markdown).metadata, before);
  assert.equal(env.elements.get('editorError').textContent, '');
});

test('editing selected metadata preserves nested fields and handles Chinese commas', () => {
  const env = setup();
  openExisting(env);
  env.set('titleInput', '包含 "引号" 和 : 的标题');
  env.set('tagsInput', '算法，链表, Swift');
  env.set('categoryInput', '');
  const front = env.admin.parseMarkdown(env.admin.makeMarkdown()).metadata;
  assert.equal(front.title, '包含 "引号" 和 : 的标题');
  assert.deepEqual(front.tags, ['算法', '链表', 'Swift']);
  assert.equal(front.categories, undefined);
  assert.deepEqual(front.custom, { enabled: false, weight: 0 });
  assert.equal(front.description, '第一行\n第二行\n');
});

test('dates use Shanghai time and retain original offset when unchanged', () => {
  const env = setup();
  assert.equal(env.admin.shanghaiDate(new Date('2026-10-13T11:42:00Z')), '2026-10-13T19:42');
  assert.equal(env.admin.toLocalDate('2026-10-13 19:42:34'), '2026-10-13T19:42');
  assert.equal(env.admin.toLocalDate('2026-10-13T11:42:34Z'), '2026-10-13T19:42');
  env.admin.fillEditor({ name: 'old.md', sha: 'original' }, markdown.replace('2026-10-13 19:12:34', '2026-10-13T11:12:34Z'));
  assert.equal(env.admin.parseMarkdown(env.admin.makeMarkdown()).date, '2026-10-13T11:12:34Z');
  env.set('dateInput', '2026-10-14T08:00');
  assert.equal(env.admin.parseMarkdown(env.admin.makeMarkdown()).date, '2026-10-14 08:00:00');
});

test('refresh restores the session token with an empty login input', async () => {
  const env = setup({ savedToken: 'test-token' });
  await env.restoring;
  assert.equal(env.calls[0].headers.Authorization, 'Bearer test-token');
  assert.equal(env.elements.get('appView').classList.contains('hidden'), false);
  assert.equal(env.elements.get('tokenInput').value, '');
});

test('failed restoration returns to login and clears only invalid credentials', async () => {
  for (const status of [401, 503]) {
    const env = setup({ savedToken: 'test-token', reject: () => status });
    await env.restoring;
    assert.equal(env.elements.get('appView').classList.contains('hidden'), true);
    assert.equal(env.elements.get('loginView').classList.contains('hidden'), false);
    assert.equal(env.storage.has('izumiiii_blog_admin_token'), status !== 401);
    assert.equal(env.admin.state().busy, false);
  }
});

test('renaming a Chinese filename is atomic and supports a subsequent save', async () => {
  const env = setup();
  openExisting(env, '旧文章.md');
  env.set('slugInput', '新文章');
  await env.admin.publish();
  assert.equal(env.files.has('旧文章.md'), false);
  assert.equal(env.files.has('新文章.md'), true);
  assert.equal(env.calls.some((c) => c.method === 'DELETE'), false);
  env.set('bodyInput', '重命名后继续编辑');
  await env.admin.publish();
  assert.match(env.files.get('新文章.md').markdown, /重命名后继续编辑/);
});

test('failed rename, destination collision and stale source preserve the original', async () => {
  for (const scenario of ['tree failure', 'ref conflict', 'collision', 'stale source']) {
    const env = setup({ reject: ({ route }) => scenario === 'tree failure' && route === '/git/trees' ? 503 : scenario === 'ref conflict' && route === '/git/refs/heads/main' ? 422 : false });
    openExisting(env);
    if (scenario === 'collision') env.files.set('new.md', { sha: 'other', markdown: '其他文章' });
    if (scenario === 'stale source') env.files.get('old.md').sha = 'external-change';
    env.set('slugInput', 'new');
    await env.admin.publish();
    assert.equal(env.files.get('old.md').markdown, markdown);
    assert.equal(env.admin.state().current.name, 'old.md');
    assert.ok(env.elements.get('editorError').textContent);
    assert.equal(env.admin.state().busy, false);
    if (scenario === 'collision') assert.equal(env.files.get('new.md').markdown, '其他文章');
    else assert.equal(env.files.has('new.md'), false);
  }
});

test('double click submits once; list refresh failure retains successful save state', async () => {
  const env = setup({ reject: ({ route }) => route === '/contents/source/_posts' ? 503 : false });
  openExisting(env);
  await Promise.all([env.admin.publish(), env.admin.publish()]);
  assert.equal(env.calls.filter((c) => c.method === 'PUT').length, 1);
  assert.notEqual(env.admin.state().current.sha, 'original');
  assert.match(env.elements.get('editorError').textContent, /文章已保存/);
  await env.admin.publish();
  assert.equal(env.calls.filter((c) => c.method === 'PUT').length, 2);
});

test('ordinary save conflicts and duplicate new filenames never overwrite remote content', async () => {
  for (const existing of [true, false]) {
    const env = setup();
    if (existing) {
      openExisting(env);
      env.files.set('old.md', { sha: 'external-sha', markdown: '远程的新版本' });
    } else {
      env.admin.resetEditor();
      env.set('titleInput', 'old');
      env.files.set('old.md', { sha: 'external-sha', markdown: '远程的新版本' });
    }
    env.set('bodyInput', '我的未保存正文');
    await env.admin.publish();
    assert.equal(env.files.get('old.md').markdown, '远程的新版本');
    assert.equal(env.elements.get('bodyInput').value, '我的未保存正文');
    assert.match(env.elements.get('editorError').textContent, /冲突/);
    assert.equal(env.elements.get('publishButton').disabled, false);
  }
});

test('malformed YAML does not replace the current editor; CRLF posts round-trip', () => {
  const env = setup();
  openExisting(env);
  assert.throws(() => env.admin.fillEditor({ name: 'broken.md' }, '---\ntitle: [broken\n---\nbody'));
  assert.equal(env.admin.state().current.name, 'old.md');
  assert.throws(() => env.admin.parseMarkdown('---\ntitle: incomplete'));
  assert.throws(() => env.admin.parseMarkdown('---\n- invalid\n---\nbody'));
  assert.equal(env.admin.parseMarkdown(markdown.replace(/\n/g, '\r\n')).title, '原文');
});

test('all repository posts retain their complete metadata on body-only edits', () => {
  const env = setup();
  const dir = path.join(__dirname, '../source/_posts');
  for (const name of fs.readdirSync(dir).filter((name) => name.endsWith('.md'))) {
    const source = fs.readFileSync(path.join(dir, name), 'utf8');
    const before = env.admin.parseMarkdown(source).metadata;
    env.admin.fillEditor({ name, sha: 'original' }, source);
    env.set('bodyInput', `${env.elements.get('bodyInput').value}\n追加内容`);
    assert.deepEqual(env.admin.parseMarkdown(env.admin.makeMarkdown()).metadata, before, name);
  }
});

test('preview renders tables, nested lists, quotes, tasks, code and all heading levels', () => {
  const env = setup();
  const source = '# 标题\n\n正文 **加粗**、*斜体*、~~删除~~ 和 `代码`。\n下一行\n\n> 引用\n\n1. 第一步\n   - 嵌套项目\n2. 第二步\n\n- [x] 已完成\n- [ ] 未完成\n\n| 列一 | 列二 |\n| --- | --- |\n| A | B |\n\n```swift\nlet x = "<script>"\n```\n\n#### 四级\n\n##### 五级\n\n###### 六级\n';
  const doc = new JSDOM(env.admin.renderMarkdown(source)).window.document;
  assert.equal(doc.querySelector('table tbody td').textContent, 'A');
  assert.equal(doc.querySelector('blockquote').textContent.trim(), '引用');
  assert.equal(doc.querySelector('ol ul li').textContent, '嵌套项目');
  assert.equal(doc.querySelectorAll('input[type="checkbox"]').length, 2);
  assert.equal(doc.querySelector('input').checked, true);
  assert.equal(doc.querySelector('input').disabled, true);
  assert.equal(doc.querySelector('pre code').textContent.trim(), 'let x = "<script>"');
  assert.ok(doc.querySelector('pre code.language-swift'));
  assert.ok(doc.querySelector('p br'));
  for (const selector of ['strong', 'em', 'del', 'h4', 'h5', 'h6']) assert.ok(doc.querySelector(selector), selector);
});

test('preview scopes heading anchors, preserves duplicate IDs and resolves root-relative assets', () => {
  const env = setup();
  const doc = new JSDOM(env.admin.renderMarkdown('# 标题\n\n[目录](#标题)\n\n# 标题\n\n![示意图](images/posts/example.png)\n\n[文章](archives/)\n\n[GitHub](https://github.com/Izumi-iii)')).window.document;
  assert.deepEqual([...doc.querySelectorAll('h1')].map((h) => h.id), ['preview-标题', 'preview-标题-1']);
  assert.equal(doc.querySelector('a').getAttribute('href'), '#preview-标题');
  assert.equal(doc.querySelector('a').hasAttribute('target'), false);
  assert.equal(doc.querySelector('img').getAttribute('src'), '/images/posts/example.png');
  const external = [...doc.querySelectorAll('a')].at(-1);
  assert.equal(external.target, '_blank');
  assert.equal(external.rel, 'noopener noreferrer');
  assert.equal(doc.querySelector('a[href="/archives/"]').target, '_blank');
});

test('preview removes executable HTML and links while retaining safe HTML and code literals', () => {
  const env = setup();
  const source = '<script>alert(1)</script>\n\n<img src="/image.png" onerror="alert(1)">\n\n<a href="javascript:alert(1)">危险链接</a>\n\n[危险 Markdown](javascript:alert%281%29)\n\n<iframe src="https://example.com"></iframe>\n\n<form><input name="tokenInput"></form>\n\n<h2 id="tokenInput" style="position:fixed">安全标题</h2>\n\n<details><summary>展开</summary>内容</details>\n\n```html\n<script>alert(1)</script>\n```';
  const doc = new JSDOM(env.admin.renderMarkdown(source)).window.document;
  assert.equal(doc.querySelector('script, iframe, form, input, [onerror], [style], #tokenInput'), null);
  assert.equal(doc.querySelector('a[href^="javascript:"]'), null);
  assert.equal(doc.querySelector('pre code').textContent.trim(), '<script>alert(1)</script>');
  assert.equal(doc.querySelector('details summary').textContent, '展开');
  assert.equal(doc.querySelector('h2').id, 'preview-安全标题');
});
