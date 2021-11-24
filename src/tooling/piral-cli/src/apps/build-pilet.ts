import { dirname, basename, resolve, relative } from 'path';
import { LogLevels, PiletBuildType, PiletSchemaVersion } from '../types';
import { callPiletBuild, callPiralBuild } from '../bundler';
import {
  removeDirectory,
  retrievePiletData,
  setLogLevel,
  progress,
  logDone,
  logInfo,
  createPiletDeclaration,
  ForceOverwrite,
  matchAnyPilet,
  fail,
  config,
  log,
  createDirectory,
  writeJson,
  getPiletSpecMeta,
  getFileNames,
  copy,
  checkAppShellPackage,
} from '../common';

export interface BuildPiletOptions {
  /**
   * Sets the name of the Piral instance.
   */
  app?: string;

  /**
   * The source index file (e.g. index.tsx) for collecting all the information
   * @example './src/index'
   */
  entry?: string | Array<string>;

  /**
   * The target file of bundling.
   * @example './dist/index.js'
   */
  target?: string;

  /**
   * States if minifaction or other post-bundle transformations should be performed.
   */
  minify?: boolean;

  /**
   * Indicates if a declaration file should be generated.
   */
  declaration?: boolean;

  /**
   * Sets the log level to use (1-5).
   */
  logLevel?: LogLevels;

  /**
   * States if the target directory should be removed before building.
   */
  fresh?: boolean;

  /**
   * States if source maps should be created for the bundles.
   */
  sourceMaps?: boolean;

  /**
   * Sets the bundler to use for building, if any specific.
   */
  bundlerName?: string;

  /**
   * States if a content hash should be appended to the side-bundle files
   */
  contentHash?: boolean;

  /**
   * Selects the target type of the build (e.g. 'release'). "all" builds all target types.
   */
  type?: PiletBuildType;

  /**
   * States if the node modules should be included for target transpilation
   */
  optimizeModules?: boolean;

  /**
   * The schema to be used when bundling the pilets.
   * @example 'v1'
   */
  schemaVersion?: PiletSchemaVersion;

  /**
   * Additional arguments for a specific bundler.
   */
  _?: Record<string, any>;

  /**
   * Hooks to be triggered at various stages.
   */
  hooks?: {
    onBegin?(e: any): Promise<void>;
    beforeBuild?(e: any): Promise<void>;
    afterBuild?(e: any): Promise<void>;
    beforeDeclaration?(e: any): Promise<void>;
    afterDeclaration?(e: any): Promise<void>;
    onEnd?(e: any): Promise<void>;
  };
}

export const buildPiletDefaults: BuildPiletOptions = {
  entry: './src/index',
  target: './dist/index.js',
  minify: true,
  logLevel: LogLevels.info,
  type: 'default',
  fresh: false,
  sourceMaps: true,
  contentHash: true,
  optimizeModules: false,
  schemaVersion: config.schemaVersion,
  declaration: true,
};

export async function buildPilet(baseDir = process.cwd(), options: BuildPiletOptions = {}) {
  const {
    entry = buildPiletDefaults.entry,
    target = buildPiletDefaults.target,
    minify = buildPiletDefaults.minify,
    sourceMaps = buildPiletDefaults.sourceMaps,
    contentHash = buildPiletDefaults.contentHash,
    logLevel = buildPiletDefaults.logLevel,
    fresh = buildPiletDefaults.fresh,
    optimizeModules = buildPiletDefaults.optimizeModules,
    schemaVersion = buildPiletDefaults.schemaVersion,
    declaration = buildPiletDefaults.declaration,
    type = buildPiletDefaults.type,
    _ = {},
    hooks = {},
    bundlerName,
    app,
  } = options;
  const fullBase = resolve(process.cwd(), baseDir);
  const entryList = Array.isArray(entry) ? entry : [entry];
  setLogLevel(logLevel);

  await hooks.onBegin?.({ options, fullBase });
  progress('Reading configuration ...');
  const allEntries = await matchAnyPilet(fullBase, entryList);
  log('generalDebug_0003', `Found the following entries: ${allEntries.join(', ')}`);

  if (allEntries.length === 0) {
    fail('entryFileMissing_0077');
  }

  const pilets = await Promise.all(
    allEntries.map(async (entryModule) => {
      const targetDir = dirname(entryModule);
      const { peerDependencies, peerModules, root, appPackage, appFile, piletPackage, ignored, importmap } =
        await retrievePiletData(targetDir, app);
      const externals = [...Object.keys(peerDependencies), ...peerModules];
      const dest = resolve(root, target);
      const outDir = dirname(dest);
      const outFile = basename(dest);

      if (fresh) {
        progress('Removing output directory ...');
        await removeDirectory(outDir);
      }

      logInfo('Bundle pilet ...');

      await hooks.beforeBuild?.({ root, outDir, importmap, entryModule, schemaVersion, piletPackage });

      await callPiletBuild(
        {
          root,
          piral: appPackage.name,
          optimizeModules,
          sourceMaps,
          contentHash,
          minify,
          externals,
          targetDir,
          importmap,
          outFile,
          outDir,
          entryModule: `./${relative(root, entryModule)}`,
          logLevel,
          version: schemaVersion,
          ignored,
          _,
        },
        bundlerName,
      );

      await hooks.afterBuild?.({ root, outDir, importmap, entryModule, schemaVersion, piletPackage });

      if (declaration) {
        await hooks.beforeDeclaration?.({ root, outDir, entryModule, piletPackage });
        await createPiletDeclaration(
          piletPackage.name,
          root,
          entryModule,
          externals,
          outDir,
          ForceOverwrite.yes,
          logLevel,
        );
        await hooks.afterDeclaration?.({ root, outDir, entryModule, piletPackage });
      }

      logDone(`Pilet "${piletPackage.name}" built successfully!`);

      return {
        id: piletPackage.name.replace(/[^a-zA-Z0-9\-]/gi, ''),
        root,
        appFile,
        appPackage,
        outDir,
        outFile,
        path: dest,
        package: piletPackage,
      };
    }),
  );

  if (type === 'standalone') {
    const distDir = dirname(resolve(fullBase, target));
    const outDir = resolve(distDir, 'standalone');
    const { appFile, appPackage, root } = pilets[0];
    const isEmulator = checkAppShellPackage(appPackage);

    await removeDirectory(outDir);

    Promise.all(
      pilets.map(async (p) => {
        const files = await getFileNames(p.outDir);

        for (const file of files) {
          await copy(resolve(p.outDir, file), resolve(outDir, p.id, file), ForceOverwrite.yes);
        }
      }),
    );

    if (isEmulator) {
      // in case of an emulator assets are not "seen" by the bundler, so we
      // just copy overthing over - this should work in most cases.
      await copy(dirname(appFile), outDir, ForceOverwrite.yes);
    }

    await callPiralBuild(
      {
        root,
        piral: appPackage.name,
        emulator: false,
        optimizeModules: false,
        sourceMaps,
        contentHash,
        minify,
        externals: [],
        publicUrl: '/',
        outFile: 'index.html',
        outDir,
        entryFiles: appFile,
        logLevel,
        ignored: [],
        _,
      },
      bundlerName,
    );

    await writeJson(
      outDir,
      '$pilet-api',
      pilets.map((p) => ({
        name: p.package.name,
        version: p.package.version,
        link: `./${p.id}/${p.outFile}`,
        ...getPiletSpecMeta(p.path, p.outDir),
      })),
    );

    logDone(`Standalone app available at "${outDir}"!`);
  }

  await hooks.onEnd?.({});
}
