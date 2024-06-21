import {
    codeAnalyserConfigurationObject,
    setupConfigurationObject,
} from "./utility/configuration.js";
import objectFactory from "./utility/factory.js";
import { analyseCodeAndDetectDeadfiles } from "./features/index.js";

export async function getDependencyObject(entryFilePaths, directories) {
    process.argv = [
        // TODO: Until you make config options modular, you'll keep seeing this terrible code
        ...process.argv
            .filter((arg) => !arg.startsWith("--entry"))
            .filter((arg) => !arg.startsWith("--directoriesToCheck")),
        `--entry=${JSON.stringify(entryFilePaths)}`,
        `--directoriesToCheck=${JSON.stringify(directories)}`,
        `--rootDirectory=${directories[0]}`,
    ];
    process.send = (...params) => {
        // console.log("[process]", params);
        return true;
    };

    setupConfigurationObject();

    const filesMetadata = objectFactory.createNewFilesMetadataObject(
        codeAnalyserConfigurationObject.exclude,
        codeAnalyserConfigurationObject.include,
    );
    await analyseCodeAndDetectDeadfiles(
        filesMetadata,
        codeAnalyserConfigurationObject,
    );

    return filesMetadata;
}

getDependencyObject(["src/code-analyser/index.ts"], ["src/code-analyser"]).then(console.log);
