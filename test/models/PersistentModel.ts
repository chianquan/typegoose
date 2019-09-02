import * as tg from '../../src/typegoose';
import { Car } from './car';
import { Model } from 'mongoose';
import { prop, Ref } from '../../src/typegoose';

export abstract class PersistentModel extends Model {
  @prop()
  createdAt: Date;

  @prop({ ref: () => Car })
  cars?: Ref<Car>[];

  // define an 'instanceMethod' that will be overwritten
  getClassName() {
    return 'PersistentModel';
  }

  // define an 'instanceMethod' that will be overwritten
  static getStaticName() {
    return 'PersistentModel';
  }

  // define an instanceMethod that is called by the derived class
  addCar(car: Car) {
    if (!this.cars) {
      this.cars = [];
    }

    this.cars.push(car);

    return this.save();
  }
}
