import './styles/screenpop.css';
import { screenpopMarkup } from './ui/template';
import { createScreenpopRuntime } from './runtime/screenpop-runtime';
import { createGangerStub } from './runtime/stubs/ganger-client';
import { initScreenpopUI } from './runtime/legacy/screenpop-ui';
import { initScreenpopLogic } from './runtime/legacy/screenpop-logic';
import { initScreenpopMock } from './runtime/legacy/screenpop-mock';
import { initScreenpopTesting } from './runtime/legacy/screenpop-testing';

const root = document.getElementById('app');

if (!root) {
  throw new Error('Screenpop root element not found');
}

root.innerHTML = screenpopMarkup();

initScreenpopUI();
initScreenpopLogic();
initScreenpopTesting();

let enableMock = true;
try {
  const url = new URL(window.location.href);
  if (url.searchParams.get('mock') === '0') {
    enableMock = false;
  }
} catch {
  // ignore malformed URLs in dev environments
}

if (enableMock) {
  initScreenpopMock();
}

const runtime = createScreenpopRuntime({
  host: window,
  integrations: {
    ganger: createGangerStub()
  }
});

runtime.boot();
