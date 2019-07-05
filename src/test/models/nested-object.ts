import { Model } from 'mongoose';
import { getModelForClass, prop } from '../../typegoose';

export class AddressNested extends Model {
  @prop()
  street: string;
}

export class PersonNested extends Model {
  @prop()
  name: string;
  @prop()
  address: AddressNested;
  @prop()
  moreAddresses: AddressNested[] = [];
}

export const PersonNestedModel = getModelForClass(PersonNested);
