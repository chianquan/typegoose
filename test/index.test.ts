import { expect } from 'chai';
import * as mongoose from 'mongoose';

import { UserModel, User } from './models/user';
import { CarModel, Car } from './models/car';
import { PersonModel } from './models/person';
import { RatingModel } from './models/rating';
import { PersonNested, AddressNested, PersonNestedModel } from './models/nested-object';
import { Genders } from './enums/genders';
import { Role } from './enums/role';
import { initDatabase, closeDatabase } from './utils/mongoConnect';
import { fail } from 'assert';
import { Virtual, VirtualSub } from './models/virtualprop';
import { ObjectID } from 'bson';
import {
  createModelForClass,
  createSchemaForClass,
  mongooseDocument,
  prop,
  Ref,
  schemaOptions,
} from '../src/typegoose';
import { Model, Schema, Types } from 'mongoose';

export function getModelNameFromDocument(document: mongoose.Document) {
  return (document.constructor as mongoose.Model<typeof document>).modelName;
}

describe('Typegoose', () => {
  before(() => initDatabase());

  after(() => closeDatabase());

  it('should create a UserModel with connections', async () => {
    const car = await CarModel.create({
      model: 'Tesla',
      version: 'ModelS',
      price: mongoose.Types.Decimal128.fromString('50123.25'),
    });

    const [trabant, zastava] = await CarModel.create([{
      model: 'Trabant',
      price: mongoose.Types.Decimal128.fromString('28189.25'),
    }, {
      model: 'Zastava',
      price: mongoose.Types.Decimal128.fromString('1234.25'),
    }]);
    const user = await UserModel.create({
      _id: mongoose.Types.ObjectId(),
      firstName: 'John',
      lastName: 'Doe',
      age: 20,
      uniqueId: 'john-doe-20',
      gender: Genders.MALE,
      role: Role.User,
      job: {
        title: 'Developer',
        position: 'Lead',
        jobType: {
          salery: 5000,
          field: 'IT',
        },
      },
      car: car.id,
      languages: ['english', 'typescript'],
      previousJobs: [{
        title: 'Janitor',
      }, {
        title: 'Manager',
      }],
      previousCars: [trabant.id, zastava.id],
      previousCarsBak: [trabant.id, zastava.id],
    });

    {
      const foundUser = await UserModel
        .findById(user.id)
        .populate('car previousCars previousCarsBak')
        .exec();
      expect(foundUser).to.have.property('nick', 'Nothing');
      expect(foundUser).to.have.property('firstName', 'John');
      expect(foundUser).to.have.property('lastName', 'Doe');
      expect(foundUser).to.have.property('uniqueId', 'john-doe-20');
      expect(foundUser).to.have.property('age', 20);
      expect(foundUser).to.have.property('gender', Genders.MALE);
      expect(foundUser).to.have.property('role', Role.User);
      expect(foundUser).to.have.property('roles').to.have.length(1).to.include(Role.Guest);
      expect(foundUser).to.have.property('job');
      expect(foundUser).to.have.property('car');
      expect(foundUser).to.have.property('languages').to.have.length(2).to.include('english').to.include('typescript');
      expect(foundUser.job).to.have.property('title', 'Developer');
      expect(foundUser.job).to.have.property('position', 'Lead');
      expect(foundUser.job).to.have.property('startedAt').to.be.instanceof(Date);
      expect(foundUser.job.jobType).to.not.have.property('_id');
      expect(foundUser.job.titleInUppercase()).to.eq('Developer'.toUpperCase());
      expect(foundUser.job.jobType).to.have.property('salery', 5000);
      expect(foundUser.job.jobType).to.have.property('field', 'IT');
      expect(foundUser.job.jobType).to.have.property('salery').to.be.a('number');
      expect(foundUser.car).to.have.property('model', 'Tesla');
      expect(foundUser.car).to.have.property('version', 'models');
      expect(foundUser).to.have.property('previousJobs').to.have.length(2);

      expect(foundUser).to.have.property('fullName', 'John Doe');


      const [janitor, manager] = foundUser.previousJobs;
      expect(janitor).to.have.property('title', 'Janitor');
      expect(manager).to.have.property('title', 'Manager');

      expect(foundUser).to.have.property('previousCars').to.have.length(2);

      const [foundTrabant, foundZastava] = foundUser.previousCars;
      expect(foundTrabant).to.have.property('model', 'Trabant');
      expect(foundTrabant).to.have.property('isSedan', true);
      expect(foundZastava).to.have.property('model', 'Zastava');
      expect(foundZastava).to.have.property('isSedan', undefined);

      foundUser.fullName = 'Sherlock Holmes';
      expect(foundUser).to.have.property('firstName', 'Sherlock');
      expect(foundUser).to.have.property('lastName', 'Holmes');

      await foundUser.incrementAge();
      expect(foundUser).to.have.property('age', 21);
    }

    {
      const foundUser = await UserModel.findByAge(21);
      expect(foundUser).to.have.property('firstName', 'Sherlock');
      expect(foundUser).to.have.property('lastName', 'Holmes');
    }

    {
      const createdUser = await UserModel.findOrCreate({
        firstName: 'Jane',
        lastName: 'Doe',
        gender: Genders.FEMALE,
      });

      expect(createdUser).to.be.ok;
      expect(createdUser).to.have.property('created');
      expect(createdUser.created).to.be.true;
      expect(createdUser).to.have.property('doc');
      expect(createdUser.doc).to.have.property('firstName', 'Jane');

      const foundUser = await UserModel.findOrCreate({
        firstName: 'Jane',
        lastName: 'Doe',
      });

      expect(foundUser).to.be.ok;
      expect(foundUser).to.have.property('created');
      expect(foundUser.created).to.be.false;
      expect(foundUser).to.have.property('doc');
      expect(foundUser.doc).to.have.property('firstName', 'Jane');

      try {
        await UserModel.create({
          _id: mongoose.Types.ObjectId(),
          firstName: 'John',
          lastName: 'Doe',
          age: 20,
          gender: Genders.MALE,
          uniqueId: 'john-doe-20',
        });
      } catch (err) {
        expect(err).to.have.property('code', 11000);
      }
    }
  });

  it('should add a language and job using instance methods', async () => {
    const user = await UserModel.create({
      firstName: 'harry',
      lastName: 'potter',
      gender: Genders.MALE,
      languages: ['english'],
      uniqueId: 'unique-id',
    });
    await user.addJob({ position: 'Dark Wizzard', title: 'Archmage' });
    await user.addJob();
    const savedUser = await user.addLanguage();

    expect(savedUser.languages).to.include('Hungarian');
    expect(savedUser.previousJobs.length).to.be.above(0);
    savedUser.previousJobs.map((prevJob) => {
      expect(prevJob.startedAt).to.be.ok;
    });
  });

  it('should add compound index', async () => {
    const user = await UserModel.findOne();
    const car = await CarModel.findOne();

    await RatingModel.create({ user: user._id, car: car._id, stars: 4 });

    // should fail, because user and car should be unique
    const created = await RatingModel.create({ user: user._id, car: car._id, stars: 5 })
      .then(() => true).catch(() => false);

    expect(created).to.be.false;
  });

  it('should add and populate the virtual properties', async () => {
    const virtualModel = createModelForClass(Virtual);
    const virtualSubModel = createModelForClass(VirtualSub);

    const virtual1 = await new virtualModel({ dummyVirtual: 'dummyVirtual1' } as Virtual).save();
    const virtualsub1 = await new virtualSubModel({ dummy: 'virtualSub1', virtual: virtual1._id } as VirtualSub).save();
    const virtualsub2 = await new virtualSubModel({
      dummy: 'virtualSub2',
      virtual: new ObjectID(),
    } as VirtualSub).save();
    const virtualsub3 = await new virtualSubModel({ dummy: 'virtualSub3', virtual: virtual1._id } as VirtualSub).save();

    const newfound = await virtualModel.findById(virtual1._id).populate('virtualSubs').exec();

    expect(newfound.dummyVirtual).to.be.equal('dummyVirtual1');
    expect(newfound.virtualSubs).to.not.be.an('undefined');
    expect(newfound.virtualSubs[0].dummy).to.be.equal('virtualSub1');
    expect(newfound.virtualSubs[0]._id.toString()).to.be.equal(virtualsub1._id.toString());
    expect(newfound.virtualSubs[1].dummy).to.be.equal('virtualSub3');
    expect(newfound.virtualSubs[1]._id.toString()).to.be.equal(virtualsub3._id.toString());
    expect(newfound.virtualSubs).to.not.include(virtualsub2);
  });
});

