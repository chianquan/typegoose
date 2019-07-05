/** @format */

import * as mongoose from 'mongoose';

import { constructors } from './data';

export const isNumber = (Type: any) => Type.name === 'Number';

export const isString = (Type: any) => Type.name === 'String';

export const getClassForDocument = (document: mongoose.Document): any => {
  const modelName = (document.constructor as mongoose.Model<typeof document>)
    .modelName;
  return constructors[modelName];
};
