import { Model } from 'mongoose';
import { prop } from '../../typegoose';

export class JobType extends Model {
  @prop({ required: true })
  field: string;

  @prop({ required: true })
  salery: number;
}

export class Job extends Model {
  @prop()
  title?: string;

  @prop()
  position?: string;

  @prop({ required: true, default: Date.now })
  startedAt?: Date;

  @prop({ _id: false })
  jobType?: JobType;

  titleInUppercase?() {
    return this.title.toUpperCase();
  }
}
