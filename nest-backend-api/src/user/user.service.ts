import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { User } from './entities/user.entity';
import { DbService } from '../db/db.service';
import { LoginUserDto } from './dto/login-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly dbService: DbService) {}

  async register(registerUserDto: RegisterUserDto) {
    const users: User[] = (await this.dbService.read()) as User[];

    // check existing username
    const found = users.find(
      (user) => user.username === registerUserDto.username,
    );
    if (found) throw new BadRequestException('Username already exists');

    const user = new User();
    user.username = registerUserDto.username;
    user.password = registerUserDto.password;

    users.push(user);

    //save file
    await this.dbService.write(users);
    return user;
  }

  async login(loginUserDto: LoginUserDto) {
    const users: User[] = (await this.dbService.read()) as User[];

    const found = users.find(
      (user) =>
        user.username === loginUserDto.username &&
        user.password === loginUserDto.password,
    );
    if (!found) throw new BadRequestException('Invalid credentials');

    return {
      message: 'Login successful',
      user: found,
    };
  }

  create(createUserDto: CreateUserDto) {
    return 'This action adds a new user';
  }

  findAll() {
    return `This action returns all user`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
