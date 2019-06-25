/** @format */

import 'reflect-metadata';
import * as mongoose from 'mongoose';

import { constructors, hooks, methods, models, plugins, schema, virtuals } from './data';

export * from './method';
export * from './prop';
export * from './hooks';
export * from './plugin';
export * from '.';
export { getClassForDocument } from './utils';

export type InstanceType<T> = T & mongoose.Document;
export type ModelType<T> = mongoose.Model<InstanceType<T>> & T;


export interface GetModelForClassOptions {
  existingMongoose?: mongoose.Mongoose;
  schemaOptions?: mongoose.SchemaOptions;
  existingConnection?: mongoose.Connection;
}

export function getModelForClass<T>(t: T & (new() => T), { existingMongoose, schemaOptions, existingConnection }: GetModelForClassOptions = {}) {
  const name = this.constructor.name;
  if (!models[name]) { // Is't necessary?
    const sch = getSchemaForClass(t, schemaOptions);
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

export function getSchemaForClass<T>(t: T & (new() => T), schemaOptions: any): mongoose.Schema {
  const parentClass = Object.getPrototypeOf(t);
  if (parentClass === Function.prototype) {
    return new mongoose.Schema({}, schemaOptions);
  }
  const sch = getSchemaForClass(t, schemaOptions);

  // todo load current schema
  const name = t.name;
  const schemaConfig = createSchemaConfigByName(name);
  sch.add(schemaConfig);
  const staticMethods = methods.staticMethods[name];
  if (staticMethods) {
    sch.statics = Object.assign(staticMethods, sch.statics || {});
  } else {
    sch.statics = sch.statics || {};
  }

  const instanceMethods = methods.instanceMethods[name];
  if (instanceMethods) {
    sch.methods = Object.assign(instanceMethods, sch.methods || {});
  } else {
    sch.methods = sch.methods || {};
  }

  if (hooks[name]) {
    const preHooks = hooks[name].pre;
    preHooks.forEach(preHookArgs => {
      (sch as any).pre(...preHookArgs);
    });
    const postHooks = hooks[name].post;
    postHooks.forEach(postHookArgs => {
      (sch as any).post(...postHookArgs);
    });
  }

  if (plugins[name]) {
    for (const plugin of plugins[name]) {
      sch.plugin(plugin.mongoosePlugin, plugin.options);
    }
  }

  const getterSetters = virtuals[name];
  if (getterSetters) {
    for (const key of Object.keys(getterSetters)) {
      if (getterSetters[key].options && getterSetters[key].options.overwrite) {
        sch.virtual(key, getterSetters[key].options);
      } else {
        if (getterSetters[key].get) {
          sch.virtual(key, getterSetters[key].options).get(getterSetters[key].get);
        }

        if (getterSetters[key].set) {
          sch.virtual(key, getterSetters[key].options).set(getterSetters[key].set);
        }
      }
    }
  }

  const indices = Reflect.getMetadata('typegoose:indices', t) || [];
  for (const index of indices) {
    sch.index(index.fields, index.options);
  }

  return sch;
}

export function createSchemaConfigByName(name: string) {
  const originSchemaConfig = schema[name] || {};
  return {};
}
