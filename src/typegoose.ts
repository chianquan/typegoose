import { IndexOptions } from 'mongodb';
import {
  Connection,
  Document,
  Model,
  model as mongooseModel,
  Mongoose,
  MongooseDocument,
  Schema,
  SchemaOptions, SchemaType,
  SchemaTypeOpts,
} from 'mongoose';
import mongoose = require('mongoose');
import 'reflect-metadata';

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
// @ts-ignore
type SimplePreSerialFn<T> = (next: HookNextFn, docs?: any[]) => void;
// @ts-ignore
type SimplePreParallelFn<T> = (next: HookNextFn, done: PreDoneFn) => void;
// @ts-ignore
type ModelPostFn<T> = (result: any, next?: HookNextFn) => void;
// @ts-ignore
type PostNumberResponse<T> = (result: number, next?: HookNextFn) => void;
type PostSingleResponse<T> = (result: TypegooseDoc<T>, next?: HookNextFn) => void;
type PostMultipleResponse<T> = (result: Array<TypegooseDoc<T>>, next?: HookNextFn) => void;
// @ts-ignore
type PostNumberWithError<T> = (error: Error, result: number, next: HookNextFn) => void;
type PostSingleWithError<T> = (error: Error, result: TypegooseDoc<T>, next: HookNextFn) => void;
type PostMultipleWithError<T> = (error: Error, result: Array<TypegooseDoc<T>>, net: HookNextFn) => void;
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
      addToHooks(constructor, 'pre', args);
    };
  },
  post(...args) {
    return (constructor: any) => {
      addToHooks(constructor, 'post', args);
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
export type RefType = string | typeof Model;
type RefTypeFun = () => RefType;

export interface ExtendProp {
  // type?: SchemaType | Model<any>;
  type?: () => (typeof SchemaType | Model<any> | typeof String | typeof Array | typeof Number | typeof Date | typeof Buffer | typeof Boolean);
  isArray?: boolean;
  ref?: () => RefType;

  [key: string]: any;

}

export type MySchemaTypeOpts = SchemaTypeOpts<any> & ExtendProp;

interface TypegooseData {
  fieldsArgs: { [key: string]: { rawOptions: MySchemaTypeOpts, Type: any } };
  hooks: { pre: any[][], post: any[][] };
  plugins: Array<{ mongoosePlugin, options }>;
  schemaOptions: SchemaOptions;
  schema?: Schema;
  schemaIsLoaded: boolean;
  indices: Array<{ fields, options }>;
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
  const Type = Reflect.getMetadata('design:type', target, key);
  getTypegooseData(target.constructor).fieldsArgs[key] = { rawOptions: options, Type };
};

export type Ref<T> = T | ObjectID;

export const schemaOptions = (options: SchemaOptions) => (target: any) => {
  getTypegooseData(target).schemaOptions = options;
};

export interface GetModelForClassOptions {
  existingMongoose?: Mongoose;
  existingConnection?: Connection;
}

const config = {
  modelNameFun: (t: new() => any): string => {
    return t.name.replace(/^\S/, (s) => s.toLowerCase());
  },
};

export function typegooseConfig<K extends keyof typeof config>(key: K, value?: (typeof config)[K]): (typeof config)[K] {
  if (value === undefined) {
    return config[key];
  } else {
    config[key] = value;
    return config[key];
  }
}

export function createModelForClass<T extends new (...args: any) => any>(t: T, { existingMongoose, existingConnection }: GetModelForClassOptions = {}) {
  const sch = createSchemaForClass(t);
  let model = mongooseModel.bind(mongoose);
  if (existingConnection) {
    model = existingConnection.model.bind(existingConnection);
  } else if (existingMongoose) {
    model = existingMongoose.model.bind(existingMongoose);
  }
  return model(config.modelNameFun(t), sch) as Model<mongooseDocument<InstanceType<T>>> & T;
}

export function createSchemaForClass<T extends new (...args: any) => any>(t: T): Schema {

  const data = getTypegooseData(t);
  let sch = data.schema;
  if (!sch) {
    // 提前创建空的schema是为了支持循环引用
    sch = new Schema({}, data.schemaOptions);
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

    const ref = ((refType?: RefTypeFun): string | undefined => {
      if (refType === undefined) {
        return;
      }
      const retRefType = refType();
      if (retRefType === undefined) {
        throw new Error('无类型返回');
      }
      if (typeof retRefType === 'string') {
        return retRefType;
      }
      if (retRefType.name) {
        return config.modelNameFun(retRefType);
      }
      throw new Error('ref无法识别:' + refType);
    })(originRef);

    const enumOption: any[] | undefined = originEnumOption && !Array.isArray(originEnumOption) ?
      Object.keys(originEnumOption).map((propKey) => originEnumOption[propKey]) : originEnumOption;
    let type = (() => {
      if (originType) {
        return originType();
      }
      if (enumOption) {
        if (enumOption.every((v) => typeof v === 'string')) {
          return String;
        }
        if (enumOption.every((v) => typeof v === 'number')) {
          return Number;
        }
        return Schema.Types.Mixed;
      }
      if (ref) {
        return Schema.Types.ObjectId;
      }
      if (isArray) {
        throw new Error(`class '${t.name}' field '${key}':Array 's type is require`);
      } else {
        return Type;
      }
    })();
    if (Model.prototype.isPrototypeOf(type.prototype)) {
      type = createSchemaForClass(type);
    }
    const schemaTypeOpt = {
      ref,
      type: isArray ? [ref ? { ref, type } : type] : type,
      enum: enumOption, ...moreRawOptions,
    };
    if (schemaTypeOpt.ref === undefined) {
      delete schemaTypeOpt.ref;
    }
    if (schemaTypeOpt.enum === undefined) {
      delete schemaTypeOpt.enum;
    }
    const method = Object.getOwnPropertyDescriptor(t.prototype, key);

    if (method && (typeof method.get === 'function' || typeof method.set === 'function')) {
      this.virtual(key, schemaTypeOpt);
    } else {
      this.path(key, schemaTypeOpt);
    }
  }
  const preHooks = getTypegooseData(t).hooks.pre;
  preHooks.forEach((preHookArgs) => {
    (this as any).pre(...preHookArgs);
  });
  const postHooks = getTypegooseData(t).hooks.post;
  postHooks.forEach((postHookArgs) => {
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
