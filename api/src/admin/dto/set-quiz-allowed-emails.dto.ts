import { IsArray, IsString } from "class-validator"

export class SetQuizAllowedEmailsDto {
  @IsArray()
  @IsString({ each: true })
  emailIds!: string[]
}
