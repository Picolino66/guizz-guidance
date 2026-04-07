import { IsEmail } from "class-validator";

export class LoginParticipantDto {
  @IsEmail()
  email!: string;
}
