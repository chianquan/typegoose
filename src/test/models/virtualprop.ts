import { prop, Ref } from '../../typegoose';
import { Model } from 'mongoose';

export class Virtual extends Model {
  @prop({ required: true })
  dummyVirtual?: string;

  @prop({ ref: 'VirtualSub', foreignField: 'virtual', localField: '_id', justOne: false, overwrite: true })
  public get virtualSubs() {
    return undefined;
  }
}

export class VirtualSub extends Model {
  @prop({ required: true, ref: Virtual })
  virtual: Ref<Virtual>;

  @prop({ required: true })
  dummy: string;
}
