import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
    plugins: [
        dts({
            include: ['lib/**/*.ts'],
            exclude: ['lib/**/*.test.ts', 'lib/**/*.spec.ts'],
            outDir: 'dist',
            rollupTypes: true,
            entryRoot: 'lib',
        }),
    ],
    build: {
        lib: {
            entry: resolve(__dirname, 'lib/three/main.ts'),
            name: 'locar',
            fileName: format => `locar.${format}.js`
        },
        rollupOptions: {
            external: ['three'],
            output: {
                globals: {
                    three: 'THREE'
                }
            }
        }
    }
});