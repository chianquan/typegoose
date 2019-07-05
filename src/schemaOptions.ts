/** @format */

import { plugins, schemaOptionsMap } from './data';
import { SchemaOptions } from 'mongoose';

export const schemaOptions = (options: SchemaOptions) => (constructor: any) => {
  schemaOptionsMap.set(constructor, options);
};
