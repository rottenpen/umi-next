import { importLazy, lodash, logger, portfinder, winPath } from '@umijs/utils';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DEFAULT_HOST, DEFAULT_PORT } from '../../constants';
import { IApi } from '../../types';
import { clearTmp } from '../../utils/clearTmp';
import { createRouteMiddleware } from './createRouteMiddleware';
import { faviconMiddleware } from './faviconMiddleware';
import {
  addUnWatch,
  createDebouncedHandler,
  expandJSPaths,
  unwatch,
  watch,
} from './watch';

const bundlerWebpack: typeof import('@umijs/bundler-webpack') = importLazy(
  '@umijs/bundler-webpack',
);
const bundlerVite: typeof import('@umijs/bundler-vite') = importLazy(
  '@umijs/bundler-vite',
);

export default (api: IApi) => {
  api.describe({
    enableBy() {
      return api.name === 'dev';
    },
  });

  api.registerCommand({
    name: 'dev',
    description: 'dev server for development',
    details: `
umi dev

# dev with specified port
PORT=8888 umi dev
`,
    async fn() {
      // clear tmp except cache
      clearTmp(api.paths.absTmpPath);

      // generate files
      async function generate(opts: { isFirstTime?: boolean; files?: any }) {
        api.applyPlugins({
          key: 'onGenerateFiles',
          args: {
            files: opts.files || null,
            isFirstTime: opts.isFirstTime,
          },
        });
      }
      await generate({
        isFirstTime: true,
      });
      const { absPagesPath, absSrcPath } = api.paths;
      const watcherPaths: string[] = await api.applyPlugins({
        key: 'addTmpGenerateWatcherPaths',
        initialValue: [
          absPagesPath,
          join(absSrcPath, 'layouts'),
          ...expandJSPaths(join(absSrcPath, 'app')),
        ],
      });
      lodash.uniq<string>(watcherPaths.map(winPath)).forEach((p: string) => {
        watch({
          path: p,
          addToUnWatches: true,
          onChange: createDebouncedHandler({
            timeout: 2000,
            async onChange(opts) {
              await generate({ files: opts.files, isFirstTime: false });
            },
          }),
        });
      });

      // watch package.json change
      const pkgPath = join(api.cwd, 'package.json');
      watch({
        path: pkgPath,
        addToUnWatches: true,
        onChange() {
          const origin = api.appData.pkg;
          api.appData.pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
          api.applyPlugins({
            key: 'onPkgJSONChanged',
            args: {
              origin,
              current: api.appData.pkg,
            },
          });
        },
      });

      // watch config change
      addUnWatch(
        api.service.configManager!.watch({
          schemas: api.service.configSchemas,
          onChangeTypes: api.service.configOnChanges,
          onChange(opts) {
            const { data } = opts;
            if (data.changes[api.ConfigChangeType.reload]) {
              logger.event(
                `config ${data.changes[api.ConfigChangeType.reload].join(
                  ', ',
                )} changed, restart server...`,
              );
              api.restartServer();
              return;
            }
            if (data.changes[api.ConfigChangeType.regenerateTmpFiles]) {
              logger.event(
                `config ${data.changes[api.ConfigChangeType.reload].join(
                  ', ',
                )} changed, regenerate tmp files...`,
              );
              generate({ isFirstTime: false });
            }
            for (const fn of data.fns) {
              fn();
            }
          },
        }),
      );

      // start dev server
      const opts = {
        config: api.config,
        cwd: api.cwd,
        entry: {
          umi: join(api.paths.absTmpPath, 'umi.ts'),
        },
        port: api.appData.port,
        host: api.appData.host,
        beforeMiddlewares: [faviconMiddleware],
        afterMiddlewares: [createRouteMiddleware({ api })],
        onDevCompileDone(opts: any) {
          api.applyPlugins({
            key: 'onDevCompileDone',
            args: opts,
          });
        },
      };
      if (api.args.vite) {
        await bundlerVite.dev(opts);
      } else {
        await bundlerWebpack.dev(opts);
      }
    },
  });

  api.modifyAppData(async (memo) => {
    memo.port = await portfinder.getPortPromise({
      port: parseInt(String(process.env.PORT || DEFAULT_PORT), 10),
    });
    memo.host = process.env.HOST || DEFAULT_HOST;
    return memo;
  });

  api.registerMethod({
    name: 'restartServer',
    fn() {
      logger.info(`Restart dev server with port ${api.appData.port}...`);
      unwatch();
      process.send?.({
        type: 'RESTART',
        payload: {
          port: api.appData.port,
        },
      });
    },
  });
};
