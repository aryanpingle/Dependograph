const esbuild = require("esbuild");
const polyfill = require("@esbuild-plugins/node-globals-polyfill");

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

async function main() {
    const contexts = [];
    // Build the extension code
    contexts.push(
        await esbuild.context({
            entryPoints: ["src/extension.ts"],
            bundle: true,
            format: "cjs",
            minify: production,
            sourcemap: !production,
            sourcesContent: false,
            platform: "node",
            outdir: "out",
            external: ["vscode"],
            logLevel: "silent",
            plugins: [
                /* add to the end of plugins array */
                esbuildProblemMatcherPlugin,
            ],
            allowOverwrite: true,
        }),
    );
    contexts.push(
        await esbuild.context({
            entryPoints: ["src/extension.ts"],
            bundle: true,
            format: "cjs",
            minify: production,
            sourcemap: !production,
            sourcesContent: false,
            platform: "browser",
            outfile: "out/extension-web.js",
            external: [
                "vscode",
                "fs",
            ],
            logLevel: "silent",
            // Node.js global to browser globalThis
            define: {
                global: "globalThis",
            },
            plugins: [
                polyfill.NodeGlobalsPolyfillPlugin({
                    process: true,
                    buffer: true,
                }),
                esbuildProblemMatcherPlugin /* add to the end of plugins array */,
            ],
        }),
    );
    // Build the visualization webview code
    contexts.push(
        await esbuild.context({
            entryPoints: ["src/app/index.tsx"],
            alias: {
                react: "preact/compat",
            },
            bundle: true,
            format: "esm",
            target: "es2020",
            minify: production,
            sourcemap: !production,
            sourcesContent: false,
            outfile: "./out/visualization.js",
            logLevel: "silent",
            plugins: [
                /* add to the end of plugins array */
                esbuildProblemMatcherPlugin,
            ],
            allowOverwrite: true,
        }),
    );

    if (watch) {
        await Promise.allSettled(contexts.map((context) => context.watch()));
    } else {
        await Promise.allSettled(
            contexts.map((context) => context.rebuild().then(context.dispose)),
        );
    }
}

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
    name: "esbuild-problem-matcher",

    setup(build) {
        build.onStart(() => {
            console.log("[watch] build started");
        });
        build.onEnd((result) => {
            result.errors.forEach(({ text, location }) => {
                console.error(`✘ [ERROR] ${text}`);
                console.error(
                    `    ${location.file}:${location.line}:${location.column}:`,
                );
            });
            console.log("[watch] build finished");
        });
    },
};

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
