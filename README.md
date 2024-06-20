<div align="center">
    <a href="https://marketplace.visualstudio.com/items?itemName=aryanpingle.dependograph">
        <img src="./assets/images/extension-logo.png" alt="Logo of Dependograph">
    </a>
    <h1>Dependograph</h1>
    <img src="https://img.shields.io/badge/status-active-success.svg" alt="Project status: Active">
    <img src="https://img.shields.io/github/issues-pr/aryanpingle/Dependograph.svg" alt="GitHub pull requests">
</div>

<br>

> You will never struggle with dependency management ever again.

_Dependograph_ is a VSCode extension that lets you visualize your project's dependency structure in several interactive, and visually appealing ways. You don't want _Dependograph_. You **need** _Dependograph_.

* You want a bird's eye view of your project's dependencies
* You're looking at a complicated codebase and wonder how files relate to each other
* You want to understand how a variable/function is being used throughout the project

If you fall into any of these categories, Dependograph is the extension for you.

# ✨ Features

|Feature|Status|Description|
|:-:|:-:|---|
|**Force-Directed Dependency Graph**|✅|Visualize your dependency structure as a directed graph with a force-directed layout|
|**Hierarchical Dependency Graph**|🟠|Visualize your dependency structure as a hierarchical graph|
|**Webpack Chunk Graph**|🟠|Use the Force-Directed Graph to visualize emitted chunks (Webpack only)|
|**Graph Export Options**|🟠|Download and share the generated visualizations|

# 💻 Installation

1. Go to the Extensions tab in your Visual Studio Code window
2. Search for **Dependograph** by Aryan Pingle
3. Click on install

... and you're good to go!

# ⚙️ Development

You know the drill.

```bash
$ git clone https://github.com/aryanpingle/Dependograph.git
$ cd Dependograph
$ npm install
```

Use the VSCode task runner to start testing the extension. 

> [!NOTE]
> You will need the [esbuild Problem Matchers](https://marketplace.visualstudio.com/items?itemName=connor4312.esbuild-problem-matchers) plugin to test the extension with live compilation.<br>That's just how esbuild works unfortunately.

* The project uses a modified fork of my mentor [Daksh's code-analyser](https://github.com/Daksh2104/code-analyser).
* [ESBuild](https://esbuild.github.io/) is my bundler of choice. It's crazy fast.
* Everything is written in Typescript. The underlying code of the extension itself is transpiled to `CommonJS`, and code used for visualizations (and everything in webviews) is transpiled to `ES2020`.
