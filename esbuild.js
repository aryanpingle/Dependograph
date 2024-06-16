const esbuild = require("esbuild");

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

async function main() {
    const ctxExtension = await esbuild.context({
        entryPoints: ["src/extension.ts"],
        bundle: true,
        format: "cjs",
        minify: production,
        sourcemap: !production,
        sourcesContent: false,
        platform: "node",
        outdir: "out",
        external: ["vscode", "dependency-tree"],
        logLevel: "silent",
        plugins: [
            /* add to the end of plugins array */
            esbuildProblemMatcherPlugin,
        ],
        allowOverwrite: true,
    });
    const ctxWebviews = await esbuild.context({
        entryPoints: [
            "src/webviews/visualization.ts",
            "src/webviews/sidebar.ts",
        ],
        bundle: true,
        format: "esm",
        target: "es2020",
        minify: production,
        sourcemap: !production,
        sourcesContent: false,
        outdir: "out/webviews",
        logLevel: "silent",
        plugins: [
            /* add to the end of plugins array */
            esbuildProblemMatcherPlugin,
        ],
        allowOverwrite: true,
    });

    if (watch) {
        await Promise.allSettled([ctxExtension.watch(), ctxWebviews.watch()]);
    } else {
        await Promise.allSettled([
            ctxExtension.rebuild().then(ctxExtension.dispose),
            ctxWebviews.rebuild().then(ctxWebviews.dispose),
        ]);
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
