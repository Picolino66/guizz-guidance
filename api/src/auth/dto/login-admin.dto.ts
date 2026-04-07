import { IsString, MinLength } from "class-validator";

export class LoginAdminDto {
  @IsString()
  login!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}
