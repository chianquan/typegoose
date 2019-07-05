import * as mongoose from 'mongoose';
import { User } from './test/models/user';

/** @format */


export const isNumber = (Type: any) => Type.name === 'Number';

export const isString = (Type: any) => Type.name === 'String';

export function getClassForDocument(document: mongoose.Document) {
  return User;
}
