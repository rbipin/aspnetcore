// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

import { WebAssemblyResourceLoader } from '../WebAssemblyResourceLoader';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const currentBrowserIsChrome = (window as any).chrome
  && navigator.userAgent.indexOf('Edge') < 0; // Edge pretends to be Chrome

let hasReferencedPdbs = false;
let debugBuild = false;

export function hasDebuggingEnabled(): boolean {
  return (hasReferencedPdbs || debugBuild) && currentBrowserIsChrome;
}

export function attachDebuggerHotkey(resourceLoader: WebAssemblyResourceLoader): void {
  hasReferencedPdbs = !!resourceLoader.bootConfig.resources.pdb;
  debugBuild = resourceLoader.bootConfig.debugBuild;
  // Use the combination shift+alt+D because it isn't used by the major browsers
  // for anything else by default
  const altKeyName = navigator.platform.match(/^Mac/i) ? 'Cmd' : 'Alt';
  if (hasDebuggingEnabled()) {
    console.info(`Debugging hotkey: Shift+${altKeyName}+D (when application has focus)`);
  }

  // Even if debugging isn't enabled, we register the hotkey so we can report why it's not enabled
  document.addEventListener('keydown', evt => {
    if (evt.shiftKey && (evt.metaKey || evt.altKey) && evt.code === 'KeyD') {
      if (!debugBuild && !hasReferencedPdbs) {
        console.error('Cannot start debugging, because the application was not compiled with debugging enabled.');
      } else if (!currentBrowserIsChrome) {
        console.error('Currently, only Microsoft Edge (80+), or Google Chrome, are supported for debugging.');
      } else {
        launchDebugger();
      }
    }
  });
}

function launchDebugger() {
  // The noopener flag is essential, because otherwise Chrome tracks the association with the
  // parent tab, and then when the parent tab pauses in the debugger, the child tab does so
  // too (even if it's since navigated to a different page). This means that the debugger
  // itself freezes, and not just the page being debugged.
  //
  // We have to construct a link element and simulate a click on it, because the more obvious
  // window.open(..., 'noopener') always opens a new window instead of a new tab.
  const link = document.createElement('a');
  link.href = `_framework/debug?url=${encodeURIComponent(location.href)}`;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.click();
}
