/** @format */

import { schemaOptionsMap } from './data';
import { SchemaOptions } from 'mongoose';

export const schemaOptions = (options: SchemaOptions) => (target: any) => {
  schemaOptionsMap.set(target, options);
};
