import { Model } from 'mongoose';

const findOrCreate = require('mongoose-findorcreate');

import { Car } from './car';
import { Gender, Genders } from '../enums/genders';
import { Job } from './job';
import { Role } from '../enums/role';
import {
  createModelForClass, mongooseDocument,
  plugin,
  prop,
  Ref,
} from '../../typegoose';

export interface FindOrCreateResult<T> {
  created: boolean;
  doc: mongooseDocument<T>;
}

@plugin(findOrCreate)
export class User extends Model {
  @prop({ required: true })
  firstName: string;

  @prop({ required: true })
  lastName: string;

  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  set fullName(full) {
    const split = full.split(' ');
    this.firstName = split[0];
    this.lastName = split[1];
  }

  @prop({ default: 'Nothing' })
  nick?: string;

  @prop({ index: true, unique: true })
  uniqueId?: string;

  @prop({ unique: true, sparse: true })
  username?: string;

  @prop({ expires: '24h' })
  expireAt?: Date;

  @prop({ min: 10, max: 21 })
  age?: number;

  @prop({ enum: Object.values(Genders), required: true })
  gender: Gender;

  @prop({ enum: Role })
  role: Role;

  @prop({ type: String, enum: Role, default: Role.Guest })
  roles: Role[];

  @prop()
  job?: Job;

  @prop({ ref: Car })
  car?: Ref<Car>;

  @prop({ type: String, required: true })
  languages: string[];

  @prop({ type: () => Job })
  previousJobs?: Job[];

  @prop({ ref: Car })
  previousCars?: Ref<Car>[];

  static findByAge(age: number) {
    return this.findOne({ age });
  }

  incrementAge() {
    const age = this.age || 1;
    this.age = age + 1;
    return this.save();
  }

  addLanguage() {
    this.languages.push('Hungarian');

    return this.save();
  }

  addJob(job: Job = {}) {
    this.previousJobs.push(job);

    return this.save();
  }

  static findOrCreate: (condition: any) => Promise<FindOrCreateResult<User>>;

}

export const UserModel = createModelForClass(User);

