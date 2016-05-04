import { transform } from 'babel-core';

export default function getCode(code) {
  return transform(code, {
    plugins: ['react-autoprefix'],
    presets: ['stage-0', 'react'],
  }).code;
}
