/** @format */

import { pluginsMap } from './data';

export const plugin = (mongoosePlugin: any, options?: any) => (target: any) => {
  let plugins = pluginsMap.get(target.constructor);
  if (!plugins) {
    plugins = [];
    pluginsMap.set(target.constructor, plugins);
  }
  plugins.push({ mongoosePlugin, options });
};
