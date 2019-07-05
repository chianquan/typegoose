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
export const schema: Map<new() => any, { [key: string]: { rawOptions: MySchemaTypeOpts, Type: any } }> = new Map();
export const hooksMap = new Map();
export const pluginsMap = new Map();
export const schemaOptionsMap: Map<new() => any, SchemaOptions> = new Map();
export const schemaObjMap: Map<new() => any, Schema> = new Map();
export const schemaIsLoadedMap: Map<new() => any, boolean> = new Map();


/** @format */


const hooks = {
  pre(...args: Parameters<typeof Schema.prototype.pre>) {
    return (target: any) => {
      addToHooks(target.constructor, 'pre', args);
    };
  },
  post(...args: Parameters<typeof Schema.prototype.post>) {
    return (target: any) => {
      addToHooks(target.constructor, 'post', args);
    };
  },
};

const addToHooks = (t: () => any, hookType: 'pre' | 'post', args) => {
  let hookData = hooksMap.get(t);
  if (!hookData) {
    hookData = { pre: [], post: [] };
    hooksMap.set(t, hookData);
  }
  hookData[hookType].push(args);
};

export const pre = hooks.pre;
export const post = hooks.post;


import { IndexOptions } from 'mongodb';

/**
 * Defines an index (most likely compound) for this schema.
 * @param options Options to pass to MongoDB driver's createIndex() function
 */
export const index = (fields: any, options?: IndexOptions) => {
  return (constructor: any) => {
    const indices = Reflect.getMetadata('typegoose:indices', constructor) || [];
    indices.push({ fields, options });
    Reflect.defineMetadata('typegoose:indices', indices, constructor);
  };
};


/** @format */


export const plugin = (mongoosePlugin: any, options?: any) => (target: any) => {
  let plugins = pluginsMap.get(target.constructor);
  if (!plugins) {
    plugins = [];
    pluginsMap.set(target.constructor, plugins);
  }
  plugins.push({ mongoosePlugin, options });
};


/** @format */

import { MySchemaTypeOpts } from './data';
import { ObjectID } from 'bson';

export const prop = (options: MySchemaTypeOpts = {}) => (target: any, key: string) => {
  const Type = (Reflect as any).getMetadata('design:type', target, key);
  let fieldConfig = schema.get(target.constructor);
  if (!fieldConfig) {
    fieldConfig = {};
    schema.set(target.constructor, fieldConfig);
  }
  fieldConfig[key] = { rawOptions: options, Type };
  return;
};

export type Ref<T> = T | ObjectID;


/** @format */

export const schemaOptions = (options: SchemaOptions) => (target: any) => {
  schemaOptionsMap.set(target, options);
};
