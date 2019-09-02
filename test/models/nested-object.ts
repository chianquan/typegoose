import { Model } from 'mongoose';
import { createModelForClass, prop } from '../../src/typegoose';

export class AddressNested extends Model {
  @prop()
  street: string;
}

export class PersonNested extends Model {
  @prop()
  name: string;
  @prop()
  address: AddressNested;
  @prop({ type: () => AddressNested })
  moreAddresses: AddressNested[];
}

export const PersonNestedModel = createModelForClass(PersonNested);
