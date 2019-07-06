import { PersistentModel } from './PersistentModel';
import { createModelForClass, pre, prop } from '../../typegoose';

// add a pre-save hook to PersistentModel
@pre<PersistentModel>('save', function(next) {
  if (!this.createdAt) {
    this.createdAt = new Date();
  }
  next();
})
export class Person extends PersistentModel {
  // add new property
  @prop({ required: true, validate: /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/ })
  email: string;

  // override instanceMethod
  getClassName() {
    return 'Person';
  }

  // override staticMethod
  static getStaticName() {
    return 'Person';
  }
}

export const model = createModelForClass(Person);
