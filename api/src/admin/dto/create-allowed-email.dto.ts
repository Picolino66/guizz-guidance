import { IsEmail } from "class-validator";

export class CreateAllowedEmailDto {
  @IsEmail()
  email!: string;
}
