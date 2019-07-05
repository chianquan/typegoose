/** @format */

import 'reflect-metadata';
import * as mongoose from 'mongoose';

import {
  constructors,
  hooks,
  models,
  plugins,
  schema, schemaIsLoadedMap,
  schemaObjMap,
  schemaOptionsMap,
} from './data';
import { isNumber, isString } from './utils';
import { NotNumberTypeError, NotStringTypeError } from './errors';
import { Model, Schema } from 'mongoose';
import { isWithNumberValidate, isWithStringTransform, isWithStringValidate, RefType } from './prop';

export * from './prop';
export * from './schemaOptions';
export * from './hooks';
export * from './plugin';
export * from '.';
export { getClassForDocument } from './utils';

export type InstanceType<T> = T & mongoose.Document;
export type ModelType<T> = mongoose.Model<InstanceType<T>> & T;

function isFunction(functionToCheck) {
  return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
}

export interface GetModelForClassOptions {
  existingMongoose?: mongoose.Mongoose;
  existingConnection?: mongoose.Connection;
}

export function getModelForClass<T>(t: T & (new() => any), { existingMongoose, existingConnection }: GetModelForClassOptions = {}) {
  const name = this.constructor.name;
  if (!models[name]) { // Is't necessary?
    const sch = getSchemaForClass(t);
    let model = mongoose.model.bind(mongoose);
    if (existingConnection) {
      model = existingConnection.model.bind(existingConnection);
    } else if (existingMongoose) {
      model = existingMongoose.model.bind(existingMongoose);
    }

    models[name] = model(name, sch);
    constructors[name] = this.constructor;
  }

  return models[name] as ModelType<T>;
}

export function getSchemaForClass<T>(t: T & (new() => T)): mongoose.Schema {
  let sch = schemaObjMap.get(t);
  if (!sch) {
    // 提前创建空的schema是为了支持循环引用
    sch = new mongoose.Schema({}, schemaOptionsMap.get(t));
    schemaObjMap.set(t, sch);
  }
  const schemaIsLoaded = schemaIsLoadedMap.get(t);
  if (schemaIsLoaded) {
    return sch;
  }
  myLoadClass.call(sch, t);
  sch.loadClass(t);
  schemaIsLoadedMap.set(t, true);
  return sch;
}

// 补充mongoose 的loadClass
function myLoadClass<T>(this: Schema, t: T & (new() => T)) {
  if (t === Object.prototype ||
    t === Function.prototype ||
    t.prototype.hasOwnProperty('$isMongooseModelPrototype')) {
    return this;
  }

  const name = t.name;
  const originSchemaConfig = schema[name] || {};
  for (const key of Object.keys(originSchemaConfig)) {
    const { isArray, Type, rawOptions } = originSchemaConfig[key];
    const { ref: originRef, type: originType, enum: originEnumOption, ...moreRawOptions } = rawOptions;
    const ref: string | undefined = ((refType: (() => RefType) | RefType) => {
      if (refType === undefined) {
        return;
      }
      if (typeof refType === 'string') {
        return refType;
      }
      if (refType.name) {
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
      throw new Error('ref无法识别');
    })(originRef);
    let type = originType;
    if (ref && !type) {
      type = mongoose.Schema.Types.ObjectId;
    }
    const enumOption = originEnumOption && !Array.isArray(originEnumOption) ?
      Object.keys(originEnumOption).map(propKey => originEnumOption[propKey]) : originEnumOption;

    // check for validation inconsistencies
    if (isWithStringValidate(rawOptions) && !isString(Type)) {
      throw new NotStringTypeError(key);
    }

    if (isWithNumberValidate(rawOptions) && !isNumber(Type)) {
      throw new NotNumberTypeError(key);
    }

    // check for transform inconsistencies
    if (isWithStringTransform(rawOptions) && !isString(Type)) {
      throw new NotStringTypeError(key);
    }
    if (!type) {
      type = Type ? Type : Schema.Types.Mixed;
    }
    // 如果是匿名函数 warming
    if (!type.name) {
      if (!isFunction(type)) {
        throw new Error('未知输入');
      }
      type = type();
    }
    if (Model.prototype.isPrototypeOf(type.prototype)) {
      type = getSchemaForClass(type);
    }
    const schemaTypeOpt = { ref, type, enum: enumOption, ...moreRawOptions };
    this.path(key, isArray ? [schemaTypeOpt] : schemaTypeOpt);
  }


  if (hooks[name]) {
    const preHooks = hooks[name].pre;
    preHooks.forEach(preHookArgs => {
      (this as any).pre(...preHookArgs);
    });
    const postHooks = hooks[name].post;
    postHooks.forEach(postHookArgs => {
      (this as any).post(...postHookArgs);
    });
  }

  if (plugins[name]) {
    for (const plugin of plugins[name]) {
      this.plugin(plugin.mongoosePlugin, plugin.options);
    }
  }

  const indices = Reflect.getMetadata('typegoose:indices', t) || [];
  for (const index of indices) {
    this.index(index.fields, index.options);
  }
  return this;
}
