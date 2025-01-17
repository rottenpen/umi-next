import { logger, yParser } from '@umijs/utils';
import { DEV_COMMAND } from '../constants';
import { Service } from '../service/service';
import { dev } from './dev';
import {
  checkLocal,
  checkVersion as checkNodeVersion,
  setNoDeprecation,
  setNodeTitle,
} from './node';

checkNodeVersion();
checkLocal();
setNodeTitle();
setNoDeprecation();

(async () => {
  const args = yParser(process.argv.slice(2), {
    alias: {
      version: ['v'],
      help: ['h'],
    },
    boolean: ['version'],
  });
  const command = args._[0];
  if ([DEV_COMMAND, 'setup'].includes(command)) {
    process.env.NODE_ENV = 'development';
  } else if (command === 'build') {
    process.env.NODE_ENV = 'production';
  }
  if (command === DEV_COMMAND) {
    dev();
  } else {
    try {
      await new Service().run2({
        name: args._[0],
        args,
      });
    } catch (e: any) {
      logger.error(e);
      process.exit(1);
    }
  }
})();
