import { Model } from 'mongoose';
import { prop, pre, createModelForClass } from '../../src/typegoose';
@pre<Hook>('save', function(next) {
  if (this.isModified('shape')) {
    this.shape = 'newShape';
  } else {
    this.shape = 'oldShape';
  }

  next();
})
export class Hook extends Model {
  @prop({ required: true })
  material: string;

  @prop()
  shape?: string;
}

export const model = createModelForClass(Hook);
