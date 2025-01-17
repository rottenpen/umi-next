import { winPath } from '@umijs/utils';
import { join } from 'path';
import { getFilePath } from './getFilePath';

const fixtures = join(__dirname, '../../fixtures/getFilePath');

function format(path: string | null) {
  if (!path) return path;
  return winPath(path).replace(winPath(fixtures), '$CWD$');
}

test('file exists', () => {
  expect(
    format(getFilePath({ path: join(fixtures, 'js-file-first', 'foo.js') })),
  ).toEqual(`$CWD$/js-file-first/foo.js`);
});

test('js file first', () => {
  expect(
    format(getFilePath({ path: join(fixtures, 'js-file-first', 'foo') })),
  ).toEqual(`$CWD$/js-file-first/foo.js`);
});

test('package json second', () => {
  expect(
    format(getFilePath({ path: join(fixtures, 'package-json-second', 'foo') })),
  ).toEqual(`$CWD$/package-json-second/foo/bar.js`);
});

test('package json not found module', () => {
  expect(
    format(
      getFilePath({
        path: join(fixtures, 'package-json-not-found-module', 'foo'),
      }),
    ),
  ).toEqual(`$CWD$/package-json-not-found-module/foo/bar.js`);
});

test('package json directory', () => {
  expect(
    format(
      getFilePath({ path: join(fixtures, 'package-json-directory', 'foo') }),
    ),
  ).toEqual(`$CWD$/package-json-directory/foo/bar/index.js`);
});

test('directory index third', () => {
  expect(
    format(
      getFilePath({ path: join(fixtures, 'directory-index-third', 'foo') }),
    ),
  ).toEqual(`$CWD$/directory-index-third/foo/index.js`);
});

test('directory index mjs', () => {
  expect(
    format(getFilePath({ path: join(fixtures, 'directory-index-mjs', 'foo') })),
  ).toEqual(`$CWD$/directory-index-mjs/foo/index.mjs`);
});
