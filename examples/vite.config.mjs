import { defineConfig } from 'vite';
import { resolve } from 'path';

const entries = { main: 'index.html' };
['01-helloworld', '02-gps-and-sensors', '03-api-communication', 'devorient'].forEach ( example => {
    entries[example] = resolve(__dirname, `${example}/index.html`);
});

export default defineConfig({
    base: '/locar.js',
    build: {
        outDir: '../docs',
        rollupOptions: {
            input: entries 
        }
    }
});
