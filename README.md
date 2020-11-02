# tw-assets-management
Github App to help adding new tokens and managing the Trust Wallet assets repository.

## Building

You need to create a `.env` file, from `.env.example`, setting the app clientId and clientSecret.

```shell
npm install
```

```shell
npm run build
```

```shell
npm start
```

Open in browser: `http://localhost:3000`

## Structure
- `assetsLib`: Standalone Typescript library with helper functions.  Could be shared with assets repo CI checks, and others, but kept as a private library to this repo, beacuse server-side and client-side operations are different.

- `src`: Bundling script to create bundle.js with dependencies.

- `static-files`: Static-served HTML and other files, including client-side scripts.

- `index.js`: Server script for serving web app, static files and auth-related logic.
