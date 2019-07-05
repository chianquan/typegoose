import { index } from '../..';
import { Ref } from '../../prop';
import { getModelForClass, prop } from '../../typegoose';
import { Car } from './car';
import { User } from './user';
import { Model } from 'mongoose';

@index({ car: 1, user: 1 }, { unique: true })
@index({ location: '2dsphere' })
export class Rating extends Model {
  @prop({ ref: Car })
  car: Ref<Car>;

  @prop({ ref: User })
  user: Ref<User>;

  @prop()
  stars: number;

  @prop({ type: Array })
  location: [[number]];
}

export const model = getModelForClass(Rating);
