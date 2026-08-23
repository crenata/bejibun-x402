import App from "@bejibun/app";
import Logger from "@bejibun/logger";
import path from "path";
/**
 * Package install/setup script: publishes this package's config file(s)
 * into the consuming app's `config/` directory (as `.ts`), so the app has
 * an editable copy of the default x402 config to customize.
 */
// Directory holding this package's own default config files.
const configPath = path.resolve(__dirname, "config");
// Matches compiled JS/TS config files, excluding their .d.ts declarations.
const regex = /\.(m?js|ts)$/;
// All config files bundled with this package, relative to configPath.
const configs = Array.from(new Bun.Glob("**/*").scanSync({
    cwd: configPath
})).filter((value) => regex.test(value) && !value.endsWith(".d.ts"));
// Copy each config file into the app's config/ directory as .ts,
// so the app owns an editable copy rather than importing from node_modules.
for (const config of configs) {
    const destination = config.replace(regex, ".ts");
    await Bun.write(App.Path.configPath(destination), await Bun.file(path.resolve(configPath, config)).text());
    Logger.setContext("CONFIGURE").info(`Copying ${config} into config/${destination}`);
}