describe('getModelNameFromDocument()', () => {
  before(() => initDatabase());

  it('should return correct class type for document', async () => {
    const car = await CarModel.create({
      model: 'Tesla',
      price: mongoose.Types.Decimal128.fromString('50123.25'),
    });
    const carReflectedType = getModelNameFromDocument(car);
    expect(carReflectedType).to.equals('car');

    const user = await UserModel.create({
      _id: mongoose.Types.ObjectId(),
      firstName: 'John2',
      lastName: 'Doe2',
      gender: Genders.MALE,
      languages: ['english2', 'typescript2'],
    });
    const userReflectedType = getModelNameFromDocument(user);
    expect(userReflectedType).to.equals('user');
  });

  it('should use inherited schema', async () => {
    let user = await PersonModel.create({
      email: 'my@email.com',
    });

    const car = await CarModel.create({
      model: 'Tesla',
      price: mongoose.Types.Decimal128.fromString('50123.25'),
    });

    await user.addCar(car);

    user = await PersonModel.findById(user.id).populate('cars');

    // verify properties
    expect(user).to.have.property('createdAt');
    expect(user).to.have.property('email', 'my@email.com');

    expect(user.cars.length).to.be.above(0);
    user.cars.map((currentCar: Car) => {
      expect(currentCar.model).to.be.ok;
    });

    // verify methods
    expect(user.getClassName()).to.equals('PersonModel');
    expect(PersonModel.getStaticName()).to.equals('PersonModel');
  });

  it('Should store nested address', async () => {
    const person = await PersonNestedModel.create({
      name: 'PersonModel, Some',
      address: {
        street: 'A Street 1',
      },
      moreAddresses: [
        {
          street: 'A Street 2',
        },
        {
          street: 'A Street 3',
        },
      ],
    });

    expect(person).is.not.undefined;
    expect(person.name).equals('PersonModel, Some');
    expect(person.address).is.not.undefined;
    expect(person.address.street).equals('A Street 1');
    expect(person.moreAddresses).is.not.undefined;
    expect(person.moreAddresses.length).equals(2);
    expect(person.moreAddresses[0].street).equals('A Street 2');
    expect(person.moreAddresses[1].street).equals('A Street 3');
  });

  // faild validation will need to be checked
  it('Should validate Decimal128', async () => {
    try {
      await CarModel.create({
        model: 'Tesla',
        price: 'NO DECIMAL',
      });
      // fail('Validation must fail.');

    } catch (e) {

      expect(e).to.be.a.instanceof((mongoose.Error as any).ValidationError);
    }
    const car = await CarModel.create({
      model: 'Tesla',
      price: mongoose.Types.Decimal128.fromString('123.45'),
    });
    const foundCar = await CarModel.findById(car._id).exec();
    expect(foundCar.price).to.be.a.instanceof(mongoose.Types.Decimal128);
    expect(foundCar.price.toString()).to.eq('123.45');
  });

  it('Should validate email', async () => {
    try {
      await PersonModel.create({
        email: 'email',
      });
      fail('Validation must fail.');
    } catch (e) {
      expect(e).to.be.a.instanceof((mongoose.Error as any).ValidationError);
    }
  });
});

