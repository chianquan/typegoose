/** @format */

import 'reflect-metadata';

import { Model, Schema, SchemaOptions, SchemaTypeOpts, Document } from 'mongoose';
import * as mongoose from 'mongoose';

/** @format */

import { MongooseDocument } from 'mongoose';


type DocumentMethod = 'init' | 'validate' | 'save' | 'remove';
type QueryMethod =
  | 'count'
  | 'find'
  | 'findOne'
  | 'findOneAndRemove'
  | 'findOneAndUpdate'
  | 'update'
  | 'updateOne'
  | 'updateMany';
type ModelMethod = 'insertMany';

type ClassDecorator = (constructor: any) => void;
type HookNextFn = (err?: Error) => void;

type PreDoneFn = () => void;

type TypegooseDoc<T> = T & MongooseDocument;

type DocumentPreSerialFn<T> = (this: TypegooseDoc<T>, next: HookNextFn) => void;
type DocumentPreParallelFn<T> = (this: TypegooseDoc<T>, next: HookNextFn, done: PreDoneFn) => void;

type SimplePreSerialFn<T> = (next: HookNextFn, docs?: any[]) => void;
type SimplePreParallelFn<T> = (next: HookNextFn, done: PreDoneFn) => void;

type DocumentPostFn<T> = (this: TypegooseDoc<T>, doc: TypegooseDoc<T>, next?: HookNextFn) => void;
type ModelPostFn<T> = (result: any, next?: HookNextFn) => void;

type PostNumberResponse<T> = (result: number, next?: HookNextFn) => void;
type PostSingleResponse<T> = (result: TypegooseDoc<T>, next?: HookNextFn) => void;
type PostMultipleResponse<T> = (result: TypegooseDoc<T>[], next?: HookNextFn) => void;

type PostNumberWithError<T> = (error: Error, result: number, next: HookNextFn) => void;
type PostSingleWithError<T> = (error: Error, result: TypegooseDoc<T>, next: HookNextFn) => void;
type PostMultipleWithError<T> = (error: Error, result: TypegooseDoc<T>[], net: HookNextFn) => void;

type NumberMethod = 'count';
type SingleMethod = 'findOne' | 'findOneAndRemove' | 'findOneAndUpdate' | DocumentMethod;
type MultipleMethod = 'find' | 'update';

interface Hooks {
  pre<T>(method: DocumentMethod, fn: DocumentPreSerialFn<T>): ClassDecorator;

  pre<T>(method: DocumentMethod, parallel: boolean, fn: DocumentPreParallelFn<T>): ClassDecorator;

  pre<T>(method: QueryMethod | ModelMethod, fn: SimplePreSerialFn<T>): ClassDecorator;

  pre<T>(method: QueryMethod | ModelMethod, parallel: boolean, fn: SimplePreParallelFn<T>): ClassDecorator;

  // I had to disable linter to allow this. I only got proper code completion separating the functions
  post<T>(method: NumberMethod, fn: PostNumberResponse<T>): ClassDecorator;

  // tslint:disable-next-line:unified-signatures
  post<T>(method: NumberMethod, fn: PostNumberWithError<T>): ClassDecorator;

  post<T>(method: SingleMethod, fn: PostSingleResponse<T>): ClassDecorator;

  // tslint:disable-next-line:unified-signatures
  post<T>(method: SingleMethod, fn: PostSingleWithError<T>): ClassDecorator;

  post<T>(method: MultipleMethod, fn: PostMultipleResponse<T>): ClassDecorator;

  // tslint:disable-next-line:unified-signatures
  post<T>(method: MultipleMethod, fn: PostMultipleWithError<T>): ClassDecorator;

  post<T>(method: ModelMethod, fn: ModelPostFn<T> | PostMultipleResponse<T>): ClassDecorator;
}

const hooks: Hooks = {
  pre(...args) {
    return (constructor: any) => {
      addToHooks(constructor.name, 'pre', args);
    };
  },
  post(...args) {
    return (constructor: any) => {
      addToHooks(constructor.name, 'post', args);
    };
  },
};

const addToHooks = (t: new() => any, hookType: 'pre' | 'post', args) => {
  const data = getTypegooseData(t);
  data.hooks[hookType].push(args);
};

export const pre = hooks.pre;
export const post = hooks.post;


export type mongooseDocument<T> = T & Document;
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

import { ObjectID } from 'bson';

export const prop = (options: MySchemaTypeOpts = {}) => (target: any, key: string) => {
  const Type = (Reflect as any).getMetadata('design:type', target, key);
  getTypegooseData(target.constructor).fieldsArgs[key] = { rawOptions: options, Type };
};

