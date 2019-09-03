# @pagoda/typegoose

This is the pagoda's customized version of typegoose.All the code is base on [typegoose@5.7.2](https://github.com/szokodiakos/typegoose#readme).

# changes

### change class extends Typegoose to extends Model(mongoose)

```
// old
class A extends Typegoose{
}

// new
import {Model} from mongoose;
class A extends Model{
}

```

### change model create function

```
// old

const UserModel = new User().getModelForClass(User);

// new


const UserModel = createModelForClass(User);


```

### use subSchema with @schemaOptions({_id:false}) define the sub class prop.

```
// old

class Car extends Typegoose {}
class Person{
    @prop({ _id: false })
    car?: Car;
}

// new

class Car extends Model {}
class Person extends Model{
    @prop({type:()=>Car})
    car?: Car;
}

```

### use `{ref:()=>User}` and `{type:()=>User}` to avoid interdependence error.

```
// old

// file a.ts
import {B} from ./B;
export class A extends Typegoose{
    @prop({ref:B})
    b:B
}

// file b.ts
import {A} from ./A;
export class A extends Typegoose{
    @prop({ref:A})
    a:A
}

// file createModels.ts
import {A} from ./A;
const AModel = new A().getModelForClass(A);
// In this situation it will use error ref as undefined.


// new
// file a.ts
import {B} from ./B;
export class A extends Model{
    @prop({ref:()=>B})
    b:B
}

// file b.ts
import {A} from ./A;
export class A extends Typegoose{
    @prop({ref:()=>A})
    a:A
}

// file createModels.ts
import {A} from ./A;
const AModel = createModelForClass(A);
// In this situation we use function to delay the depend class use.
```

# new features

### support recursive nesting schema.

```
    class Box extends Model {
      @prop({ type: () => Box })
      innerBoxes: Box[]; // box nesting box
      @prop()
      name: string;
    }

```

### support pass any prop options that mongoose support.

`this is an example use the refpath to populate the different instance depend type.`
```
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
      type: string; // Here,we depend the model name create by default lowerFirst.
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
```

### support explicitly define the type

```
    class Tmp1 extends Model {
      @prop({ type: () => Schema.Types.ObjectId })
      commonId: Ref<Tmp1>;
    }
```