describe('pagoda new features', () => {
  before(() => initDatabase());
  it('should support recursive nesting schema.', async () => {
    class Box extends Model {
      @prop({ type: () => Box })
      innerBoxes: Box[];
      @prop()
      name: string;
    }

    const BoxModel = createModelForClass(Box);
    const bigBox = new BoxModel({
      innerBoxes: [
        {
          innerBoxes: [{
            innerBoxes: [],
            name: 'the smallest box',
          } as Box],
          name: 'the middle box1',
        } as Box,
        {
          innerBoxes: [],
          name: 'the middle box2',
        } as Box,
      ],
      name: 'the biggest box',
    } as Box);
    const returnBox = await bigBox.save();
    expect(returnBox).to.have.property('name').to.equal('the biggest box');
    expect(returnBox).to.have.property('innerBoxes').to.have.length(2);
    expect(returnBox.innerBoxes[0]).to.have.property('name').to.equal('the middle box1');
    expect(returnBox.innerBoxes[0]).to.have.property('innerBoxes').to.have.length(1);
    expect(returnBox.innerBoxes[1]).to.have.property('name').to.equal('the middle box2');
    expect(returnBox.innerBoxes[1]).to.have.property('innerBoxes').to.have.length(0);
    expect(returnBox.innerBoxes[0].innerBoxes[0]).to.have.property('name').to.equal('the smallest box');
    expect(returnBox.innerBoxes[0].innerBoxes[0]).to.have.property('innerBoxes').to.have.length(0);
  });
  it('should support refpath', async () => {
    class Cock extends Model {
      @prop()
      name: string;

      get legCount() {
        return 2;
      }
    }

    class Rabbit extends Model {
      @prop()
      name: string;

      get legCount() {
        return 4;
      }
    }

    @schemaOptions({ _id: false })
    class AnimalInCage extends Model {
      @prop()
      type: string;
      @prop({
        refPath: 'animals.type', type: () => Schema.Types.ObjectId,
      })
      id: Schema.Types.ObjectId | mongooseDocument<Cock> | mongooseDocument<Rabbit>;
    }

    class Cage extends Model {
      @prop({ type: () => AnimalInCage })
      animals: AnimalInCage[];
    }

    const CockModel = createModelForClass(Cock);
    const RabbitModel = createModelForClass(Rabbit);
    const CageModel = createModelForClass(Cage);
    const cockInfo = await CockModel.create({
      name: 'xiao hua',
    } as Cock);
    const rabbitInfo = await RabbitModel.create({ name: 'xiao bai' } as Rabbit);
    const cageInfo = await CageModel.create({
      animals: [
        { type: 'cock', id: cockInfo._id },
        { type: 'rabbit', id: rabbitInfo._id },
      ],
    } as Cage);
    const retCageInfo = await CageModel.findById(cageInfo._id).populate('animals.id');
    expect(retCageInfo)
      .to.be.ok
      .to.have.property('animals')
      .to.have.length(2);
    expect(retCageInfo.animals[0]).to.have.property('type')
      .to.be.equal('cock');
    expect(retCageInfo.animals[1]).to.have.property('type')
      .to.be.equal('rabbit');
    expect(retCageInfo.animals[0]).to.not.have.property('_id');
    expect(retCageInfo.animals[1]).to.not.have.property('_id');
    expect(retCageInfo.animals[0]).to.have.property('id').to.have.property('name').to.equal('xiao hua');
    expect(retCageInfo.animals[1]).to.have.property('id').to.have.property('name').to.equal('xiao bai');
    expect((retCageInfo.animals[0].id as Cock).legCount).to.equal(2);
    expect((retCageInfo.animals[1].id as Rabbit).legCount).to.equal(4);
  });

  it('should support defined type free.', async () => {
    class Tmp1 extends Model {
      @prop({ type: () => Schema.Types.ObjectId })
      commonId: Ref<Tmp1>;
    }

    const Tmp1Schema = createSchemaForClass(Tmp1);
    const commonIdPath = Tmp1Schema.path('commonId');
    expect(commonIdPath).to.be.ok
      .to.have.property('options')
      .to.have.property('type')
      .to.be.equal(Schema.Types.ObjectId);
  });
});
