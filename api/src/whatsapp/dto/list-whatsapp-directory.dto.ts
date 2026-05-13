import { IsOptional, IsString } from "class-validator"

export class ListWhatsappDirectoryDto {
  @IsOptional()
  @IsString()
  search?: string
}
