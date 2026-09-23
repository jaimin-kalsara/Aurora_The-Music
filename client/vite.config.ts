import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Dev-only helper: when the page is opened with `?rafshim`, requestAnimationFrame is
 * backed by timers so animations still complete in headless/hidden previews where the
 * browser suspends rAF. Never included in production builds.
 */
const rafShim: Plugin = {
  name: 'aurora-raf-shim',
  apply: 'serve',
  transformIndexHtml() {
    return [
      {
        tag: 'script',
        injectTo: 'head-prepend',
        children:
          "if(new URLSearchParams(location.search).has('rafshim')){var __q={},__n=0,__ch=new MessageChannel();__ch.port1.onmessage=function(e){var cb=__q[e.data];delete __q[e.data];if(cb)cb(performance.now())};window.requestAnimationFrame=function(cb){var id=++__n;__q[id]=cb;__ch.port2.postMessage(id);return id};window.cancelAnimationFrame=function(id){delete __q[id]};}",
      },
    ];
  },
};

export default defineConfig({
  plugins: [react(), rafShim],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
  },
});
