import { ExtendProp, PropOptionsWithValidate } from './prop';
import { Schema, SchemaOptions } from 'mongoose';

/** @format */

export const schema: { [key: string]: { [key: string]: { rawOptions: PropOptionsWithValidate & ExtendProp, Type: any, isArray: boolean } } } = {};
export const models = {};
export const hooks = {};
export const plugins = {};
export const schemaOptionsMap: Map<new() => any, SchemaOptions> = new Map();
export const schemaObjMap: Map<new() => any, Schema> = new Map();
export const schemaIsLoadedMap: Map<new() => any, boolean> = new Map();
// tslint:disable-next-line: ban-types
export const constructors: { [key: string]: Function } = {};
