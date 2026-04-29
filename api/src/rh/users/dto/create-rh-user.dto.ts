import { IsEmail, IsEnum, IsString, MinLength } from "class-validator"

export enum SystemRoleEnum {
  ADMIN = "ADMIN",
  USER = "USER"
}

export class CreateRhUserDto {
  @IsString()
  name!: string

  @IsEmail()
  email!: string

  @IsString()
  @MinLength(6)
  password!: string

  @IsEnum(SystemRoleEnum)
  role!: SystemRoleEnum
}
