import { PickType } from '@nestjs/mapped-types';
import { RegisterUserDto } from './register-user.dto';

export class LoginUserDto extends PickType(RegisterUserDto, [
  'username',
  'password',
] as const) {}

// PickType: Selects specific fields (username, password) - Best choice here
// PartialType: Makes all fields optional - Not suitable for login where both fields are required
// OmitType: Excludes specific fields - Would work if RegisterUserDto had extra fields
