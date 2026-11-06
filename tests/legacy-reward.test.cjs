const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const localId = 'synthetic-ui-member';
const taskSource = ts.transpileModule(fs.readFileSync('services/daily-task-service.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function createBrowserTaskService(data) {
  const storage = {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key),
    key: index => [...data.keys()][index] ?? null,
    get length() { return data.size; },
  };
  const module = { exports: {} };
  vm.runInNewContext(taskSource, {
    module,
    exports: module.exports,
    require: name => name === '../lib/user-utils' ? { getUserId: () => localId } : require(name),
    window: { localStorage: storage },
    localStorage: storage,
    Date,
    Math,
  });
  return module.exports;
}

test('paused daily reward never invents points or claimed status after local progress', () => {
  const service = createBrowserTaskService(new Map());
  const task = service.getAllTasks()[0];
  const before = service.getTaskStats().totalPoints;
  service.updateTaskProgress(task.id, task.target);
  assert.equal(service.getTaskStats().totalPoints, before);
  assert.equal(service.claimReward(task.id), false);
  assert.notEqual(service.getAllTasks().find(item => item.id === task.id).status, 'claimed');
});

test('opening tasks preserves pre-upgrade browser history and other local records', () => {
  const today = new Date().toISOString();
  const taskKey = 'jinxi-tasks-' + localId + '-daily-message';
  const oldProgress = JSON.stringify({ userId: localId, taskId: 'daily-message', progress: 1, status: 'claimed', lastUpdated: today });
  const entries = [
    ['jinxi-task-schema-version', 'older-browser-version'],
    ['jinxi-task-last-reset', today],
    [taskKey, oldProgress],
    ['jinxi-task-stats-' + localId, JSON.stringify({ totalPoints: 81, badges: ['Synthetic local badge'] })],
    ['jinxi-task-stats-other-browser-profile', JSON.stringify({ totalPoints: 42 })],
  ];
  const data = new Map(entries);
  const service = createBrowserTaskService(data);
  assert.equal(service.getAllTasks().find(task => task.id === 'daily-message').status, 'claimed');
  assert.equal(service.getTaskStats().totalPoints, 81);
  assert.equal(service.claimReward('daily-message'), false);
  assert.deepEqual([...data.entries()], entries);
});
