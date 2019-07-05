/** @format */

import 'reflect-metadata';
import * as mongoose from 'mongoose';

import {
  hooksMap,
  pluginsMap,
  schema, schemaIsLoadedMap,
  schemaObjMap,
  schemaOptionsMap,
  RefType,
} from './data';
import { Model, Schema } from 'mongoose';

export * from './data';
export type mongooseDocument<T> = T & mongoose.Document;

function isFunction(functionToCheck) {
  return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
}

export interface GetModelForClassOptions {
  existingMongoose?: mongoose.Mongoose;
  existingConnection?: mongoose.Connection;
}

export function getModelForClass<T extends new (...args: any) => any>(t: T, { existingMongoose, existingConnection }: GetModelForClassOptions = {}) {
  const sch = getSchemaForClass(t);
  let model = mongoose.model.bind(mongoose);
  if (existingConnection) {
    model = existingConnection.model.bind(existingConnection);
  } else if (existingMongoose) {
    model = existingMongoose.model.bind(existingMongoose);
  }
  return model(t.name, sch) as mongoose.Model<mongooseDocument<InstanceType<T>>> & T;
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
  schemaIsLoadedMap.set(t, true);
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
  const originSchemaConfig = schema.get(t) || {};
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
      type = getSchemaForClass(type);
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
  const hooks = hooksMap.get(t);
  if (hooks) {
    const preHooks = hooks.pre;
    preHooks.forEach(preHookArgs => {
      (this as any).pre(...preHookArgs);
    });
    const postHooks = hooks.post;
    postHooks.forEach(postHookArgs => {
      (this as any).post(...postHookArgs);
    });
  }
  const plugins = pluginsMap.get(t);
  if (plugins) {
    for (const plugin of plugins) {
      this.plugin(plugin.mongoosePlugin, plugin.options);
    }
  }

  const indices = Reflect.getMetadata('typegoose:indices', t) || [];
  for (const index of indices) {
    this.index(index.fields, index.options);
  }
  return this;
}
