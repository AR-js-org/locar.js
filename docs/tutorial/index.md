# LocAR.js - Develop a simple Points of Interest app

**Updated for LocAR.js 0.2!** *LocAR.js version 0.2 has a new and enhanced API, including an `App` object which abstracts away a lot of the complexity of setting up a LocAR application.*

Here is a series of tutorials taking you through how to use LocAR.js, from the basics to a more advanced example: a simple but working Points of Interest app using a live web API.

It is expected that you have some understanding of the absolute basics of [three.js](https://threejs.org). You might want to read the introductory "Creating a Scene" section of the [three.js manual](https://threejs.org/docs/index.html#manual/en). (Note that there is currently a formatting issue on Firefox with the source code samples, so you should use another browser such as Chrome. There is a fix imminent on Firefox, however).

You should also have very basic knowledge of [Vite](https://vitejs.dev) and the concept of JavaScript or TypeScript build tools and bundling. Vite is a build and development tool which, as well as bundling your code for production, provides a development server allowing you to develop client-side web apps "live" so that when you make a change to your code or its dependencies, your code is reloaded and changes appear instantly. See the Vite docs for more.

**Do note that it is not recommended to use Firefox on a mobile device due to limitations of the device orientation API. Chrome on Android is recommended.**

## Installing and developing

Here is a sample `package.json` containing three.js and LocAR.js as dependencies, and Vite as a dev dependency.

```

```
As is standard in Vite, you should place your `index.html` inside your project's main directory and the JavaScript or TypeScript source, e.g. `main.ts`, inside the `src` directory. You can then, as is normal with Vite, run in dev mode with `npm run dev`, which will start up a dev server on port 5173 and allow you to make live changes to your code which will be updated instantly.

You can also build a bundle with `npm run build`, which will create a production app (a JavaScript or TypeScript bundle plus a version of `index.html` linking to the bundle) in the `dist` directory.

### Contents

- [Part 1: Hello World](part1.md)
- [Part 2: Using the GPS and Device Orientation](part2.md)
- [Part 3: Connecting to a web API](part3.md)

