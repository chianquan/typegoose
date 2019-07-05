/** @format */

import { schema } from './data';
import { NoMetadataError } from './errors';
import { ObjectID } from 'bson';

export type Func = (...args: any[]) => any;

export type RequiredType = boolean | [boolean, string] | string | Func | [Func, string];

export type ValidatorFunction = (value: any) => boolean | Promise<boolean>;
export type Validator =
  | ValidatorFunction
  | RegExp
  | {
  validator: ValidatorFunction;
  message?: string;
};

export interface BasePropOptions {
  required?: RequiredType;
  enum?: string[] | object;
  default?: any;
  validate?: Validator | Validator[];
  unique?: boolean;
  index?: boolean;
  sparse?: boolean;
  expires?: string | number;
  _id?: boolean;
}

export type RefType = string | { name: string };

export interface PropOptions extends BasePropOptions {
  ref?: (() => RefType) | RefType;
}

export interface ValidateNumberOptions {
  min?: number | [number, string];
  max?: number | [number, string];
}

export interface ValidateStringOptions {
  minlength?: number | [number, string];
  maxlength?: number | [number, string];
  match?: RegExp | [RegExp, string];
}

export interface TransformStringOptions {
  lowercase?: boolean; // whether to always call .toLowerCase() on the value
  uppercase?: boolean; // whether to always call .toUpperCase() on the value
  trim?: boolean; // whether to always call .trim() on the value
}

export interface VirtualOptions {
  ref: string;
  localField: string;
  foreignField: string;
  justOne: boolean;
  /** Set to true, when it is an "virtual populate-able" */
  overwrite: boolean;
}

export type PropOptionsWithNumberValidate = PropOptions & ValidateNumberOptions;
export type PropOptionsWithStringValidate = PropOptions & TransformStringOptions & ValidateStringOptions;
export type PropOptionsWithValidate = PropOptionsWithNumberValidate | PropOptionsWithStringValidate | VirtualOptions;

export interface ExtendProp {
  type?: any,
  isArray?: boolean,

  [key: string]: any,

}

export const prop = (options: PropOptionsWithValidate & ExtendProp = {}) => (target: any, key: string) => {
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
