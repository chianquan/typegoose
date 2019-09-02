import { Model, Types } from 'mongoose';

import {
  prop,
  pre, createModelForClass,
} from '../../src/typegoose';

@pre<Car>('save', function(next) {
  if (this.model === 'Trabant') {
    this.isSedan = true;
  }
  next();
})
export class Car extends Model {
  @prop({ required: true })
  model: string;

  @prop({ lowercase: true })
  version: string;

  @prop()
  isSedan?: boolean;

  @prop({ required: true })
  price: Types.Decimal128;
}

export const CarModel = createModelForClass(Car);