export type Ref<T> = T | ObjectID;

export const schemaOptions = (options: SchemaOptions) => (target: any) => {
  getTypegooseData(target).schemaOptions = options;
};


function isFunction(functionToCheck) {
  return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
}

export interface GetModelForClassOptions {
  existingMongoose?: mongoose.Mongoose;
  existingConnection?: mongoose.Connection;
}

export function createModelForClass<T extends new (...args: any) => any>(t: T, { existingMongoose, existingConnection }: GetModelForClassOptions = {}) {
  const sch = createSchemaForClass(t);
  let model = mongoose.model.bind(mongoose);
  if (existingConnection) {
    model = existingConnection.model.bind(existingConnection);
  } else if (existingMongoose) {
    model = existingMongoose.model.bind(existingMongoose);
  }
  return model(t.name, sch) as mongoose.Model<mongooseDocument<InstanceType<T>>> & T;
}

export function createSchemaForClass<T>(t: T & (new() => T)): mongoose.Schema {

  const data = getTypegooseData(t);
  let sch = data.schema;
  if (!sch) {
    // 提前创建空的schema是为了支持循环引用
    sch = new mongoose.Schema({}, data.schemaOptions);
    data.schema = sch;
  }
  if (data.schemaIsLoaded) {
    return sch;
  }
  data.schemaIsLoaded = true;
  myLoadClass.call(sch, t);
  sch.loadClass(t);
  return sch;
}

// 补充mongoose 的loadClass
function myLoadClass<T>(this: Schema, t: T & (new() => T)) {
  if (t === Object.prototype ||
    t === Function.prototype ||
    t.prototype.hasOwnProperty('$isMongooseModelPrototype')) {
    return this;
  }
  myLoadClass.call(this, Object.getPrototypeOf(t));
  const originSchemaConfig = getTypegooseData(t).fieldsArgs;
  for (const key of Object.keys(originSchemaConfig)) {
    const { Type, rawOptions } = originSchemaConfig[key];
    const { isArray: originIsArray, ref: originRef, type: originType, enum: originEnumOption, ...moreRawOptions } = rawOptions;
    const isArray = originIsArray === undefined ? Type === Array : originIsArray;

    const ref: string | undefined = ((refType: (() => RefType) | RefType) => {
      if (refType === undefined) {
        return;
      }
      if (typeof refType === 'string') {
        return refType;
      }
      if (!isFunction(refType)) {
        throw new Error('ref无法识别:' + refType);
      }
      if (refType.name && refType.name !== 'ref') {
        return refType.name;
      }
      if (typeof refType === 'function') {
        refType = refType();
      }
      if (typeof refType === 'string') {
        return refType;
      }
      if (refType.name) {
        return refType.name;
      }
      throw new Error('ref无法识别:' + refType);
    })(originRef);
    if (isArray && !originType && !ref) {
      throw new Error(`class '${t.name}' field '${key}':Array 's type is require`);
    }
    let type = originType;
    if (type && (!type.name || type.name === 'type')) {
      type = type();
    }
    if (ref && !type) {
      type = mongoose.Schema.Types.ObjectId;
    }
    const enumOption = originEnumOption && !Array.isArray(originEnumOption) ?
      Object.keys(originEnumOption).map(propKey => originEnumOption[propKey]) : originEnumOption;
    if (!type) {
      type = Type ? Type : Schema.Types.Mixed;
    }
    if (Model.prototype.isPrototypeOf(type.prototype)) {
      type = createSchemaForClass(type);
    }
    const schemaTypeOpt = { ref, type, enum: enumOption, ...moreRawOptions };
    if (schemaTypeOpt.ref === undefined) {
      delete schemaTypeOpt.ref;
    }
    if (schemaTypeOpt.enum === undefined) {
      delete schemaTypeOpt.enum;
    }
    this.path(key, isArray ? [schemaTypeOpt] : schemaTypeOpt);
  }
  const preHooks = getTypegooseData(t).hooks.pre;
  preHooks.forEach(preHookArgs => {
    (this as any).pre(...preHookArgs);
  });
  const postHooks = getTypegooseData(t).hooks.post;
  postHooks.forEach(postHookArgs => {
    (this as any).post(...postHookArgs);
  });

  for (const pluginInfo of getTypegooseData(t).plugins) {
    this.plugin(pluginInfo.mongoosePlugin, pluginInfo.options);
  }

  for (const indexInfo of getTypegooseData(t).indices) {
    this.index(indexInfo.fields, indexInfo.options);
  }
  return this;
}
