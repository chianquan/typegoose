import { Schema, SchemaOptions, SchemaTypeOpts } from 'mongoose';

export type RefType = string | { name: string };

export interface ExtendProp {
  type?: any,
  isArray?: boolean,
  ref?: (() => RefType) | RefType;

  [key: string]: any,

}

/** @format */
export type MySchemaTypeOpts = SchemaTypeOpts<any> & ExtendProp;

interface TypegooseData {
  fieldsArgs: { [key: string]: { rawOptions: MySchemaTypeOpts, Type: any } };
  hooks: { pre: any[][], post: any[][] };
  plugins: { mongoosePlugin, options }[];
  schemaOptions: SchemaOptions;
  schema?: Schema;
  schemaIsLoaded: boolean;
  indices: { fields, options }[]
}

const dataMap: Map<new() => any, TypegooseData> = new Map();

export function getTypegooseData(t: new() => any): TypegooseData {
  let data = dataMap.get(t);
  if (!data) {
    data = {
      fieldsArgs: {},
      hooks: {
        pre: [], post: [],
      },
      plugins: [],
      schemaOptions: {},
      schemaIsLoaded: false,
      indices: [],
    };
    dataMap.set(t, data);
  }
  return data;
}

import { IndexOptions } from 'mongodb';

/**
 * Defines an index (most likely compound) for this schema.
 * @param options Options to pass to MongoDB driver's createIndex() function
 */
export const index = (fields: any, options?: IndexOptions) => {
  return (constructor: any) => {
    getTypegooseData(constructor).indices.push({ fields, options });
  };
};

export const plugin = (mongoosePlugin: any, options?: any) => (target: any) => {
  getTypegooseData(target).plugins.push({ mongoosePlugin, options });
};

import { MySchemaTypeOpts } from './data';
import { ObjectID } from 'bson';

export const prop = (options: MySchemaTypeOpts = {}) => (target: any, key: string) => {
  const Type = (Reflect as any).getMetadata('design:type', target, key);
  getTypegooseData(target.constructor).fieldsArgs[key] = { rawOptions: options, Type };
};

export type Ref<T> = T | ObjectID;

export const schemaOptions = (options: SchemaOptions) => (target: any) => {
  getTypegooseData(target).schemaOptions = options;
};
