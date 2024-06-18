import {
    codeAnalyserConfigurationObject,
    setupConfigurationObject,
} from "./utility/configuration.js";
import objectFactory from "./utility/factory.js";
import { analyseCodeAndDetectDeadfiles } from "./features/index.js";

// TODO: Switch from process.argv to something modular, in case VSCode needs the arguments for something
export async function getDependencyObject(
    entryFilePaths: string[],
    directories: string[],
) {
    process.argv = [
        // TODO: Until you make config options modular, you'll keep seeing this terrible code
        ...process.argv
            .filter((arg) => !arg.startsWith("--entry"))
            .filter((arg) => !arg.startsWith("--directoriesToCheck")),
        `--entry=${JSON.stringify(entryFilePaths)}`,
        `--directoriesToCheck=${JSON.stringify(directories)}`,
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
